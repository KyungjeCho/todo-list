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
import { ConfigService } from '@nestjs/config';
import { OAuthLoginUsecase } from './application/oauth-login.usecase';
import { OAuthCallbackUsecase } from './application/oauth-callback.usecase';
import { TokenRefreshUsecase } from './application/token-refresh.usecase';
import { LogoutUsecase } from './application/logout.usecase';
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

  private static readonly ALLOWED_REDIRECT_SCHEMES = [
    'todolist://',
    'exp://',
  ];
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

    const stateData = verified as {
      fcmToken?: string;
      deviceType?: string;
      deviceName?: string;
      redirectUri?: string;
    };

    const userProfile = await this.oauthProviderService.exchangeCodeForProfile(
      provider,
      code,
    );

    const result = await this.oauthCallbackUsecase.execute({
      provider: userProfile.provider,
      providerUserId: userProfile.providerUserId,
      providerUserEmail: userProfile.providerUserEmail,
      providerUserName: userProfile.providerUserName,
      fcmToken: stateData.fcmToken || '',
      deviceType: (stateData.deviceType as 'IOS' | 'ANDROID') || 'IOS',
      deviceName: stateData.deviceName,
      userAgent: req.headers['user-agent'] ?? undefined,
      ipAddress: req.ip ?? undefined,
    });

    const clientRedirectUri = this.validateRedirectUri(stateData.redirectUri);
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      isNewUser: String(result.isNewUser),
    });
    res.redirect(302, `${clientRedirectUri}?${params.toString()}`);
  }

  private validateRedirectUri(uri: string | undefined): string {
    if (!uri) {
      return AuthController.DEFAULT_REDIRECT_URI;
    }
    const isAllowed = AuthController.ALLOWED_REDIRECT_SCHEMES.some((scheme) =>
      uri.startsWith(scheme),
    );
    if (!isAllowed) {
      return AuthController.DEFAULT_REDIRECT_URI;
    }
    return uri;
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
    @Req() req: Request & { user?: { userAuthId: string } },
    @Body() body: { refreshToken: string; fcmToken: string },
  ): Promise<{ message: string }> {
    return this.logoutUsecase.execute({
      userAuthId: req.user!.userAuthId,
      refreshToken: body.refreshToken,
      fcmToken: body.fcmToken,
    });
  }
}
