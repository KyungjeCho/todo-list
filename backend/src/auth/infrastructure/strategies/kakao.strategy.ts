import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('oauth.kakao.clientId') || '',
      clientSecret: configService.get<string>('oauth.kakao.clientSecret') || '',
      callbackURL: configService.get<string>('oauth.kakao.callbackUrl') || '',
      authorizationURL: 'https://kauth.kakao.com/oauth/authorize',
      tokenURL: 'https://kauth.kakao.com/oauth/token',
      scope: ['profile_nickname', 'account_email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      emails?: Array<{ value: string }>;
      displayName?: string;
    },
    done: (err: Error | null, user?: Record<string, string>) => void,
  ): void {
    const user = {
      provider: 'kakao',
      providerUserId: profile.id,
      providerUserEmail: profile.emails?.[0]?.value || '',
      providerUserName: profile.displayName || '',
    };
    done(null, user);
  }
}
