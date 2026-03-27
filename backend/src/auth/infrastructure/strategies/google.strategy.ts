import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('oauth.google.clientId') || '',
      clientSecret:
        configService.get<string>('oauth.google.clientSecret') || '',
      callbackURL: configService.get<string>('oauth.google.callbackUrl') || '',
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  validate(
    _req: unknown,
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      emails?: Array<{ value: string }>;
      displayName?: string;
    },
    done: VerifyCallback,
  ): void {
    const user = {
      provider: 'google',
      providerUserId: profile.id,
      providerUserEmail: profile.emails?.[0]?.value || '',
      providerUserName: profile.displayName || '',
    };
    done(null, user);
  }
}
