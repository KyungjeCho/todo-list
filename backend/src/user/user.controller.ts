import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  UseFilters,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { GetProfileUsecase } from './application/get-profile.usecase';
import { UpdateSettingsUsecase } from './application/update-settings.usecase';
import { RegisterDeviceUsecase } from '../notification/application/register-device.usecase';
import { UserRepository } from './infrastructure/user.repository';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { UpdateSettingsDto, RegisterDeviceDto } from './application/dto';

interface AuthenticatedRequest extends Request {
  user: { userAuthId: string };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter())
export class UserController {
  constructor(
    private readonly getProfileUsecase: GetProfileUsecase,
    private readonly updateSettingsUsecase: UpdateSettingsUsecase,
    private readonly registerDeviceUsecase: RegisterDeviceUsecase,
    private readonly userRepository: UserRepository,
  ) {}

  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.getProfileUsecase.execute({
      userAuthId: req.user.userAuthId,
    });
  }

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

  @Post('me/devices')
  async registerDevice(
    @Req() req: AuthenticatedRequest,
    @Body() body: RegisterDeviceDto,
  ) {
    const user = await this.userRepository.findByUserAuthId(
      req.user.userAuthId,
    );
    if (!user) {
      throw new BadRequestException('USER_NOT_FOUND');
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
