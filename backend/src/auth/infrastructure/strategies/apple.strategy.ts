import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('oauth.apple.clientId') || '',
      clientSecret: 'apple-placeholder',
      callbackURL: '/auth/oauth/apple/callback',
      authorizationURL: 'https://appleid.apple.com/auth/authorize',
      tokenURL: 'https://appleid.apple.com/auth/token',
      scope: ['name', 'email'],
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
      provider: 'apple',
      providerUserId: profile.id,
      providerUserEmail: profile.emails?.[0]?.value || '',
      providerUserName: profile.displayName || '',
    };
    done(null, user);
  }
}
