import { apiClient, ApiError } from 'src/services/api/client';
import config from 'src/services/config';

jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: {
      headers: { common: {} },
    },
  };
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance),
    },
  };
});

describe('API Client', () => {
  it('should be defined', () => {
    expect(apiClient).toBeDefined();
  });

  it('should be configured with base URL from config', () => {
    const axios = require('axios').default;
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: config.apiBaseUrl,
      }),
    );
  });

  it('should set default timeout', () => {
    const axios = require('axios').default;
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: expect.any(Number),
      }),
    );
  });

  it('should set Content-Type header to application/json', () => {
    const axios = require('axios').default;
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('should register request interceptor', () => {
    expect(apiClient.interceptors.request.use).toHaveBeenCalled();
  });

  it('should register response interceptor', () => {
    expect(apiClient.interceptors.response.use).toHaveBeenCalled();
  });
});

describe('ApiError', () => {
  it('should be defined', () => {
    expect(ApiError).toBeDefined();
  });

  it('should create an error with statusCode, code, and message', () => {
    const error = new ApiError(404, 'NOT_FOUND', 'Resource not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Resource not found');
  });

  it('should be an instance of Error', () => {
    const error = new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong');
    expect(error).toBeInstanceOf(Error);
  });

  it('should include timestamp', () => {
    const error = new ApiError(400, 'BAD_REQUEST', 'Invalid input');
    expect(error.timestamp).toBeDefined();
    expect(() => new Date(error.timestamp)).not.toThrow();
  });
});
