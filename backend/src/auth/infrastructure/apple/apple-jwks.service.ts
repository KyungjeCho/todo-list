import { Injectable, BadRequestException, Logger } from '@nestjs/common';

export interface AppleJwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg: string;
  use: string;
}

// WHY: Apple JWKS는 빈번하게 바뀌지 않지만 kid 롤오버에 대비해야 한다.
// TTL 캐시(10분) + kid 미일치 시 1회 강제 재조회로 안정성과 비용을 균형 맞춘다.
const JWKS_URL = 'https://appleid.apple.com/auth/keys';
const JWKS_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class AppleJwksService {
  private readonly logger = new Logger(AppleJwksService.name);
  private cache: { keys: AppleJwk[]; fetchedAt: number } | null = null;

  async getKey(kid: string): Promise<AppleJwk> {
    const now = Date.now();
    const cacheFresh =
      this.cache !== null && now - this.cache.fetchedAt < JWKS_TTL_MS;

    if (cacheFresh) {
      const hit = this.cache!.keys.find((k) => k.kid === kid);
      if (hit) return hit;
    }

    // miss 또는 캐시 없음 → 한 번 가져오고, 여전히 없으면 강제 재조회 1회
    await this.refresh();
    let hit = this.cache!.keys.find((k) => k.kid === kid);
    if (hit) return hit;

    await this.refresh();
    hit = this.cache!.keys.find((k) => k.kid === kid);
    if (hit) return hit;

    this.logger.error(`[apple] kid not found in JWKS after refresh`);
    throw new BadRequestException('APPLE_ID_TOKEN_INVALID');
  }

  private async refresh(): Promise<void> {
    try {
      const res = await fetch(JWKS_URL);
      if (!res.ok) {
        throw new Error(`JWKS HTTP ${res.status}`);
      }
      const raw = await res.text();
      const parsed = JSON.parse(raw) as { keys?: AppleJwk[] };
      const keys = parsed.keys ?? [];
      this.cache = { keys, fetchedAt: Date.now() };
    } catch (error) {
      this.logger.error(
        `[apple] JWKS fetch failed: ${(error as Error).message}`,
      );
      throw new BadRequestException('APPLE_ID_TOKEN_INVALID');
    }
  }
}
