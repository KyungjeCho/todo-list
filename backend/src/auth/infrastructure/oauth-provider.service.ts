import {
  Injectable,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppleClientSecretService } from './apple/apple-client-secret.service';
import { AppleIdTokenVerifier } from './apple/apple-id-token-verifier.service';

export interface OAuthUserProfile {
  provider: string;
  providerUserId: string;
  providerUserEmail: string;
  providerUserName: string;
}

const VALID_PROVIDERS = ['google', 'naver', 'kakao', 'apple'] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

@Injectable()
export class OAuthProviderService {
  private readonly logger = new Logger(OAuthProviderService.name);

  constructor(
    private readonly configService: ConfigService,
    // WHY: Apple은 정적 secret 대신 ES256 JWT 서명을 요구하고 userinfo 엔드포인트가 없다.
    // id_token 검증 기반으로 분기해야 하므로 Apple 전용 협력자를 주입한다.
    // Optional인 이유: 레거시 테스트/설정에서 Apple을 구성하지 않는 경우를 허용한다.
    @Optional() private readonly appleClientSecret?: AppleClientSecretService,
    @Optional() private readonly appleIdTokenVerifier?: AppleIdTokenVerifier,
  ) {}

  async exchangeCodeForProfile(
    provider: string,
    code: string,
    state?: string,
  ): Promise<OAuthUserProfile> {
    if (!VALID_PROVIDERS.includes(provider as Provider)) {
      throw new BadRequestException('INVALID_PROVIDER');
    }

    if (provider === 'apple') {
      return this.exchangeAppleCode(code);
    }

    const nonAppleProvider = provider as Exclude<Provider, 'apple'>;
    const tokenData = await this.exchangeCode(nonAppleProvider, code, state);
    return this.fetchUserProfile(nonAppleProvider, tokenData.accessToken);
  }

  private async exchangeAppleCode(code: string): Promise<OAuthUserProfile> {
    // WHY(T040, SC-006): Apple 실패 경로 전반에서 민감 값(code, id_token, client_secret,
    // Authorization 헤더, private key)은 절대 로깅하지 않는다. Apple의 token endpoint
    // 에러 응답 본문만 선두 300자 로깅 — Apple 스펙상 여기에 code/id_token이
    // 포함되지 않는다. 에러 코드는 아래 네 가지로 고정 매핑:
    //   - 서비스 미등록: APPLE_CLIENT_SECRET_FAILED
    //   - HTTP non-2xx / 비 JSON 응답: OAUTH_CODE_EXCHANGE_FAILED
    //   - id_token 누락 / 검증 실패: APPLE_ID_TOKEN_INVALID
    //   - client_secret 생성 실패: AppleClientSecretService 내부에서 APPLE_CLIENT_SECRET_FAILED
    if (!this.appleClientSecret || !this.appleIdTokenVerifier) {
      this.logger.error('[apple] Apple services not registered');
      throw new BadRequestException('APPLE_CLIENT_SECRET_FAILED');
    }

    const clientId =
      this.configService.get<string>('oauth.apple.clientId') || '';
    const callbackUrl =
      this.configService.get<string>('oauth.apple.callbackUrl') || '';
    const clientSecret = await this.appleClientSecret.get();

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
    });

    const response = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    const rawText = await response.text();
    if (!response.ok) {
      this.logger.error(
        `[apple] token exchange HTTP ${response.status}: ${rawText.slice(0, 300)}`,
      );
      throw new BadRequestException('OAUTH_CODE_EXCHANGE_FAILED');
    }

    let data: { id_token?: string; error?: string; error_description?: string };
    try {
      data = JSON.parse(rawText) as typeof data;
    } catch {
      this.logger.error('[apple] token exchange non-JSON response');
      throw new BadRequestException('OAUTH_CODE_EXCHANGE_FAILED');
    }

    if (!data.id_token) {
      // WHY: Apple은 access_token 대신 id_token을 사용자 식별 원천으로 사용한다.
      // id_token 부재는 검증 불가 → 잘못된 응답으로 간주.
      this.logger.error(
        `[apple] token response missing id_token. error=${data.error}`,
      );
      throw new BadRequestException('APPLE_ID_TOKEN_INVALID');
    }

    const claims = await this.appleIdTokenVerifier.verify(data.id_token);
    return {
      provider: 'apple',
      providerUserId: claims.sub,
      providerUserEmail: claims.email ?? '',
      providerUserName: '',
    };
  }

  private async exchangeCode(
    provider: Exclude<Provider, 'apple'>,
    code: string,
    state?: string,
  ): Promise<{ accessToken: string }> {
    const tokenUrl = this.getTokenUrl(provider);
    const clientId =
      this.configService.get<string>(`oauth.${provider}.clientId`) || '';
    const clientSecret =
      this.configService.get<string>(`oauth.${provider}.clientSecret`) || '';
    const callbackUrl =
      this.configService.get<string>(`oauth.${provider}.callbackUrl`) || '';

    // WHY: 프로바이더별 토큰 교환 스펙이 다름.
    // - Naver: state 필수, redirect_uri 없음 (공식 문서 기준)
    // - Google/Kakao: redirect_uri 필수
    const params: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
    };
    if (provider === 'naver') {
      if (!state) {
        throw new BadRequestException('OAUTH_CODE_EXCHANGE_FAILED');
      }
      params.state = state;
    } else {
      params.redirect_uri = callbackUrl;
    }
    const body = new URLSearchParams(params);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    const rawText = await response.text();

    if (!response.ok) {
      this.logger.error(
        `[${provider}] token exchange HTTP ${response.status}: ${rawText.slice(0, 500)}`,
      );
      throw new BadRequestException('OAUTH_CODE_EXCHANGE_FAILED');
    }

    let data: {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    try {
      data = JSON.parse(rawText) as typeof data;
    } catch {
      this.logger.error(
        `[${provider}] token exchange non-JSON response: ${rawText.slice(0, 500)}`,
      );
      throw new BadRequestException('OAUTH_CODE_EXCHANGE_FAILED');
    }

    if (!data.access_token) {
      this.logger.error(
        `[${provider}] token exchange no access_token. error=${data.error} desc=${data.error_description}`,
      );
      throw new BadRequestException('OAUTH_CODE_EXCHANGE_FAILED');
    }

    return { accessToken: data.access_token };
  }

  private async fetchUserProfile(
    provider: Exclude<Provider, 'apple'>,
    accessToken: string,
  ): Promise<OAuthUserProfile> {
    const { url, headers } = this.getUserInfoConfig(provider, accessToken);

    const response = await fetch(url, { headers });
    const rawText = await response.text();
    if (!response.ok) {
      this.logger.error(
        `[${provider}] profile fetch HTTP ${response.status}: ${rawText.slice(0, 500)}`,
      );
      throw new BadRequestException('OAUTH_PROFILE_FETCH_FAILED');
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      this.logger.error(
        `[${provider}] profile fetch non-JSON: ${rawText.slice(0, 500)}`,
      );
      throw new BadRequestException('OAUTH_PROFILE_FETCH_FAILED');
    }
    return this.parseProfile(provider, data);
  }

  private getTokenUrl(provider: Exclude<Provider, 'apple'>): string {
    const urls: Record<Exclude<Provider, 'apple'>, string> = {
      google: 'https://oauth2.googleapis.com/token',
      naver: 'https://nid.naver.com/oauth2.0/token',
      kakao: 'https://kauth.kakao.com/oauth/token',
    };
    return urls[provider];
  }

  private getUserInfoConfig(
    provider: Exclude<Provider, 'apple'>,
    accessToken: string,
  ): { url: string; headers: Record<string, string> } {
    const configs: Record<
      Exclude<Provider, 'apple'>,
      { url: string; headers: Record<string, string> }
    > = {
      google: {
        url: 'https://www.googleapis.com/oauth2/v2/userinfo',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      naver: {
        url: 'https://openapi.naver.com/v1/nid/me',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      kakao: {
        url: 'https://kapi.kakao.com/v2/user/me',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    };
    return configs[provider];
  }

  private static str(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return '';
  }

  private parseProfile(
    provider: Exclude<Provider, 'apple'>,
    data: Record<string, unknown>,
  ): OAuthUserProfile {
    const s = OAuthProviderService.str.bind(OAuthProviderService);
    switch (provider) {
      case 'google':
        return {
          provider,
          providerUserId: s(data['id']),
          providerUserEmail: s(data['email']),
          providerUserName: s(data['name']),
        };
      case 'naver': {
        const response = (data['response'] ?? {}) as Record<string, unknown>;
        return {
          provider,
          providerUserId: s(response['id']),
          providerUserEmail: s(response['email']),
          providerUserName: s(response['name']),
        };
      }
      case 'kakao': {
        const account = (data['kakao_account'] ?? {}) as Record<
          string,
          unknown
        >;
        const profile = (account['profile'] ?? {}) as Record<string, unknown>;
        return {
          provider,
          providerUserId: s(data['id']),
          providerUserEmail: s(account['email']),
          providerUserName: s(profile['nickname']),
        };
      }
    }
  }
}
