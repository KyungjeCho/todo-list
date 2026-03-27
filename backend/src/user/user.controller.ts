import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  UseFilters,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { GetProfileUsecase } from './application/get-profile.usecase';
import { UpdateSettingsUsecase } from './application/update-settings.usecase';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import type { UpdateSettingsDto } from './application/dto';

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
}
