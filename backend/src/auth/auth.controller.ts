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
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { OAuthLoginUsecase } from './application/oauth-login.usecase';
import { OAuthCallbackUsecase } from './application/oauth-callback.usecase';
import { TokenRefreshUsecase } from './application/token-refresh.usecase';
import { LogoutUsecase } from './application/logout.usecase';
import {
  TokenRefreshDto,
  LogoutDto,
  AppleFormPostCallbackDto,
} from './application/dto';
import { JwtAuthGuard } from './infrastructure/jwt-auth.guard';
import { OAuthProviderService } from './infrastructure/oauth-provider.service';
import { parseAppleUserField } from './infrastructure/apple/apple-user-field.parser';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

@Controller('auth')
@UseFilters(new HttpExceptionFilter())
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly oauthLoginUsecase: OAuthLoginUsecase,
    private readonly oauthCallbackUsecase: OAuthCallbackUsecase,
    private readonly tokenRefreshUsecase: TokenRefreshUsecase,
    private readonly logoutUsecase: LogoutUsecase,
    private readonly oauthProviderService: OAuthProviderService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * OAuth 로그인을 시작하여 프로바이더 인증 페이지로 리다이렉트한다.
   * @param provider - OAuth 프로바이더 (google, naver, kakao, apple)
   * @param fcmToken - FCM 푸시 토큰 (선택)
   * @param deviceType - 디바이스 타입 (IOS, ANDROID)
   * @param redirectUri - 인증 완료 후 리다이렉트 URI
   * @param deviceName - 디바이스 이름 (선택)
   * @param timezone - 클라이언트 타임존 (선택)
   * @param language - 클라이언트 언어 (선택)
   * @param res - HTTP 응답 (302 리다이렉트)
   */
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

  /**
   * OAuth 프로바이더 콜백을 처리하여 토큰을 발급하고 클라이언트로 리다이렉트한다.
   * @param provider - OAuth 프로바이더
   * @param code - 인가 코드
   * @param state - CSRF 방지용 state 파라미터
   * @param req - HTTP 요청 (user-agent, IP 추출)
   * @param res - HTTP 응답 (토큰 포함 리다이렉트)
   */
  @Get('oauth/:provider/callback')
  async oauthCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // WHY(FR-002, T039): Apple은 반드시 `response_mode=form_post` POST 콜백만 지원한다.
    // GET 경로로 들어오면 Apple이 절대 호출하지 않은 흐름이므로 거부하여
    // 잘못 구성된 트래픽을 조기에 차단하고 운영 로그에 명확한 에러 코드를 남긴다.
    if (provider === 'apple') {
      throw new BadRequestException('APPLE_MUST_USE_FORM_POST');
    }

    if (!code) {
      throw new BadRequestException('MISSING_AUTHORIZATION_CODE');
    }

    const stateSecret =
      this.configService.getOrThrow<string>('oauth.stateSecret');
    const verified = OAuthLoginUsecase.verifyState(state || '', stateSecret);
    if (!verified) {
      throw new BadRequestException('INVALID_STATE');
    }

    // WHY: state 디코딩 후 필수 필드 타입 검증 — 악의적 state로 undefined 캐스팅 방지.
    // HMAC 서명은 위변조를 막지만 페이로드 구조까지 보장하지 않으므로
    // 런타임 타입 체크로 이후 as 캐스팅의 안전성을 확보한다.
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

  /**
   * Apple OAuth form_post 콜백을 처리한다.
   * WHY(FR-001, FR-005): Apple은 `response_mode=form_post` 지정 시 인증 결과를
   * POST `application/x-www-form-urlencoded`로 전달하며, 첫 로그인 1회에 한해
   * `user` 필드에 이름 JSON을 포함한다. GET 콜백은 Apple 스펙상 지원되지 않으므로
   * 별도 POST 핸들러로 분리하고, 기존 GET 핸들러의 Apple 가드는 T039에서 처리.
   */
  @Post('oauth/apple/callback')
  async oauthAppleCallback(
    @Body() body: AppleFormPostCallbackDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const stateSecret =
      this.configService.getOrThrow<string>('oauth.stateSecret');
    const verified = OAuthLoginUsecase.verifyState(body.state, stateSecret);
    if (!verified) {
      throw new BadRequestException('INVALID_STATE');
    }

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

    // WHY(P1): Apple 취소/권한 거부/서버 오류는 form_post의 `error` 필드로 전달된다.
    // 토큰 교환을 시도하지 말고 state가 지정한 클라이언트 딥링크 fragment에 error를
    // 실어 302로 반환하여 WebBrowser 세션을 즉시 닫고 프론트엔드 useAuth가
    // i18n 키로 매핑할 수 있도록 한다. error_description은 로그·응답에 원문 그대로
    // 싣지 않는다 (프로바이더 측 문구가 영어로 고정되어 있어 i18n을 깨기 때문).
    if (body.error) {
      this.logger.log(
        JSON.stringify({
          provider: 'apple',
          event: 'login_error',
          error: body.error,
        }),
      );
      const clientRedirectUri = this.validateRedirectUri(
        stateData.redirectUri as string | undefined,
      );
      const params = new URLSearchParams({ error: body.error });
      res.redirect(302, `${clientRedirectUri}#${params.toString()}`);
      return;
    }

    if (!body.code) {
      throw new BadRequestException('MISSING_AUTHORIZATION_CODE');
    }

    const userProfile = await this.oauthProviderService.exchangeCodeForProfile(
      'apple',
      body.code,
      body.state,
    );

    // WHY(FR-006): Apple `user` 필드는 최초 로그인 1회에만 제공된다.
    // 파싱 실패·누락 시 빈 문자열을 반환해 OAuthCallbackUsecase의 email local-part 폴백으로 위임.
    const parsedName = parseAppleUserField(body.user);

    const result = await this.oauthCallbackUsecase.execute({
      provider: userProfile.provider,
      providerUserId: userProfile.providerUserId,
      providerUserEmail: userProfile.providerUserEmail,
      providerUserName: parsedName || userProfile.providerUserName,
      fcmToken: (stateData.fcmToken as string) || undefined,
      deviceType: (deviceType as 'IOS' | 'ANDROID') || 'IOS',
      deviceName: stateData.deviceName as string | undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
      ipAddress: req.ip ?? undefined,
      timezone: stateData.timezone as string | undefined,
      language: stateData.language as string | undefined,
    });

    // WHY(FR-015, T031): 운영 관측성 — Apple 콜백 결과를 구조화 로그로 남긴다.
    // 민감 정보(code, id_token, email, sub 전체)는 절대 포함하지 않고,
    // `event`(login_new/login_returning)와 프로바이더만 기록한다.
    this.logger.log(
      JSON.stringify({
        provider: 'apple',
        event: result.isNewUser ? 'login_new' : 'login_returning',
      }),
    );

    const clientRedirectUri = this.validateRedirectUri(
      stateData.redirectUri as string | undefined,
    );
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      isNewUser: String(result.isNewUser),
    });
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
  // WHY: 토큰 갱신은 초당 1회, 분당 10회로 제한하여
  // 탈취된 refresh token을 이용한 대량 갱신 시도를 차단한다.
  @Throttle({
    short: { ttl: 1000, limit: 1 },
    medium: { ttl: 60000, limit: 10 },
  })
  /**
   * refresh token으로 새 access/refresh 토큰 쌍을 발급한다.
   * @param body - 기존 refresh token
   * @returns 새 accessToken, refreshToken
   */
  async tokenRefresh(
    @Body() body: TokenRefreshDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.tokenRefreshUsecase.execute({
      refreshToken: body.refreshToken,
    });
  }

  /**
   * 로그아웃하여 세션을 삭제하고 FCM 디바이스를 해제한다.
   * @param req - 인증된 요청 (userAuthId 포함)
   * @param body - refresh token과 FCM token
   * @returns 로그아웃 결과 메시지
   */
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
