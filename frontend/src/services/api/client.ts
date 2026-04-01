import axios from 'axios';
import type {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import config from '../config';

// WHY: lazy import to break circular dependency (authStore → userApi → client → authStore)
function getAuthStore() {
  const { useAuthStore } =
    require('../../store/authStore') as typeof import('../../store/authStore');
  return useAuthStore;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly timestamp: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (requestConfig: InternalAxiosRequestConfig) => {
    const { accessToken } = getAuthStore().getState();
    if (accessToken) {
      requestConfig.headers.Authorization = `Bearer ${accessToken}`;
    }
    return requestConfig;
  },
);

interface ErrorResponseData {
  code?: string;
  message?: string;
}

// WHY: Promise-based lock으로 동시 refresh 요청을 직렬화.
// 첫 요청만 실제 refresh를 수행하고, 나머지는 같은 Promise를 공유.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, setTokens, clearAuth } = getAuthStore().getState();

  if (!refreshToken) {
    clearAuth();
    throw new ApiError(401, 'UNAUTHORIZED', 'No refresh token');
  }

  try {
    const response = await axios.post(
      `${config.apiBaseUrl}/auth/token/refresh`,
      { refreshToken },
    );
    const { accessToken: newAccess, refreshToken: newRefresh } =
      response.data as { accessToken: string; refreshToken: string };
    await setTokens(newAccess, newRefresh);
    return newAccess;
  } catch (refreshError) {
    clearAuth();
    throw refreshError instanceof Error
      ? refreshError
      : new Error(String(refreshError));
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorResponseData>) => {
    const originalRequest = error.config;
    const statusCode = error.response?.status ?? 500;

    if (
      statusCode === 401 &&
      originalRequest &&
      !originalRequest.url?.includes('/auth/token/refresh')
    ) {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    }

    const data = error.response?.data;
    const code = data?.code ?? 'UNKNOWN_ERROR';
    const message = data?.message ?? error.message;

    return Promise.reject(new ApiError(statusCode, code, message));
  },
);
