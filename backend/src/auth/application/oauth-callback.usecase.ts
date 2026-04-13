import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AuthRepository } from '../infrastructure/auth.repository';
import { UserRepository } from '../../user/infrastructure/user.repository';
import { UserDeviceRepository } from '../../notification/infrastructure/user-device.repository';
import { TokenService } from '../infrastructure/token.service';
import type { OAuthCallbackDto, OAuthCallbackResponseDto } from './dto';
import { SESSION_EXPIRY_MS } from '../domain/auth.constants';

const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'es'] as const;
const DEFAULT_LANGUAGE = 'en';

function sanitizeLanguage(value: string | undefined): string {
  if (!value) return DEFAULT_LANGUAGE;
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
    ? value
    : DEFAULT_LANGUAGE;
}

function sanitizeTimezone(value: string | undefined): string | null {
  if (!value) return null;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value });
    return value;
  } catch {
    return null;
  }
}

@Injectable()
export class OAuthCallbackUsecase {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly userRepository: UserRepository,
    private readonly userDeviceRepository: UserDeviceRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: OAuthCallbackDto): Promise<OAuthCallbackResponseDto> {
    const existingOauth = await this.authRepository.findOauthByProvider(
      input.provider,
      input.providerUserId,
    );

    let userAuthId: string;
    let userId: string;
    let isNewUser: boolean;

    if (existingOauth) {
      userAuthId = existingOauth.userAuthId;
      const user = await this.userRepository.findByUserAuthId(userAuthId);
      if (!user) {
        throw new InternalServerErrorException('USER_NOT_FOUND_FOR_OAUTH');
      }
      userId = user.id;
      isNewUser = false;
    } else {
      const userAuth = await this.authRepository.createUserAuth({
        loginId: null,
        passwordHash: null,
      });
      userAuthId = userAuth.id;

      await this.authRepository.createOauthAccount({
        userAuthId,
        provider: input.provider,
        providerUserId: input.providerUserId,
        providerUserEmail: input.providerUserEmail,
      });

      // WHY: 디바이스에서 감지한 timezone/language를 받아 신규 유저에 적용.
      // 미전달·무효값 fallback: timezone → null, language → 'en'
      const user = await this.userRepository.create({
        userAuthId,
        userName:
          input.providerUserName ||
          input.providerUserEmail?.split('@')[0] ||
          `user_${Date.now()}`,
        timezone: sanitizeTimezone(input.timezone),
        language: sanitizeLanguage(input.language),
      });
      userId = user.id;
      isNewUser = true;
    }

    const accessToken = this.tokenService.generateAccessToken(userAuthId);
    const refreshToken = this.tokenService.generateRefreshToken(userAuthId);

    await this.authRepository.createSession({
      userAuthId,
      refreshToken: TokenService.hashToken(refreshToken),
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      expiredAt: new Date(Date.now() + SESSION_EXPIRY_MS),
    });

    if (input.fcmToken) {
      await this.userDeviceRepository.upsertDevice({
        userId,
        fcmToken: input.fcmToken,
        deviceType: input.deviceType,
        deviceName: input.deviceName,
      });
    }

    return { accessToken, refreshToken, isNewUser };
  }
}
