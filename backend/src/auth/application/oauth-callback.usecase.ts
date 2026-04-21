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

// WHY: 클라이언트가 전송한 timezone 문자열을 Intl API로 검증하여,
// 잘못된 timezone이 DB에 저장되어 이후 날짜 연산에서 런타임 오류를 일으키는 것을 방지한다.
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
      // WHY(US2, FR-004): 재로그인 분기 — `(provider, providerUserId=sub)`만으로
      // 기존 사용자 식별. Apple은 2회차 이후 `user` 필드와 이메일을 생략하므로
      // 여기서 `input.providerUserName/Email`이 빈 문자열이어도 절대 덮어쓰지 않는다.
      // `user.user_name` 불변 보장은 아래에서 `userRepository.create`를 호출하지
      // 않는 것으로 충족되며, 회귀가 발생하면 integration 테스트(T027/T028)에서 감지.
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
