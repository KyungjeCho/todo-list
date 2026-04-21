import { AppleJwksService } from 'src/auth/infrastructure/apple/apple-jwks.service';

type MockJwk = {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg: string;
  use: string;
};

function jwk(kid: string, n = 'n-val'): MockJwk {
  return { kid, kty: 'RSA', n, e: 'AQAB', alg: 'RS256', use: 'sig' };
}

function mockFetchOnce(keys: MockJwk[], ok = true, status = 200): void {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify({ keys })),
  }) as unknown as typeof fetch;
}

function mockFetchSequence(
  responses: Array<{ keys?: MockJwk[]; ok?: boolean; status?: number }>,
): void {
  const fn = jest.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce({
      ok: r.ok ?? true,
      status: r.status ?? 200,
      text: () => Promise.resolve(JSON.stringify({ keys: r.keys ?? [] })),
    });
  }
  global.fetch = fn as unknown as typeof fetch;
}

describe('AppleJwksService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch Apple JWKS and return matching key by kid', async () => {
    mockFetchOnce([jwk('kid-a'), jwk('kid-b')]);
    const service = new AppleJwksService();

    const key = await service.getKey('kid-a');
    expect(key.kid).toBe('kid-a');
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'https://appleid.apple.com/auth/keys',
    );
  });

  it('should reuse TTL cache within window', async () => {
    mockFetchOnce([jwk('kid-a')]);
    const service = new AppleJwksService();

    await service.getKey('kid-a');
    await service.getKey('kid-a');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should force a single refetch on kid miss', async () => {
    mockFetchSequence([{ keys: [jwk('kid-old')] }, { keys: [jwk('kid-new')] }]);
    const service = new AppleJwksService();

    const key = await service.getKey('kid-new');
    expect(key.kid).toBe('kid-new');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should throw APPLE_ID_TOKEN_INVALID when kid still missing after refetch', async () => {
    mockFetchSequence([{ keys: [jwk('kid-old')] }, { keys: [jwk('kid-old')] }]);
    const service = new AppleJwksService();

    await expect(service.getKey('kid-absent')).rejects.toThrow(
      'APPLE_ID_TOKEN_INVALID',
    );
  });

  it('should throw APPLE_ID_TOKEN_INVALID on JWKS network failure', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('network')) as unknown as typeof fetch;
    const service = new AppleJwksService();

    await expect(service.getKey('kid-a')).rejects.toThrow(
      'APPLE_ID_TOKEN_INVALID',
    );
  });

  it('should throw APPLE_ID_TOKEN_INVALID on non-2xx JWKS response', async () => {
    mockFetchOnce([], false, 500);
    const service = new AppleJwksService();

    await expect(service.getKey('kid-a')).rejects.toThrow(
      'APPLE_ID_TOKEN_INVALID',
    );
  });
});
