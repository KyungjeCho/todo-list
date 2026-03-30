import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import config from '../config';

// WHY: lazy import to break circular dependency (authStore → userApi → client → authStore)
function getAuthStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useAuthStore } = require('../../store/authStore') as typeof import('../../store/authStore');
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

let isRefreshing = false;
let pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  for (const req of pendingRequests) {
    if (error) {
      req.reject(error);
    } else {
      req.resolve(token!);
    }
  }
  pendingRequests = [];
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
      const { refreshToken, setTokens, clearAuth } =
        getAuthStore().getState();

      if (!refreshToken) {
        clearAuth();
        return Promise.reject(
          new ApiError(401, 'UNAUTHORIZED', 'No refresh token'),
        );
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          pendingRequests.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      isRefreshing = true;
      try {
        const response = await axios.post(
          `${config.apiBaseUrl}/auth/token/refresh`,
          { refreshToken },
        );
        const { accessToken: newAccess, refreshToken: newRefresh } =
          response.data as { accessToken: string; refreshToken: string };
        setTokens(newAccess, newRefresh);
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuth();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const data = error.response?.data;
    const code = data?.code ?? 'UNKNOWN_ERROR';
    const message = data?.message ?? error.message;

    return Promise.reject(new ApiError(statusCode, code, message));
  },
);
