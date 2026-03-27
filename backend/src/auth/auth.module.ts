import { Module, Provider, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { OAuthLoginUsecase } from './application/oauth-login.usecase';
import { OAuthCallbackUsecase } from './application/oauth-callback.usecase';
import { TokenRefreshUsecase } from './application/token-refresh.usecase';
import { LogoutUsecase } from './application/logout.usecase';
import { AuthRepository } from './infrastructure/auth.repository';
import { TokenService } from './infrastructure/token.service';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { GoogleStrategy } from './infrastructure/strategies/google.strategy';
import { NaverStrategy } from './infrastructure/strategies/naver.strategy';
import { KakaoStrategy } from './infrastructure/strategies/kakao.strategy';
import { AppleStrategy } from './infrastructure/strategies/apple.strategy';
import { UserAuth } from './domain/user-auth.entity';
import { UserAuthOauth } from './domain/user-auth-oauth.entity';
import { UserSession } from './domain/user-session.entity';
import { UserRepository } from '../user/infrastructure/user.repository';
import { UserDeviceRepository } from '../notification/infrastructure/user-device.repository';
import { User } from '../user/domain/user.entity';
import { UserDevice } from '../notification/domain/user-device.entity';
import { StringValue } from 'ms';

const logger = new Logger('AuthModule');

function buildOAuthProviders(): Provider[] {
  const providers: Provider[] = [];

  if (process.env.GOOGLE_CLIENT_ID) {
    providers.push(GoogleStrategy);
  } else {
    logger.warn('GOOGLE_CLIENT_ID not set — Google OAuth disabled');
  }

  if (process.env.NAVER_CLIENT_ID) {
    providers.push(NaverStrategy);
  } else {
    logger.warn('NAVER_CLIENT_ID not set — Naver OAuth disabled');
  }

  if (process.env.KAKAO_CLIENT_ID) {
    providers.push(KakaoStrategy);
  } else {
    logger.warn('KAKAO_CLIENT_ID not set — Kakao OAuth disabled');
  }

  if (process.env.APPLE_CLIENT_ID) {
    providers.push(AppleStrategy);
  } else {
    logger.warn('APPLE_CLIENT_ID not set — Apple OAuth disabled');
  }

  return providers;
}

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserAuth,
      UserAuthOauth,
      UserSession,
      User,
      UserDevice,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<StringValue>('jwt.accessExpiration') || '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    OAuthLoginUsecase,
    OAuthCallbackUsecase,
    TokenRefreshUsecase,
    LogoutUsecase,
    AuthRepository,
    TokenService,
    JwtStrategy,
    UserRepository,
    UserDeviceRepository,
    ...buildOAuthProviders(),
  ],
  exports: [TokenService, AuthRepository, JwtStrategy],
})
export class AuthModule {}
