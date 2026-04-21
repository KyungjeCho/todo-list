import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from 'src/auth/auth.controller';
import { OAuthLoginUsecase } from 'src/auth/application/oauth-login.usecase';
import { OAuthCallbackUsecase } from 'src/auth/application/oauth-callback.usecase';
import { TokenRefreshUsecase } from 'src/auth/application/token-refresh.usecase';
import { LogoutUsecase } from 'src/auth/application/logout.usecase';
import { OAuthProviderService } from 'src/auth/infrastructure/oauth-provider.service';
import { JwtStrategy } from 'src/auth/infrastructure/jwt.strategy';

const TEST_JWT_SECRET = 'test-jwt-secret';
const TEST_STATE_SECRET = 'test-state-secret';

function signTestState(payload: Record<string, unknown>): string {
  return OAuthLoginUsecase.signState(payload, TEST_STATE_SECRET);
}

describe('Apple OAuth POST callback (Integration — US1)', () => {
  let app: INestApplication;

  const mockOAuthLoginUsecase = { execute: jest.fn() };
  const mockOAuthCallbackUsecase = { execute: jest.fn() };
  const mockTokenRefreshUsecase = { execute: jest.fn() };
  const mockLogoutUsecase = { execute: jest.fn() };
  const mockOAuthProviderService = { exchangeCodeForProfile: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        { provide: OAuthLoginUsecase, useValue: mockOAuthLoginUsecase },
        { provide: OAuthCallbackUsecase, useValue: mockOAuthCallbackUsecase },
        { provide: TokenRefreshUsecase, useValue: mockTokenRefreshUsecase },
        { provide: LogoutUsecase, useValue: mockLogoutUsecase },
        { provide: OAuthProviderService, useValue: mockOAuthProviderService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'oauth.stateSecret') return TEST_STATE_SECRET;
              return TEST_JWT_SECRET;
            },
            getOrThrow: (key: string) => {
              if (key === 'oauth.stateSecret') return TEST_STATE_SECRET;
              return TEST_JWT_SECRET;
            },
          },
        },
        JwtStrategy,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // T017 — 유효 state + code + user(JSON) → 302 리다이렉트, isNewUser=true
  it('신규 로그인: user JSON을 파싱하여 providerUserName에 주입', async () => {
    mockOAuthProviderService.exchangeCodeForProfile.mockResolvedValue({
      provider: 'apple',
      providerUserId: 'apple-sub-123',
      providerUserEmail: 'private@privaterelay.appleid.com',
      providerUserName: '',
    });
    mockOAuthCallbackUsecase.execute.mockResolvedValue({
      accessToken: 'access-token-new',
      refreshToken: 'refresh-token-new',
      isNewUser: true,
    });

    const state = signTestState({ redirectUri: 'todolist://auth/callback' });
    const userJson = JSON.stringify({
      name: { firstName: 'Kim', lastName: 'Minji' },
      email: 'private@privaterelay.appleid.com',
    });

    const response = await request(app.getHttpServer() as App)
      .post('/auth/oauth/apple/callback')
      .type('form')
      .send({ code: 'apple-auth-code', state, user: userJson });

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('todolist://auth/callback');
    expect(response.headers.location).toContain('isNewUser=true');
    expect(mockOAuthCallbackUsecase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'apple',
        providerUserId: 'apple-sub-123',
        providerUserName: 'Kim Minji',
      }),
    );
  });

  // T027 — 기존 Apple 사용자 재로그인 (isNewUser=false, 이름 불변)
  it('재로그인: 기존 sub 존재 → isNewUser=false, providerUserName 미전달로 이름 보존', async () => {
    mockOAuthProviderService.exchangeCodeForProfile.mockResolvedValue({
      provider: 'apple',
      providerUserId: 'apple-sub-existing',
      providerUserEmail: 'existing@privaterelay.appleid.com',
      providerUserName: '',
    });
    // WHY(US2): 재로그인 시 Apple은 `user` 필드를 생략한다. usecase가 이미
    // 저장된 사용자 레코드를 `(provider, sub)`로 찾아 반환하고, 이름/이메일을
    // 덮어쓰지 않아야 한다. 여기서는 mocked usecase가 isNewUser=false를 반환.
    mockOAuthCallbackUsecase.execute.mockResolvedValue({
      accessToken: 'access-token-returning',
      refreshToken: 'refresh-token-returning',
      isNewUser: false,
    });

    const state = signTestState({ redirectUri: 'todolist://auth/callback' });

    const response = await request(app.getHttpServer() as App)
      .post('/auth/oauth/apple/callback')
      .type('form')
      .send({ code: 'apple-auth-code-2', state });

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('isNewUser=false');
    expect(mockOAuthCallbackUsecase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'apple',
        providerUserId: 'apple-sub-existing',
        providerUserName: '',
      }),
    );
  });

  // T028 — 재로그인 시 user 필드와 email 모두 누락해도 sub만으로 기존 사용자 식별
  it('재로그인: user 필드·email 모두 누락 → sub만으로 식별', async () => {
    mockOAuthProviderService.exchangeCodeForProfile.mockResolvedValue({
      provider: 'apple',
      providerUserId: 'apple-sub-minimal',
      providerUserEmail: '',
      providerUserName: '',
    });
    mockOAuthCallbackUsecase.execute.mockResolvedValue({
      accessToken: 'access-token-minimal',
      refreshToken: 'refresh-token-minimal',
      isNewUser: false,
    });

    const state = signTestState({ redirectUri: 'todolist://auth/callback' });

    const response = await request(app.getHttpServer() as App)
      .post('/auth/oauth/apple/callback')
      .type('form')
      .send({ code: 'apple-auth-code-min', state });

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('isNewUser=false');
    // WHY(US2): sub(=providerUserId)만으로 기존 UserOauth를 찾을 수 있어야 한다.
    // providerUserEmail/Name은 빈 문자열로 usecase에 전달되지만,
    // existingOauth 분기에서는 이 값들이 DB 업데이트에 사용되지 않는다.
    expect(mockOAuthCallbackUsecase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'apple',
        providerUserId: 'apple-sub-minimal',
        providerUserEmail: '',
        providerUserName: '',
      }),
    );
  });

  // T033 [US3] — Apple 토큰 엔드포인트가 non-2xx → 400 OAUTH_CODE_EXCHANGE_FAILED
  it('에러: Apple 토큰 교환 실패 → 400 OAUTH_CODE_EXCHANGE_FAILED', async () => {
    mockOAuthProviderService.exchangeCodeForProfile.mockRejectedValue(
      new BadRequestException('OAUTH_CODE_EXCHANGE_FAILED'),
    );

    const state = signTestState({});

    const response = await request(app.getHttpServer() as App)
      .post('/auth/oauth/apple/callback')
      .type('form')
      .send({ code: 'bad-code', state });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('OAUTH_CODE_EXCHANGE_FAILED');
    // WHY(SC-006): 민감 정보(code, state 원문, id_token)는 응답에 노출되지 않는다.
    expect(JSON.stringify(response.body)).not.toContain('bad-code');
  });

  // T034 [US3] — id_token 검증 실패 (aud 불일치, exp 초과) → 400 APPLE_ID_TOKEN_INVALID
  it('에러: id_token 검증 실패 → 400 APPLE_ID_TOKEN_INVALID', async () => {
    mockOAuthProviderService.exchangeCodeForProfile.mockRejectedValue(
      new BadRequestException('APPLE_ID_TOKEN_INVALID'),
    );

    const state = signTestState({});

    const response = await request(app.getHttpServer() as App)
      .post('/auth/oauth/apple/callback')
      .type('form')
      .send({ code: 'auth-code', state });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('APPLE_ID_TOKEN_INVALID');
  });

  // T035 [US3] — Apple private key 누락/무효 → 400 APPLE_CLIENT_SECRET_FAILED
  it('에러: client_secret 생성 실패 → 400 APPLE_CLIENT_SECRET_FAILED', async () => {
    mockOAuthProviderService.exchangeCodeForProfile.mockRejectedValue(
      new BadRequestException('APPLE_CLIENT_SECRET_FAILED'),
    );

    const state = signTestState({});

    const response = await request(app.getHttpServer() as App)
      .post('/auth/oauth/apple/callback')
      .type('form')
      .send({ code: 'auth-code', state });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('APPLE_CLIENT_SECRET_FAILED');
  });

  // T036 [US3] — GET /auth/oauth/apple/callback 진입 방지
  it('에러: GET 콜백 진입 → 400 APPLE_MUST_USE_FORM_POST', async () => {
    const state = signTestState({});

    const response = await request(app.getHttpServer() as App)
      .get('/auth/oauth/apple/callback')
      .query({ code: 'auth-code', state });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('APPLE_MUST_USE_FORM_POST');
  });

  // P1 — Apple 취소/에러 form_post 흐름: error 필드만 전달되어도 사용자가
  // 브라우저에 갇히지 않고 클라이언트 딥링크로 복귀할 수 있어야 한다.
  it('취소 흐름: error 필드 전달 → 302 리다이렉트(딥링크에 error 포함), 토큰 교환 호출 안 함', async () => {
    const state = signTestState({ redirectUri: 'todolist://auth/callback' });

    const response = await request(app.getHttpServer() as App)
      .post('/auth/oauth/apple/callback')
      .type('form')
      .send({
        state,
        error: 'user_cancelled_authorize',
        error_description: 'The user cancelled the authorization request.',
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('todolist://auth/callback');
    // WHY(P1): 프론트엔드 useAuth가 WebBrowser.openAuthSessionAsync 결과의
    // URL fragment에서 error를 읽어 i18n 키로 매핑할 수 있도록 fragment에 싣는다.
    expect(response.headers.location).toContain('#');
    expect(response.headers.location).toContain(
      'error=user_cancelled_authorize',
    );
    expect(
      mockOAuthProviderService.exchangeCodeForProfile,
    ).not.toHaveBeenCalled();
    expect(mockOAuthCallbackUsecase.execute).not.toHaveBeenCalled();
  });

  it('취소 흐름: error만 있고 state가 유효하지 않으면 400 INVALID_STATE', async () => {
    const response = await request(app.getHttpServer() as App)
      .post('/auth/oauth/apple/callback')
      .type('form')
      .send({ state: 'bogus', error: 'user_cancelled_authorize' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('INVALID_STATE');
  });

  it('code도 error도 없으면 400 MISSING_AUTHORIZATION_CODE', async () => {
    const state = signTestState({ redirectUri: 'todolist://auth/callback' });
    const response = await request(app.getHttpServer() as App)
      .post('/auth/oauth/apple/callback')
      .type('form')
      .send({ state });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('MISSING_AUTHORIZATION_CODE');
  });

  // T018 — user 필드 없이 첫 로그인 → email local-part fallback
  it('신규 로그인: user 필드 없음 → providerUserName 빈 문자열로 usecase에 전달', async () => {
    mockOAuthProviderService.exchangeCodeForProfile.mockResolvedValue({
      provider: 'apple',
      providerUserId: 'apple-sub-456',
      providerUserEmail: 'newuser@example.com',
      providerUserName: '',
    });
    mockOAuthCallbackUsecase.execute.mockResolvedValue({
      accessToken: 'access-token-new',
      refreshToken: 'refresh-token-new',
      isNewUser: true,
    });

    const state = signTestState({ redirectUri: 'todolist://auth/callback' });

    const response = await request(app.getHttpServer() as App)
      .post('/auth/oauth/apple/callback')
      .type('form')
      .send({ code: 'apple-auth-code', state });

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('isNewUser=true');
    // WHY: Apple의 2회차 이후 로그인이나 user 필드 누락 시, usecase는
    // providerUserName이 빈 문자열로 전달된 후 email local-part로 폴백 처리.
    expect(mockOAuthCallbackUsecase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'apple',
        providerUserId: 'apple-sub-456',
        providerUserName: '',
      }),
    );
  });
});
