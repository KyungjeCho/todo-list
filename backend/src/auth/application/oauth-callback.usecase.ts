import { Injectable } from '@nestjs/common';
import { AuthRepository } from '../infrastructure/auth.repository';
import { UserRepository } from '../../user/infrastructure/user.repository';
import { UserDeviceRepository } from '../../notification/infrastructure/user-device.repository';
import { TokenService } from '../infrastructure/token.service';
import type { OAuthCallbackDto, OAuthCallbackResponseDto } from './dto';

@Injectable()
export class OAuthCallbackUsecase {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly userRepository: UserRepository,
    private readonly userDeviceRepository: UserDeviceRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: OAuthCallbackDto): Promise<OAuthCallbackResponseDto> {
    const existingOauth = await this.authRepository.findOauthByProviderUserId(
      input.providerUserId,
    );

    let userAuthId: string;
    let userId: string;
    let isNewUser: boolean;

    if (existingOauth) {
      userAuthId = existingOauth.userAuthId;
      const user = await this.userRepository.findByUserAuthId(userAuthId);
      userId = user!.id;
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

      // WHY: 신규 유저는 timezone null로 생성하여 온보딩에서 설정하도록 유도
      const user = await this.userRepository.create({
        userAuthId,
        userName:
          input.providerUserName ||
          input.providerUserEmail?.split('@')[0] ||
          `user_${Date.now()}`,
        timezone: null,
        language: 'ko-KR',
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
      expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
