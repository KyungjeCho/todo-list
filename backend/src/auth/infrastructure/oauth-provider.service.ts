import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
  constructor(private readonly configService: ConfigService) {}

  async exchangeCodeForProfile(
    provider: string,
    code: string,
  ): Promise<OAuthUserProfile> {
    if (!VALID_PROVIDERS.includes(provider as Provider)) {
      throw new BadRequestException('INVALID_PROVIDER');
    }

    const tokenData = await this.exchangeCode(provider as Provider, code);
    return this.fetchUserProfile(provider as Provider, tokenData.accessToken);
  }

  private async exchangeCode(
    provider: Provider,
    code: string,
  ): Promise<{ accessToken: string }> {
    const tokenUrl = this.getTokenUrl(provider);
    const clientId =
      this.configService.get<string>(`oauth.${provider}.clientId`) || '';
    const clientSecret =
      this.configService.get<string>(`oauth.${provider}.clientSecret`) || '';
    const callbackUrl =
      this.configService.get<string>(`oauth.${provider}.callbackUrl`) || '';

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      code,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new BadRequestException('OAUTH_CODE_EXCHANGE_FAILED');
    }

    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) {
      throw new BadRequestException('OAUTH_CODE_EXCHANGE_FAILED');
    }

    return { accessToken: data.access_token };
  }

  private async fetchUserProfile(
    provider: Provider,
    accessToken: string,
  ): Promise<OAuthUserProfile> {
    const { url, headers } = this.getUserInfoConfig(provider, accessToken);

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new BadRequestException('OAUTH_PROFILE_FETCH_FAILED');
    }

    const data = (await response.json()) as Record<string, unknown>;
    return this.parseProfile(provider, data);
  }

  private getTokenUrl(provider: Provider): string {
    const urls: Record<Provider, string> = {
      google: 'https://oauth2.googleapis.com/token',
      naver: 'https://nid.naver.com/oauth2.0/token',
      kakao: 'https://kauth.kakao.com/oauth/token',
      apple: 'https://appleid.apple.com/auth/token',
    };
    return urls[provider];
  }

  private getUserInfoConfig(
    provider: Provider,
    accessToken: string,
  ): { url: string; headers: Record<string, string> } {
    const configs: Record<
      Provider,
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
      apple: {
        url: 'https://appleid.apple.com/auth/userinfo',
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
    provider: Provider,
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
      case 'apple':
        return {
          provider,
          providerUserId: s(data['sub']),
          providerUserEmail: s(data['email']),
          providerUserName: '',
        };
    }
  }
}
