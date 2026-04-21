import { AppleClientSecretService } from 'src/auth/infrastructure/apple/apple-client-secret.service';
import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { writeFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

function buildEs256KeyPem(): { privateKeyPem: string } {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const privateKeyPem = privateKey
    .export({ format: 'pem', type: 'pkcs8' })
    .toString();
  return { privateKeyPem };
}

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('AppleClientSecretService', () => {
  const clientId = 'com.example.todolist.service';
  const teamId = 'ABCDE12345';
  const keyId = 'XYZAB67890';

  it('should sign ES256 JWT with kid header and Apple claims when privateKey is inline', async () => {
    const { privateKeyPem } = buildEs256KeyPem();
    const service = new AppleClientSecretService(
      makeConfig({
        'oauth.apple.clientId': clientId,
        'oauth.apple.teamId': teamId,
        'oauth.apple.keyId': keyId,
        'oauth.apple.privateKey': privateKeyPem,
      }),
    );

    const token = await service.get();
    const decoded = jwt.decode(token, { complete: true }) as {
      header: { alg: string; kid: string };
      payload: {
        iss: string;
        sub: string;
        aud: string;
        iat: number;
        exp: number;
      };
    };

    expect(decoded.header.alg).toBe('ES256');
    expect(decoded.header.kid).toBe(keyId);
    expect(decoded.payload.iss).toBe(teamId);
    expect(decoded.payload.sub).toBe(clientId);
    expect(decoded.payload.aud).toBe('https://appleid.apple.com');
    expect(decoded.payload.exp - decoded.payload.iat).toBeLessThanOrEqual(3600);
  });

  it('should load p8 private key from privateKeyPath', async () => {
    const { privateKeyPem } = buildEs256KeyPem();
    const dir = mkdtempSync(join(tmpdir(), 'apple-key-'));
    const path = join(dir, `AuthKey_${keyId}.p8`);
    writeFileSync(path, privateKeyPem);

    const service = new AppleClientSecretService(
      makeConfig({
        'oauth.apple.clientId': clientId,
        'oauth.apple.teamId': teamId,
        'oauth.apple.keyId': keyId,
        'oauth.apple.privateKeyPath': path,
      }),
    );

    const token = await service.get();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('should reuse cached token when not near expiry', async () => {
    const { privateKeyPem } = buildEs256KeyPem();
    const service = new AppleClientSecretService(
      makeConfig({
        'oauth.apple.clientId': clientId,
        'oauth.apple.teamId': teamId,
        'oauth.apple.keyId': keyId,
        'oauth.apple.privateKey': privateKeyPem,
      }),
    );

    const t1 = await service.get();
    const t2 = await service.get();
    expect(t1).toBe(t2);
  });

  it('should throw APPLE_CLIENT_SECRET_FAILED when private key is missing', async () => {
    const service = new AppleClientSecretService(
      makeConfig({
        'oauth.apple.clientId': clientId,
        'oauth.apple.teamId': teamId,
        'oauth.apple.keyId': keyId,
      }),
    );
    await expect(service.get()).rejects.toThrow('APPLE_CLIENT_SECRET_FAILED');
  });

  it('should throw APPLE_CLIENT_SECRET_FAILED when private key is invalid', async () => {
    const service = new AppleClientSecretService(
      makeConfig({
        'oauth.apple.clientId': clientId,
        'oauth.apple.teamId': teamId,
        'oauth.apple.keyId': keyId,
        'oauth.apple.privateKey': 'not a valid key',
      }),
    );
    await expect(service.get()).rejects.toThrow('APPLE_CLIENT_SECRET_FAILED');
  });
});
