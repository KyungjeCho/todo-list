import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  HttpCode,
  UseGuards,
  UseFilters,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { GetProfileUsecase } from './application/get-profile.usecase';
import { UpdateSettingsUsecase } from './application/update-settings.usecase';
import { CompleteOnboardingUsecase } from './application/complete-onboarding.usecase';
import { RegisterDeviceUsecase } from '../notification/application/register-device.usecase';
import { UserRepository } from './infrastructure/user.repository';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { UpdateSettingsDto, RegisterDeviceDto } from './application/dto';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';
import { ERROR_CODES } from '../common/constants/error-codes';

@Controller('users')
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter())
export class UserController {
  constructor(
    private readonly getProfileUsecase: GetProfileUsecase,
    private readonly updateSettingsUsecase: UpdateSettingsUsecase,
    private readonly completeOnboardingUsecase: CompleteOnboardingUsecase,
    private readonly registerDeviceUsecase: RegisterDeviceUsecase,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * 현재 로그인한 사용자의 프로필을 조회한다.
   * @param req - 인증된 요청 (userAuthId 포함)
   * @returns 사용자 프로필 (이름, 설정, 온보딩 상태 등)
   */
  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.getProfileUsecase.execute({
      userAuthId: req.user.userAuthId,
    });
  }

  /**
   * 온보딩 완료 상태를 기록한다.
   * @param req - 인증된 요청 (userAuthId 포함)
   * @returns 완료 처리 결과
   */
  @Post('me/onboarding/complete')
  @HttpCode(200)
  async completeOnboarding(@Req() req: AuthenticatedRequest) {
    return this.completeOnboardingUsecase.execute({
      userAuthId: req.user.userAuthId,
    });
  }

  /**
   * 사용자 설정을 업데이트한다 (planTime, reviewTime, timezone, language 등).
   * @param req - 인증된 요청 (userAuthId 포함)
   * @param body - 변경할 설정 필드
   * @returns 업데이트된 사용자 프로필
   */
  @Patch('me/settings')
  async updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateSettingsDto,
  ) {
    return this.updateSettingsUsecase.execute({
      userAuthId: req.user.userAuthId,
      ...body,
    });
  }

  /**
   * 푸시 알림용 디바이스를 등록한다.
   * @param req - 인증된 요청 (userAuthId 포함)
   * @param body - FCM 토큰, 디바이스 타입/이름
   * @returns 등록 완료 메시지
   */
  @Post('me/devices')
  async registerDevice(
    @Req() req: AuthenticatedRequest,
    @Body() body: RegisterDeviceDto,
  ) {
    const user = await this.userRepository.findByUserAuthId(
      req.user.userAuthId,
    );
    if (!user) {
      throw new BadRequestException(ERROR_CODES.USER_NOT_FOUND);
    }
    await this.registerDeviceUsecase.execute({
      userId: user.id,
      fcmToken: body.fcmToken,
      deviceType: body.deviceType,
      deviceName: body.deviceName,
    });
    return { message: 'Device registered' };
  }
}
