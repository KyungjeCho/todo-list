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
import { Throttle } from '@nestjs/throttler';
import type { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { OAuthLoginUsecase } from './application/oauth-login.usecase';
import { OAuthCallbackUsecase } from './application/oauth-callback.usecase';
import { TokenRefreshUsecase } from './application/token-refresh.usecase';
import { LogoutUsecase } from './application/logout.usecase';
import { TokenRefreshDto, LogoutDto } from './application/dto';
import { JwtAuthGuard } from './infrastructure/jwt-auth.guard';
import { OAuthProviderService } from './infrastructure/oauth-provider.service';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

@Controller('auth')
@UseFilters(new HttpExceptionFilter())
export class AuthController {
  constructor(
    private readonly oauthLoginUsecase: OAuthLoginUsecase,
    private readonly oauthCallbackUsecase: OAuthCallbackUsecase,
    private readonly tokenRefreshUsecase: TokenRefreshUsecase,
    private readonly logoutUsecase: LogoutUsecase,
    private readonly oauthProviderService: OAuthProviderService,
    private readonly configService: ConfigService,
  ) {}

  @Get('oauth/:provider')
  async oauthLogin(
    @Param('provider') provider: string,
    @Query('fcmToken') fcmToken: string | undefined,
    @Query('deviceType') deviceType: string,
    @Query('redirectUri') redirectUri: string,
    @Query('deviceName') deviceName: string | undefined,
    @Query('timezone') timezone: string | undefined,
    @Query('language') language: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const validatedRedirectUri = this.validateRedirectUri(redirectUri);
    const result = await this.oauthLoginUsecase.execute({
      provider,
      fcmToken,
      deviceType,
      redirectUri: validatedRedirectUri,
      deviceName,
      timezone,
      language,
    });
    res.redirect(302, result.redirectUrl);
  }

  private static readonly DEFAULT_REDIRECT_URI = 'todolist://auth/callback';

  @Get('oauth/:provider/callback')
  async oauthCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!code) {
      throw new BadRequestException('MISSING_AUTHORIZATION_CODE');
    }

    const stateSecret =
      this.configService.getOrThrow<string>('oauth.stateSecret');
    const verified = OAuthLoginUsecase.verifyState(state || '', stateSecret);
    if (!verified) {
      throw new BadRequestException('INVALID_STATE');
    }

    // WHY: state 디코딩 후 필수 필드 타입 검증 — 악의적 state로 undefined 캐스팅 방지
    const stateData = verified;
    if (
      typeof stateData !== 'object' ||
      stateData === null ||
      (stateData.deviceType !== undefined &&
        typeof stateData.deviceType !== 'string')
    ) {
      throw new BadRequestException('INVALID_STATE_FORMAT');
    }

    const deviceType = stateData.deviceType;
    if (deviceType && deviceType !== 'IOS' && deviceType !== 'ANDROID') {
      throw new BadRequestException('INVALID_DEVICE_TYPE');
    }

    const userProfile = await this.oauthProviderService.exchangeCodeForProfile(
      provider,
      code,
      state,
    );

    const result = await this.oauthCallbackUsecase.execute({
      provider: userProfile.provider,
      providerUserId: userProfile.providerUserId,
      providerUserEmail: userProfile.providerUserEmail,
      providerUserName: userProfile.providerUserName,
      fcmToken: (stateData.fcmToken as string) || undefined,
      deviceType: (deviceType as 'IOS' | 'ANDROID') || 'IOS',
      deviceName: stateData.deviceName as string | undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
      ipAddress: req.ip ?? undefined,
      timezone: stateData.timezone as string | undefined,
      language: stateData.language as string | undefined,
    });

    const clientRedirectUri = this.validateRedirectUri(
      stateData.redirectUri as string | undefined,
    );
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      isNewUser: String(result.isNewUser),
    });
    // WHY: query string 대신 fragment(#)로 전달하여 서버/프록시 로그에 토큰 노출 방지
    res.redirect(302, `${clientRedirectUri}#${params.toString()}`);
  }

  private validateRedirectUri(uri: string | undefined): string {
    if (!uri) {
      return AuthController.DEFAULT_REDIRECT_URI;
    }
    const allowedUris = this.getAllowedRedirectUris();
    if (!allowedUris.includes(uri)) {
      return AuthController.DEFAULT_REDIRECT_URI;
    }
    return uri;
  }

  private getAllowedRedirectUris(): string[] {
    const extra =
      this.configService.get<string>('app.allowedRedirectUris') || '';
    const uris = [AuthController.DEFAULT_REDIRECT_URI];
    if (extra) {
      uris.push(
        ...extra
          .split(',')
          .map((u) => u.trim())
          .filter(Boolean),
      );
    }
    return uris;
  }

  @Post('token/refresh')
  @HttpCode(200)
  @Throttle({
    short: { ttl: 1000, limit: 1 },
    medium: { ttl: 60000, limit: 10 },
  })
  async tokenRefresh(
    @Body() body: TokenRefreshDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.tokenRefreshUsecase.execute({
      refreshToken: body.refreshToken,
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(
    @Req() req: Request & { user?: { userAuthId: string } },
    @Body() body: LogoutDto,
  ): Promise<{ message: string }> {
    return this.logoutUsecase.execute({
      userAuthId: req.user!.userAuthId,
      refreshToken: body.refreshToken,
      fcmToken: body.fcmToken,
    });
  }
}
