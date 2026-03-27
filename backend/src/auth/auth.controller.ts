import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Res,
  Req,
  UseGuards,
  UseFilters,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { OAuthLoginUsecase } from './application/oauth-login.usecase';
import { OAuthCallbackUsecase } from './application/oauth-callback.usecase';
import { TokenRefreshUsecase } from './application/token-refresh.usecase';
import { LogoutUsecase } from './application/logout.usecase';
import { JwtAuthGuard } from './infrastructure/jwt-auth.guard';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

@Controller('auth')
@UseFilters(new HttpExceptionFilter())
export class AuthController {
  constructor(
    private readonly oauthLoginUsecase: OAuthLoginUsecase,
    private readonly oauthCallbackUsecase: OAuthCallbackUsecase,
    private readonly tokenRefreshUsecase: TokenRefreshUsecase,
    private readonly logoutUsecase: LogoutUsecase,
  ) {}

  @Get('oauth/:provider')
  async oauthLogin(
    @Param('provider') provider: string,
    @Query('fcmToken') fcmToken: string,
    @Query('deviceType') deviceType: string,
    @Query('redirectUri') redirectUri: string,
    @Query('deviceName') deviceName: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.oauthLoginUsecase.execute({
      provider,
      fcmToken,
      deviceType,
      redirectUri,
      deviceName,
    });
    res.redirect(302, result.redirectUrl);
  }

  @Get('oauth/:provider/callback')
  async oauthCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    let stateData: {
      fcmToken?: string;
      deviceType?: string;
      deviceName?: string;
      redirectUri?: string;
    } = {};
    try {
      stateData = JSON.parse(
        Buffer.from(state || '', 'base64').toString(),
      ) as typeof stateData;
    } catch {
      // state parsing failed, continue with defaults
    }

    const result = await this.oauthCallbackUsecase.execute({
      provider,
      providerUserId: `${provider}-${code}`,
      providerUserEmail: '',
      providerUserName: '',
      fcmToken: stateData.fcmToken || '',
      deviceType: (stateData.deviceType as 'IOS' | 'ANDROID') || 'IOS',
      deviceName: stateData.deviceName,
      userAgent: req.headers['user-agent'] ?? undefined,
      ipAddress: req.ip ?? undefined,
    });

    const clientRedirectUri = stateData.redirectUri || 'todolist://auth/callback';
    const deepLink = `${clientRedirectUri}?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}&isNewUser=${result.isNewUser}`;
    res.redirect(302, deepLink);
  }

  @Post('token/refresh')
  @HttpCode(200)
  async tokenRefresh(
    @Body() body: { refreshToken?: string },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!body.refreshToken) {
      throw new BadRequestException('BAD_REQUEST');
    }
    return this.tokenRefreshUsecase.execute({
      refreshToken: body.refreshToken,
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(
    @Body() body: { refreshToken: string; fcmToken: string },
  ): Promise<{ message: string }> {
    return this.logoutUsecase.execute({
      refreshToken: body.refreshToken,
      fcmToken: body.fcmToken,
    });
  }
}
