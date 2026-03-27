import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { AuthRepository } from '../infrastructure/auth.repository';

const VALID_PROVIDERS = ['google', 'naver', 'kakao', 'apple'] as const;

interface OAuthLoginInput {
  provider: string;
  fcmToken: string;
  deviceType: string;
  redirectUri: string;
  deviceName?: string;
}

interface OAuthLoginOutput {
  redirectUrl: string;
}

const PROVIDER_AUTH_URLS: Record<string, string> = {
  google: 'https://accounts.google.com/o/oauth2/auth',
  naver: 'https://nid.naver.com/oauth2.0/authorize',
  kakao: 'https://kauth.kakao.com/oauth/authorize',
  apple: 'https://appleid.apple.com/auth/authorize',
};

const PROVIDER_SCOPES: Record<string, string> = {
  google: 'email profile',
  naver: 'profile',
  kakao: 'profile_nickname',
  apple: 'name email',
};

@Injectable()
export class OAuthLoginUsecase {
  private readonly configService: ConfigService;

  constructor(
    // private readonly authRepository: AuthRepository,
    configService?: ConfigService,
  ) {
    this.configService = configService ?? new ConfigService();
  }

  async execute(input: OAuthLoginInput): Promise<OAuthLoginOutput> {
    if (
      !VALID_PROVIDERS.includes(
        input.provider as (typeof VALID_PROVIDERS)[number],
      )
    ) {
      throw new BadRequestException('INVALID_PROVIDER');
    }

    const state = Buffer.from(
      JSON.stringify({
        fcmToken: input.fcmToken,
        deviceType: input.deviceType,
        deviceName: input.deviceName,
        redirectUri: input.redirectUri,
      }),
    ).toString('base64');

    const baseUrl = PROVIDER_AUTH_URLS[input.provider];
    const clientId =
      this.configService.get<string>(`oauth.${input.provider}.clientId`) || '';
    const callbackUrl =
      this.configService.get<string>(`oauth.${input.provider}.callbackUrl`) ||
      '';

    const scope = PROVIDER_SCOPES[input.provider] || '';
    const redirectUrl = `${baseUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scope)}&state=${state}&response_type=code`;

    return await Promise.resolve({ redirectUrl });
  }
}
