import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'crypto';

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

  constructor(configService?: ConfigService) {
    this.configService = configService ?? new ConfigService();
  }

  private getStateSecret(): string {
    return this.configService.getOrThrow<string>('oauth.stateSecret');
  }

  static signState(payload: Record<string, unknown>, secret: string): string {
    const nonce = randomBytes(16).toString('hex');
    const data = JSON.stringify({ ...payload, nonce });
    const signature = createHmac('sha256', secret).update(data).digest('hex');
    return Buffer.from(JSON.stringify({ data, signature })).toString('base64');
  }

  static verifyState(
    state: string,
    secret: string,
  ): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64').toString()) as {
        data: string;
        signature: string;
      };
      const expectedSig = createHmac('sha256', secret)
        .update(parsed.data)
        .digest('hex');
      if (parsed.signature !== expectedSig) {
        return null;
      }
      return JSON.parse(parsed.data) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  async execute(input: OAuthLoginInput): Promise<OAuthLoginOutput> {
    if (
      !VALID_PROVIDERS.includes(
        input.provider as (typeof VALID_PROVIDERS)[number],
      )
    ) {
      throw new BadRequestException('INVALID_PROVIDER');
    }

    const state = OAuthLoginUsecase.signState(
      {
        fcmToken: input.fcmToken,
        deviceType: input.deviceType,
        deviceName: input.deviceName,
        redirectUri: input.redirectUri,
      },
      this.getStateSecret(),
    );

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
