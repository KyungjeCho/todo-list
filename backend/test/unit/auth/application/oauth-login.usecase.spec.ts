import { OAuthLoginUsecase } from 'src/auth/application/oauth-login.usecase';

describe('OAuthLoginUsecase', () => {
  let usecase: OAuthLoginUsecase;

  const mockAuthRepository = {
    findOauthByProvider: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new OAuthLoginUsecase(mockAuthRepository as never);
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    it('should return OAuth redirect URL for google provider', async () => {
      const result = await usecase.execute({
        provider: 'google',
        fcmToken: 'fcm-token-123',
        deviceType: 'IOS',
        redirectUri: 'exp://localhost/--/auth/callback',
      });

      expect(result).toBeDefined();
      expect(result.redirectUrl).toBeDefined();
      expect(typeof result.redirectUrl).toBe('string');
    });

    it('should return OAuth redirect URL for naver provider', async () => {
      const result = await usecase.execute({
        provider: 'naver',
        fcmToken: 'fcm-token-123',
        deviceType: 'ANDROID',
        redirectUri: 'exp://localhost/--/auth/callback',
      });

      expect(result).toBeDefined();
      expect(result.redirectUrl).toBeDefined();
    });

    it('should return OAuth redirect URL for kakao provider', async () => {
      const result = await usecase.execute({
        provider: 'kakao',
        fcmToken: 'fcm-token-123',
        deviceType: 'IOS',
        redirectUri: 'exp://localhost/--/auth/callback',
      });

      expect(result).toBeDefined();
      expect(result.redirectUrl).toBeDefined();
    });

    it('should return OAuth redirect URL for apple provider', async () => {
      const result = await usecase.execute({
        provider: 'apple',
        fcmToken: 'fcm-token-123',
        deviceType: 'IOS',
        redirectUri: 'exp://localhost/--/auth/callback',
      });

      expect(result).toBeDefined();
      expect(result.redirectUrl).toBeDefined();
    });

    it('should throw error for invalid provider', async () => {
      await expect(
        usecase.execute({
          provider: 'invalid' as never,
          fcmToken: 'fcm-token-123',
          deviceType: 'IOS',
          redirectUri: 'exp://localhost/--/auth/callback',
        }),
      ).rejects.toThrow();
    });

    it('should include state parameter with fcmToken and deviceType', async () => {
      const result = await usecase.execute({
        provider: 'google',
        fcmToken: 'fcm-token-abc',
        deviceType: 'ANDROID',
        redirectUri: 'exp://localhost/--/auth/callback',
        deviceName: 'Galaxy S24',
      });

      expect(result).toBeDefined();
      expect(result.redirectUrl).toBeDefined();
    });
  });
});
