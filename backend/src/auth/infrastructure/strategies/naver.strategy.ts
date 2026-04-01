import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('oauth.naver.clientId') || '',
      clientSecret: configService.get<string>('oauth.naver.clientSecret') || '',
      callbackURL: configService.get<string>('oauth.naver.callbackUrl') || '',
      authorizationURL: 'https://nid.naver.com/oauth2.0/authorize',
      tokenURL: 'https://nid.naver.com/oauth2.0/token',
      scope: ['profile'],
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
      provider: 'naver',
      providerUserId: profile.id,
      providerUserEmail: profile.emails?.[0]?.value || '',
      providerUserName: profile.displayName || '',
    };
    done(null, user);
  }
}
