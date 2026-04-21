import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const VALID_PROVIDERS = ['google', 'naver', 'kakao', 'apple'] as const;

interface OAuthLoginInput {
  provider: string;
  fcmToken?: string;
  deviceType: string;
  redirectUri: string;
  deviceName?: string;
  timezone?: string;
  language?: string;
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

  // WHY: OAuth state 파라미터에 HMAC 서명을 적용하여 CSRF 공격을 방지한다.
  // 서명 없이 state를 전달하면 공격자가 위조된 state로 콜백을 호출할 수 있다.
  // nonce를 포함하여 replay attack도 차단한다.
  static signState(payload: Record<string, unknown>, secret: string): string {
    const nonce = randomBytes(16).toString('hex');
    const data = JSON.stringify({ ...payload, nonce });
    const signature = createHmac('sha256', secret).update(data).digest('hex');
    return Buffer.from(JSON.stringify({ data, signature })).toString('base64');
  }

  // WHY: 콜백 수신 시 state 서명을 검증하여, 우리가 발급한 state만 수락한다.
  // timingSafeEqual로 비교하여 타이밍 사이드채널 공격을 방지한다.
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
      const sigBuffer = Buffer.from(parsed.signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSig, 'hex');
      if (
        sigBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
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
        timezone: input.timezone,
        language: input.language,
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

    // WHY(P2b): signState는 base64 문자열을 반환하며 base64 알파벳에는 `+`와 `/`가
    // 포함된다. 쿼리 문자열에서 `+`는 공백으로 디코딩되기 때문에 문자열 보간으로
    // 직접 붙이면 비ASCII deviceName 등으로 인해 `+`가 출현하는 즉시 콜백에서
    // INVALID_STATE가 발생한다. URLSearchParams로 모든 파라미터를 인코딩한다.
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope,
      state,
      response_type: 'code',
    });
    // WHY: Apple은 scope=name email 요청 시 첫 로그인 이름을 form body의 별도 user 필드로만 전달한다.
    // response_mode=form_post로 POST 콜백을 받아야 이름 수집이 가능하며, 쿼리 노출도 피한다.
    if (input.provider === 'apple') {
      params.set('response_mode', 'form_post');
    }

    return await Promise.resolve({
      redirectUrl: `${baseUrl}?${params.toString()}`,
    });
  }
}
