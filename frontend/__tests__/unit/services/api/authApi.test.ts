import { authApi } from 'src/services/api/authApi';
import { apiClient } from 'src/services/api/client';
import type { OAuthProvider, DeviceType, TokenRefreshResponse } from 'src/types/user';

jest.mock('src/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    statusCode: number;
    code: string;
    timestamp: string;
    constructor(statusCode: number, code: string, message: string) {
      super(message);
      this.name = 'ApiError';
      this.statusCode = statusCode;
      this.code = code;
      this.timestamp = new Date().toISOString();
    }
  },
}));

const mockedClient = apiClient as jest.Mocked<typeof apiClient>;

describe('AuthApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOAuthUrl', () => {
    it('provider와 디바이스 정보로 OAuth URL을 반환한다', () => {
      const provider: OAuthProvider = 'google';
      const fcmToken = 'fcm-token-123';
      const deviceType: DeviceType = 'IOS';
      const redirectUri = 'exp://192.168.0.1:8081/--/auth/callback';

      const url = authApi.getOAuthUrl(provider, fcmToken, deviceType, redirectUri);

      expect(url).toContain('/auth/oauth/google');
      expect(url).toContain('fcmToken=fcm-token-123');
      expect(url).toContain('deviceType=IOS');
      expect(url).toContain('redirectUri=');
    });

    it('deviceName이 있으면 URL에 포함한다', () => {
      const url = authApi.getOAuthUrl('naver', 'fcm-token', 'ANDROID', 'exp://localhost/--/auth/callback', 'Galaxy S24');

      expect(url).toContain('deviceName=');
    });

    it.each<OAuthProvider>(['google', 'naver', 'kakao', 'apple'])(
      '%s provider를 지원한다',
      (provider) => {
        const url = authApi.getOAuthUrl(provider, 'fcm-token', 'IOS', 'exp://localhost/--/auth/callback');
        expect(url).toContain(`/auth/oauth/${provider}`);
      },
    );
  });

  describe('refreshToken', () => {
    it('refreshToken으로 새 토큰 쌍을 요청한다', async () => {
      const mockResponse: TokenRefreshResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      mockedClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await authApi.refreshToken('old-refresh-token');

      expect(mockedClient.post).toHaveBeenCalledWith('/auth/token/refresh', {
        refreshToken: 'old-refresh-token',
      });
      expect(result).toEqual(mockResponse);
    });

    it('갱신 실패 시 에러를 전파한다', async () => {
      mockedClient.post.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(authApi.refreshToken('invalid-token')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('refreshToken과 fcmToken으로 로그아웃을 요청한다', async () => {
      mockedClient.post.mockResolvedValueOnce({
        data: { message: 'Successfully logged out' },
      });

      await authApi.logout('refresh-token-123', 'fcm-token-456');

      expect(mockedClient.post).toHaveBeenCalledWith('/auth/logout', {
        refreshToken: 'refresh-token-123',
        fcmToken: 'fcm-token-456',
      });
    });

    it('로그아웃 성공 메시지를 반환한다', async () => {
      mockedClient.post.mockResolvedValueOnce({
        data: { message: 'Successfully logged out' },
      });

      const result = await authApi.logout('refresh-token', 'fcm-token');

      expect(result).toEqual({ message: 'Successfully logged out' });
    });

    it('로그아웃 실패 시 에러를 전파한다', async () => {
      mockedClient.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(authApi.logout('token', 'fcm')).rejects.toThrow();
    });
  });
});
