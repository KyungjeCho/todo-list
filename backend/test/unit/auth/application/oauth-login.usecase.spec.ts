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

    it('should include response_mode=form_post and scope=name email for apple provider', async () => {
      const result = await usecase.execute({
        provider: 'apple',
        fcmToken: 'fcm-token-123',
        deviceType: 'IOS',
        redirectUri: 'exp://localhost/--/auth/callback',
      });

      const url = new URL(result.redirectUrl);
      expect(url.searchParams.get('response_mode')).toBe('form_post');
      expect(url.searchParams.get('scope')).toBe('name email');
      expect(url.origin + url.pathname).toBe(
        'https://appleid.apple.com/auth/authorize',
      );
    });

    it('should NOT include response_mode for google provider', async () => {
      const result = await usecase.execute({
        provider: 'google',
        fcmToken: 'fcm-token-123',
        deviceType: 'IOS',
        redirectUri: 'exp://localhost/--/auth/callback',
      });

      const url = new URL(result.redirectUrl);
      expect(url.searchParams.get('response_mode')).toBeNull();
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

    // WHY(P2b): signState는 base64 문자열을 반환하는데 base64 알파벳에는 `+`/`/`가
    // 포함된다. URL 쿼리 파라미터에서 `+`는 공백으로 디코딩되므로 문자열 보간으로
    // 붙이면 콜백에서 간헐적으로 INVALID_STATE가 발생한다. 한글 deviceName처럼
    // 비ASCII 페이로드가 들어갈 때 재현되므로 URL 파서 roundtrip을 검증한다.
    it('should URL-encode state so non-ASCII deviceName survives roundtrip', async () => {
      const result = await usecase.execute({
        provider: 'google',
        fcmToken: 'fcm-token-abc',
        deviceType: 'IOS',
        redirectUri: 'exp://localhost/--/auth/callback',
        deviceName: '김민지의 아이폰', // 한글 포함 — base64 후 `+`가 포함될 가능성
      });

      // URL 파서가 state를 온전히 복원해야 한다.
      const url = new URL(result.redirectUrl);
      const rawState = url.searchParams.get('state');
      expect(rawState).toBeTruthy();

      // 복원된 state가 HMAC 서명 검증을 통과해야 한다 (공백 치환 시 실패).
      const verified = OAuthLoginUsecase.verifyState(
        rawState!,
        'test-state-secret',
      );
      expect(verified).not.toBeNull();
      expect(verified!.deviceName).toBe('김민지의 아이폰');
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
