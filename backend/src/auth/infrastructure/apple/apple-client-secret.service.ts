import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import * as jwt from 'jsonwebtoken';

// WHY: Apple은 정적 client_secret을 수락하지 않고 ES256 서명된 JWT만 요구한다.
// .p8 private key로 서명한 JWT를 매 토큰 교환에 주입하며, 비용을 줄이기 위해
// 만료 임박 전까지 in-memory 캐시로 재사용한다. (Apple 공식 스펙: iat~exp ≤ 6개월)
const CLIENT_SECRET_TTL_SEC = 3300; // 55분
const CLIENT_SECRET_REFRESH_THRESHOLD_MS = 60 * 1000;

@Injectable()
export class AppleClientSecretService {
  private readonly logger = new Logger(AppleClientSecretService.name);
  private cachedToken: string | null = null;
  private cachedExpiresAt: number = 0;

  constructor(private readonly configService: ConfigService) {}

  async get(): Promise<string> {
    const now = Date.now();
    if (
      this.cachedToken &&
      this.cachedExpiresAt - now > CLIENT_SECRET_REFRESH_THRESHOLD_MS
    ) {
      return this.cachedToken;
    }

    try {
      const clientId = this.require('oauth.apple.clientId');
      const teamId = this.require('oauth.apple.teamId');
      const keyId = this.require('oauth.apple.keyId');
      const privateKey = this.loadPrivateKey();

      const iat = Math.floor(now / 1000);
      const exp = iat + CLIENT_SECRET_TTL_SEC;
      const token = jwt.sign(
        {
          iss: teamId,
          sub: clientId,
          aud: 'https://appleid.apple.com',
          iat,
          exp,
        },
        privateKey,
        {
          algorithm: 'ES256',
          keyid: keyId,
          header: { alg: 'ES256', kid: keyId },
        },
      );

      this.cachedToken = token;
      this.cachedExpiresAt = exp * 1000;
      return await Promise.resolve(token);
    } catch (error) {
      this.cachedToken = null;
      this.cachedExpiresAt = 0;
      this.logger.error(
        `[apple] client_secret generation failed: ${(error as Error).message}`,
      );
      throw new BadRequestException('APPLE_CLIENT_SECRET_FAILED');
    }
  }

  private require(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Missing Apple config: ${key}`);
    }
    return value;
  }

  private loadPrivateKey(): string {
    const inline = this.configService.get<string>('oauth.apple.privateKey');
    if (inline) {
      // WHY: env 문자열은 줄바꿈을 \n으로 이스케이프 해 저장하는 것이 일반적.
      // 실제 PEM 파싱은 BEGIN/END 사이에 진짜 개행이 필요하다.
      return inline.replace(/\\n/g, '\n');
    }
    const path = this.configService.get<string>('oauth.apple.privateKeyPath');
    if (path) {
      return readFileSync(path, 'utf8');
    }
    throw new Error('APPLE_PRIVATE_KEY or APPLE_PRIVATE_KEY_PATH must be set');
  }
}
