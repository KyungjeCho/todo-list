import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { createPublicKey } from 'crypto';
import { AppleJwksService, AppleJwk } from './apple-jwks.service';

export interface AppleIdTokenClaims {
  sub: string;
  email: string | undefined;
  emailVerified: boolean | undefined;
  isPrivateEmail: boolean | undefined;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

const APPLE_ISS = 'https://appleid.apple.com';
const CLOCK_SKEW_SEC = 60;
// WHY(P2a): Apple id_token은 Apple 스펙상 항상 RS256으로 서명된다. 헤더의 alg를
// 신뢰하여 verify에 넘기면 알고리즘 혼동 공격(HS256으로 RSA 공개키를 HMAC 키로 취급)
// 등 알고리즘-우회 취약점의 표면이 되므로 기대 알고리즘을 고정한다.
const APPLE_EXPECTED_ALG = 'RS256';
const APPLE_EXPECTED_KTY = 'RSA';

@Injectable()
export class AppleIdTokenVerifier {
  private readonly logger = new Logger(AppleIdTokenVerifier.name);

  constructor(
    private readonly jwks: AppleJwksService,
    private readonly configService: ConfigService,
  ) {}

  async verify(idToken: string): Promise<AppleIdTokenClaims> {
    const expectedAud = this.configService.get<string>('oauth.apple.clientId');
    if (!expectedAud) {
      this.logger.error('[apple] oauth.apple.clientId not configured');
      throw new BadRequestException('APPLE_ID_TOKEN_INVALID');
    }

    let decodedHeader: { kid?: string; alg?: string };
    try {
      const decoded = jwt.decode(idToken, { complete: true }) as {
        header: { kid?: string; alg?: string };
      } | null;
      if (!decoded || !decoded.header) throw new Error('decode failed');
      decodedHeader = decoded.header;
    } catch {
      this.logger.error('[apple] id_token header decode failed');
      throw new BadRequestException('APPLE_ID_TOKEN_INVALID');
    }

    const kid = decodedHeader.kid;
    const alg = decodedHeader.alg;
    // WHY(P2a): 헤더 alg 값을 verify로 넘기기 전에 기대값(RS256)과 엄격히 비교한다.
    // 불일치하면 JWKS 조회조차 수행하지 않고 즉시 거부하여 불필요한 외부 호출도 막는다.
    if (!kid || alg !== APPLE_EXPECTED_ALG) {
      this.logger.error(`[apple] unexpected id_token alg=${alg ?? 'none'}`);
      throw new BadRequestException('APPLE_ID_TOKEN_INVALID');
    }

    const jwk = await this.jwks.getKey(kid);
    // WHY(P2a): JWK 메타데이터도 기대값과 일치하는지 확인한다. Apple 키 로테이션 중
    // 잘못된 키 타입이 반환될 경우 jwkToPem이 예외를 던지기 전에 명시적으로 거부.
    if (jwk.kty !== APPLE_EXPECTED_KTY) {
      this.logger.error(`[apple] unexpected jwk.kty=${jwk.kty}`);
      throw new BadRequestException('APPLE_ID_TOKEN_INVALID');
    }
    const publicKeyPem = AppleIdTokenVerifier.jwkToPem(jwk);

    try {
      const payload = jwt.verify(idToken, publicKeyPem, {
        // WHY(P2a): 헤더 alg가 아닌 고정 배열을 넘겨 알고리즘 혼동 공격을 원천 차단.
        algorithms: [APPLE_EXPECTED_ALG],
        issuer: APPLE_ISS,
        audience: expectedAud,
        clockTolerance: CLOCK_SKEW_SEC,
      }) as {
        sub?: string;
        email?: string;
        email_verified?: string | boolean;
        is_private_email?: string | boolean;
        iss?: string;
        aud?: string;
        exp?: number;
        iat?: number;
      };

      if (
        !payload.sub ||
        payload.iss !== APPLE_ISS ||
        payload.aud !== expectedAud ||
        typeof payload.exp !== 'number' ||
        typeof payload.iat !== 'number'
      ) {
        throw new Error('payload claims invalid');
      }

      return {
        sub: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        emailVerified: AppleIdTokenVerifier.coerceBool(payload.email_verified),
        isPrivateEmail: AppleIdTokenVerifier.coerceBool(
          payload.is_private_email,
        ),
        iss: payload.iss,
        aud: payload.aud,
        exp: payload.exp,
        iat: payload.iat,
      };
    } catch (error) {
      this.logger.error(
        `[apple] id_token verify failed: ${(error as Error).message}`,
      );
      throw new BadRequestException('APPLE_ID_TOKEN_INVALID');
    }
  }

  private static jwkToPem(jwk: AppleJwk): string {
    const key = createPublicKey({
      key: jwk as unknown as { kty: string; n: string; e: string },
      format: 'jwk',
    });
    return key.export({ format: 'pem', type: 'spki' }).toString();
  }

  private static coerceBool(v: unknown): boolean | undefined {
    if (typeof v === 'boolean') return v;
    if (v === 'true') return true;
    if (v === 'false') return false;
    return undefined;
  }
}
