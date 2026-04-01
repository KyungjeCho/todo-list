import { OAuthLoginUsecase } from 'src/auth/application/oauth-login.usecase';
import { ConfigService } from '@nestjs/config';

describe('OAuthLoginUsecase', () => {
  let usecase: OAuthLoginUsecase;

  const mockConfigService = {
    get: jest.fn().mockReturnValue(''),
    getOrThrow: jest.fn().mockReturnValue('test-state-secret'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new OAuthLoginUsecase(
      mockConfigService as unknown as ConfigService,
    );
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

    it('should include HMAC-signed state parameter', async () => {
      const result = await usecase.execute({
        provider: 'google',
        fcmToken: 'fcm-token-abc',
        deviceType: 'ANDROID',
        redirectUri: 'exp://localhost/--/auth/callback',
        deviceName: 'Galaxy S24',
      });

      expect(result).toBeDefined();
      expect(result.redirectUrl).toBeDefined();

      const url = new URL(result.redirectUrl);
      const state = url.searchParams.get('state')!;
      const parsed = JSON.parse(Buffer.from(state, 'base64').toString()) as {
        data: string;
        signature: string;
      };
      expect(parsed).toHaveProperty('data');
      expect(parsed).toHaveProperty('signature');
    });
  });

  describe('state verification', () => {
    const secret = 'test-secret';

    it('should verify a valid signed state', () => {
      const state = OAuthLoginUsecase.signState(
        { fcmToken: 'abc', deviceType: 'IOS' },
        secret,
      );
      const result = OAuthLoginUsecase.verifyState(state, secret);

      expect(result).not.toBeNull();
      expect(result!.fcmToken).toBe('abc');
    });

    it('should reject state signed with different secret', () => {
      const state = OAuthLoginUsecase.signState({ fcmToken: 'abc' }, secret);
      const result = OAuthLoginUsecase.verifyState(state, 'wrong-secret');

      expect(result).toBeNull();
    });

    it('should reject tampered state', () => {
      const state = OAuthLoginUsecase.signState({ fcmToken: 'abc' }, secret);
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString()) as {
        data: string;
        signature: string;
      };
      decoded.data = decoded.data.replace('abc', 'xyz');
      const tampered = Buffer.from(JSON.stringify(decoded)).toString('base64');

      expect(OAuthLoginUsecase.verifyState(tampered, secret)).toBeNull();
    });

    it('should reject malformed state', () => {
      expect(
        OAuthLoginUsecase.verifyState('not-valid-base64', secret),
      ).toBeNull();
      expect(OAuthLoginUsecase.verifyState('', secret)).toBeNull();
    });
  });
});
