import { AppleIdTokenVerifier } from 'src/auth/infrastructure/apple/apple-id-token-verifier.service';
import { AppleJwksService } from 'src/auth/infrastructure/apple/apple-jwks.service';
import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync } from 'crypto';
import * as jwt from 'jsonwebtoken';

const APPLE_ISS = 'https://appleid.apple.com';
const CLIENT_ID = 'com.example.todolist.service';

function buildRsaKey(kid: string): {
  privateKey: string;
  publicJwk: {
    kid: string;
    kty: string;
    n: string;
    e: string;
    alg: string;
    use: string;
  };
} {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const privatePem = privateKey
    .export({ format: 'pem', type: 'pkcs8' })
    .toString();
  const jwkRaw = publicKey.export({ format: 'jwk' }) as {
    n: string;
    e: string;
  };
  return {
    privateKey: privatePem,
    publicJwk: {
      kid,
      kty: 'RSA',
      n: jwkRaw.n,
      e: jwkRaw.e,
      alg: 'RS256',
      use: 'sig',
    },
  };
}

function signIdToken(
  privateKey: string,
  kid: string,
  payload: Record<string, unknown>,
  algorithm: jwt.Algorithm = 'RS256',
): string {
  return jwt.sign(payload, privateKey, {
    algorithm,
    header: { alg: algorithm, kid },
  });
}

function makeConfig(clientId: string): ConfigService {
  return {
    get: (key: string) =>
      key === 'oauth.apple.clientId' ? clientId : undefined,
  } as unknown as ConfigService;
}

describe('AppleIdTokenVerifier', () => {
  it('should accept a valid id_token and return claims', async () => {
    const kid = 'kid-1';
    const { privateKey, publicJwk } = buildRsaKey(kid);
    const now = Math.floor(Date.now() / 1000);
    const idToken = signIdToken(privateKey, kid, {
      iss: APPLE_ISS,
      aud: CLIENT_ID,
      sub: '001234.abcdef',
      email: 'user@privaterelay.appleid.com',
      email_verified: 'true',
      is_private_email: 'true',
      iat: now,
      exp: now + 600,
    });

    const jwks: AppleJwksService = {
      getKey: jest.fn().mockResolvedValue(publicJwk),
    } as unknown as AppleJwksService;
    const verifier = new AppleIdTokenVerifier(jwks, makeConfig(CLIENT_ID));

    const claims = await verifier.verify(idToken);
    expect(claims.sub).toBe('001234.abcdef');
    expect(claims.email).toBe('user@privaterelay.appleid.com');
    expect(claims.iss).toBe(APPLE_ISS);
    expect(claims.aud).toBe(CLIENT_ID);
  });

  it('should reject when iss is wrong', async () => {
    const kid = 'kid-2';
    const { privateKey, publicJwk } = buildRsaKey(kid);
    const now = Math.floor(Date.now() / 1000);
    const idToken = signIdToken(privateKey, kid, {
      iss: 'https://evil.example.com',
      aud: CLIENT_ID,
      sub: 'sub',
      iat: now,
      exp: now + 600,
    });

    const jwks = {
      getKey: jest.fn().mockResolvedValue(publicJwk),
    } as unknown as AppleJwksService;
    const verifier = new AppleIdTokenVerifier(jwks, makeConfig(CLIENT_ID));
    await expect(verifier.verify(idToken)).rejects.toThrow(
      'APPLE_ID_TOKEN_INVALID',
    );
  });

  it('should reject when aud does not match configured clientId', async () => {
    const kid = 'kid-3';
    const { privateKey, publicJwk } = buildRsaKey(kid);
    const now = Math.floor(Date.now() / 1000);
    const idToken = signIdToken(privateKey, kid, {
      iss: APPLE_ISS,
      aud: 'other.service',
      sub: 'sub',
      iat: now,
      exp: now + 600,
    });

    const jwks = {
      getKey: jest.fn().mockResolvedValue(publicJwk),
    } as unknown as AppleJwksService;
    const verifier = new AppleIdTokenVerifier(jwks, makeConfig(CLIENT_ID));
    await expect(verifier.verify(idToken)).rejects.toThrow(
      'APPLE_ID_TOKEN_INVALID',
    );
  });

  it('should reject when exp is in the past beyond clock skew', async () => {
    const kid = 'kid-4';
    const { privateKey, publicJwk } = buildRsaKey(kid);
    const now = Math.floor(Date.now() / 1000);
    const idToken = signIdToken(privateKey, kid, {
      iss: APPLE_ISS,
      aud: CLIENT_ID,
      sub: 'sub',
      iat: now - 4000,
      exp: now - 3600,
    });

    const jwks = {
      getKey: jest.fn().mockResolvedValue(publicJwk),
    } as unknown as AppleJwksService;
    const verifier = new AppleIdTokenVerifier(jwks, makeConfig(CLIENT_ID));
    await expect(verifier.verify(idToken)).rejects.toThrow(
      'APPLE_ID_TOKEN_INVALID',
    );
  });

  it('should reject on invalid signature (key mismatch)', async () => {
    const kid = 'kid-5';
    const { privateKey } = buildRsaKey(kid);
    const { publicJwk: otherPublicJwk } = buildRsaKey(kid);
    const now = Math.floor(Date.now() / 1000);
    const idToken = signIdToken(privateKey, kid, {
      iss: APPLE_ISS,
      aud: CLIENT_ID,
      sub: 'sub',
      iat: now,
      exp: now + 600,
    });

    const jwks = {
      getKey: jest.fn().mockResolvedValue(otherPublicJwk),
    } as unknown as AppleJwksService;
    const verifier = new AppleIdTokenVerifier(jwks, makeConfig(CLIENT_ID));
    await expect(verifier.verify(idToken)).rejects.toThrow(
      'APPLE_ID_TOKEN_INVALID',
    );
  });

  // WHY(P2a): JWT 헤더의 alg를 신뢰해 그대로 verify에 넘기면 알고리즘 혼동
  // (HS256 → RSA public key를 HMAC secret으로 사용) 공격의 표면이 된다.
  // Apple id_token은 항상 RS256이므로 기대 알고리즘을 고정해야 한다.
  it('should reject id_token when header alg is not RS256', async () => {
    const kid = 'kid-alg';
    const { privateKey, publicJwk } = buildRsaKey(kid);
    const now = Math.floor(Date.now() / 1000);
    // PS256은 RSA 키와 호환되지만 Apple 스펙이 아니므로 거부되어야 한다.
    const idToken = signIdToken(
      privateKey,
      kid,
      {
        iss: APPLE_ISS,
        aud: CLIENT_ID,
        sub: 'sub',
        iat: now,
        exp: now + 600,
      },
      'PS256',
    );

    const jwks = {
      getKey: jest.fn().mockResolvedValue(publicJwk),
    } as unknown as AppleJwksService;
    const verifier = new AppleIdTokenVerifier(jwks, makeConfig(CLIENT_ID));
    await expect(verifier.verify(idToken)).rejects.toThrow(
      'APPLE_ID_TOKEN_INVALID',
    );
  });

  it('should reject when JWK kty is not RSA', async () => {
    const kid = 'kid-kty';
    const { privateKey, publicJwk } = buildRsaKey(kid);
    const now = Math.floor(Date.now() / 1000);
    const idToken = signIdToken(privateKey, kid, {
      iss: APPLE_ISS,
      aud: CLIENT_ID,
      sub: 'sub',
      iat: now,
      exp: now + 600,
    });

    const jwks = {
      getKey: jest.fn().mockResolvedValue({ ...publicJwk, kty: 'EC' }),
    } as unknown as AppleJwksService;
    const verifier = new AppleIdTokenVerifier(jwks, makeConfig(CLIENT_ID));
    await expect(verifier.verify(idToken)).rejects.toThrow(
      'APPLE_ID_TOKEN_INVALID',
    );
  });

  it('should allow 60s clock skew', async () => {
    const kid = 'kid-6';
    const { privateKey, publicJwk } = buildRsaKey(kid);
    const now = Math.floor(Date.now() / 1000);
    const idToken = signIdToken(privateKey, kid, {
      iss: APPLE_ISS,
      aud: CLIENT_ID,
      sub: 'sub',
      iat: now + 30,
      exp: now + 600,
    });

    const jwks = {
      getKey: jest.fn().mockResolvedValue(publicJwk),
    } as unknown as AppleJwksService;
    const verifier = new AppleIdTokenVerifier(jwks, makeConfig(CLIENT_ID));
    await expect(verifier.verify(idToken)).resolves.toBeDefined();
  });
});
