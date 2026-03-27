import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import config from '../config';

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
    return requestConfig;
  },
);

interface ErrorResponseData {
  code?: string;
  message?: string;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorResponseData>) => {
    const statusCode = error.response?.status ?? 500;
    const data = error.response?.data;
    const code = data?.code ?? 'UNKNOWN_ERROR';
    const message = data?.message ?? error.message;

    return Promise.reject(new ApiError(statusCode, code, message));
  },
);
