import { OAuthProviderService } from 'src/auth/infrastructure/oauth-provider.service';
import { ConfigService } from '@nestjs/config';
import { AppleClientSecretService } from 'src/auth/infrastructure/apple/apple-client-secret.service';
import { AppleIdTokenVerifier } from 'src/auth/infrastructure/apple/apple-id-token-verifier.service';

function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: (key: string) => values[key] ?? '',
  } as unknown as ConfigService;
}

describe('OAuthProviderService — Apple branch', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should use AppleClientSecretService for client_secret and AppleIdTokenVerifier for id_token without calling userinfo', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            access_token: 'a',
            id_token: 'signed.apple.jwt',
          }),
        ),
    }) as unknown as typeof fetch;

    // WHY(lint): mock 메서드 참조를 matcher에 직접 넘기면
    // unbound-method에 걸리므로, jest.fn()을 독립 변수로 추출해 사용한다.
    const getSecretMock = jest.fn().mockResolvedValue('jwt-client-secret');
    const verifyMock = jest.fn().mockResolvedValue({
      sub: 'apple-sub-123',
      email: 'user@privaterelay.appleid.com',
      emailVerified: true,
      isPrivateEmail: true,
      iss: 'https://appleid.apple.com',
      aud: 'com.example.todolist.service',
      exp: 0,
      iat: 0,
    });
    const appleClientSecret = {
      get: getSecretMock,
    } as unknown as AppleClientSecretService;
    const appleVerifier = {
      verify: verifyMock,
    } as unknown as AppleIdTokenVerifier;

    const service = new OAuthProviderService(
      makeConfig({
        'oauth.apple.clientId': 'com.example.todolist.service',
        'oauth.apple.callbackUrl':
          'https://api.example.com/auth/oauth/apple/callback',
      }),
      appleClientSecret,
      appleVerifier,
    );

    const profile = await service.exchangeCodeForProfile(
      'apple',
      'auth-code-1',
    );

    expect(profile).toEqual({
      provider: 'apple',
      providerUserId: 'apple-sub-123',
      providerUserEmail: 'user@privaterelay.appleid.com',
      providerUserName: '',
    });
    expect(getSecretMock).toHaveBeenCalledTimes(1);
    expect(verifyMock).toHaveBeenCalledWith('signed.apple.jwt');
    // fetch called exactly once: Apple token endpoint only (no userinfo)
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const tokenCallUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(tokenCallUrl).toBe('https://appleid.apple.com/auth/token');
  });

  it('should throw APPLE_ID_TOKEN_INVALID when Apple token response lacks id_token', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ access_token: 'a' })),
    }) as unknown as typeof fetch;

    const appleClientSecret = {
      get: jest.fn().mockResolvedValue('jwt'),
    } as unknown as AppleClientSecretService;
    const appleVerifier = {
      verify: jest.fn(),
    } as unknown as AppleIdTokenVerifier;

    const service = new OAuthProviderService(
      makeConfig({
        'oauth.apple.clientId': 'cid',
        'oauth.apple.callbackUrl': 'cb',
      }),
      appleClientSecret,
      appleVerifier,
    );
    await expect(service.exchangeCodeForProfile('apple', 'c')).rejects.toThrow(
      'APPLE_ID_TOKEN_INVALID',
    );
  });

  it('should throw OAUTH_CODE_EXCHANGE_FAILED on Apple token endpoint non-2xx', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve('{"error":"invalid_client"}'),
    }) as unknown as typeof fetch;

    const service = new OAuthProviderService(
      makeConfig({
        'oauth.apple.clientId': 'cid',
        'oauth.apple.callbackUrl': 'cb',
      }),
      {
        get: jest.fn().mockResolvedValue('jwt'),
      } as unknown as AppleClientSecretService,
      { verify: jest.fn() } as unknown as AppleIdTokenVerifier,
    );
    await expect(service.exchangeCodeForProfile('apple', 'c')).rejects.toThrow(
      'OAUTH_CODE_EXCHANGE_FAILED',
    );
  });
});
