import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from 'src/auth/auth.controller';
import { OAuthLoginUsecase } from 'src/auth/application/oauth-login.usecase';
import { OAuthCallbackUsecase } from 'src/auth/application/oauth-callback.usecase';
import { TokenRefreshUsecase } from 'src/auth/application/token-refresh.usecase';
import { LogoutUsecase } from 'src/auth/application/logout.usecase';
import { OAuthProviderService } from 'src/auth/infrastructure/oauth-provider.service';
import { JwtStrategy } from 'src/auth/infrastructure/jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

const TEST_JWT_SECRET = 'test-jwt-secret';
const TEST_STATE_SECRET = 'test-state-secret';

function signTestState(payload: Record<string, unknown>): string {
  return OAuthLoginUsecase.signState(payload, TEST_STATE_SECRET);
}

describe('AuthController (Integration)', () => {
  let app: INestApplication;

  const mockOAuthLoginUsecase = {
    execute: jest.fn(),
  };

  const mockOAuthCallbackUsecase = {
    execute: jest.fn(),
  };

  const mockTokenRefreshUsecase = {
    execute: jest.fn(),
  };

  const mockLogoutUsecase = {
    execute: jest.fn(),
  };

  const mockOAuthProviderService = {
    exchangeCodeForProfile: jest.fn(),
  };

  let jwtService: JwtService;

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

    jwtService = moduleFixture.get(JwtService);

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

  describe('GET /auth/oauth/:provider', () => {
    it('should redirect to OAuth provider (302)', async () => {
      mockOAuthLoginUsecase.execute.mockResolvedValue({
        redirectUrl: 'https://accounts.google.com/o/oauth2/auth?...',
      });

      const response = await request(app.getHttpServer() as App)
        .get('/auth/oauth/google')
        .query({ fcmToken: 'fcm-123', deviceType: 'IOS' });

      expect(response.status).toBe(302);
    });

    it('should return 400 for invalid provider', async () => {
      mockOAuthLoginUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'INVALID_PROVIDER',
      });

      const response = await request(app.getHttpServer() as App)
        .get('/auth/oauth/invalid')
        .query({ fcmToken: 'fcm-123', deviceType: 'IOS' });

      expect(response.status).toBe(400);
    });

    it('should accept google provider', async () => {
      mockOAuthLoginUsecase.execute.mockResolvedValue({
        redirectUrl: 'https://accounts.google.com/...',
      });

      const response = await request(app.getHttpServer() as App)
        .get('/auth/oauth/google')
        .query({ fcmToken: 'fcm-123', deviceType: 'IOS' });

      expect([200, 302]).toContain(response.status);
    });

    it('should accept naver provider', async () => {
      mockOAuthLoginUsecase.execute.mockResolvedValue({
        redirectUrl: 'https://nid.naver.com/...',
      });

      const response = await request(app.getHttpServer() as App)
        .get('/auth/oauth/naver')
        .query({ fcmToken: 'fcm-123', deviceType: 'ANDROID' });

      expect([200, 302]).toContain(response.status);
    });

    it('should accept kakao provider', async () => {
      mockOAuthLoginUsecase.execute.mockResolvedValue({
        redirectUrl: 'https://kauth.kakao.com/...',
      });

      const response = await request(app.getHttpServer() as App)
        .get('/auth/oauth/kakao')
        .query({ fcmToken: 'fcm-123', deviceType: 'IOS' });

      expect([200, 302]).toContain(response.status);
    });

    it('should accept apple provider', async () => {
      mockOAuthLoginUsecase.execute.mockResolvedValue({
        redirectUrl: 'https://appleid.apple.com/...',
      });

      const response = await request(app.getHttpServer() as App)
        .get('/auth/oauth/apple')
        .query({ fcmToken: 'fcm-123', deviceType: 'IOS' });

      expect([200, 302]).toContain(response.status);
    });
  });

  describe('GET /auth/oauth/:provider/callback', () => {
    const mockProfile = {
      provider: 'google',
      providerUserId: 'google-uid-123',
      providerUserEmail: 'user@gmail.com',
      providerUserName: 'Test User',
    };

    beforeEach(() => {
      mockOAuthProviderService.exchangeCodeForProfile.mockResolvedValue(
        mockProfile,
      );
    });

    it('should redirect to default deep link with tokens (302)', async () => {
      mockOAuthCallbackUsecase.execute.mockResolvedValue({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        isNewUser: true,
      });

      const stateWithRedirect = signTestState({
        redirectUri: 'todolist://auth/callback',
      });

      const response = await request(app.getHttpServer() as App)
        .get('/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state: stateWithRedirect });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('todolist://auth/callback');
    });

    it('should fall back to default redirect for disallowed scheme', async () => {
      mockOAuthCallbackUsecase.execute.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        isNewUser: true,
      });

      const stateWithBadUri = signTestState({
        redirectUri: 'https://evil.com/steal',
      });

      const response = await request(app.getHttpServer() as App)
        .get('/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state: stateWithBadUri });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('todolist://auth/callback');
      expect(response.headers.location).not.toContain('evil.com');
    });

    it('should reject arbitrary exp:// URI not in whitelist', async () => {
      mockOAuthCallbackUsecase.execute.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        isNewUser: false,
      });

      const stateWithExpUri = signTestState({
        redirectUri: 'exp://192.168.1.100:8081/auth/callback',
      });

      const response = await request(app.getHttpServer() as App)
        .get('/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state: stateWithExpUri });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('todolist://auth/callback');
      expect(response.headers.location).not.toContain('exp://');
    });

    it('should reject todolist:// URI with unexpected path', async () => {
      mockOAuthCallbackUsecase.execute.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        isNewUser: false,
      });

      const stateWithBadPath = signTestState({
        redirectUri: 'todolist://malicious-host/steal',
      });

      const response = await request(app.getHttpServer() as App)
        .get('/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state: stateWithBadPath });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('todolist://auth/callback');
      expect(response.headers.location).not.toContain('malicious-host');
    });

    it('should include isNewUser=true for new users', async () => {
      mockOAuthCallbackUsecase.execute.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        isNewUser: true,
      });

      const response = await request(app.getHttpServer() as App)
        .get('/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state: signTestState({}) });

      expect(response.headers.location).toContain('isNewUser=true');
    });

    it('should include isNewUser=false for existing users', async () => {
      mockOAuthCallbackUsecase.execute.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        isNewUser: false,
      });

      const response = await request(app.getHttpServer() as App)
        .get('/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state: signTestState({}) });

      expect(response.headers.location).toContain('isNewUser=false');
    });

    it('should call OAuthProviderService to exchange code', async () => {
      mockOAuthCallbackUsecase.execute.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        isNewUser: false,
      });

      const state = signTestState({});
      await request(app.getHttpServer() as App)
        .get('/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state });

      expect(
        mockOAuthProviderService.exchangeCodeForProfile,
      ).toHaveBeenCalledWith('google', 'auth-code-123', state);
    });
  });

  describe('POST /auth/token/refresh', () => {
    it('should return new token pair (200)', async () => {
      mockTokenRefreshUsecase.execute.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const response = await request(app.getHttpServer() as App)
        .post('/auth/token/refresh')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBe('new-access-token');
      expect(response.body.refreshToken).toBe('new-refresh-token');
    });

    it('should return 401 for invalid refresh token', async () => {
      mockTokenRefreshUsecase.execute.mockRejectedValue({
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });

      const response = await request(app.getHttpServer() as App)
        .post('/auth/token/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing refreshToken', async () => {
      const response = await request(app.getHttpServer() as App)
        .post('/auth/token/refresh')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/logout', () => {
    it('should return success message (200)', async () => {
      mockLogoutUsecase.execute.mockResolvedValue({
        message: 'Successfully logged out',
      });

      const validToken = jwtService.sign(
        { sub: 'test-user-auth-id', type: 'access' },
        { secret: TEST_JWT_SECRET },
      );

      const response = await request(app.getHttpServer() as App)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          refreshToken: 'valid-refresh-token',
          fcmToken: 'fcm-token-123',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Successfully logged out');
      expect(mockLogoutUsecase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userAuthId: 'test-user-auth-id',
        }),
      );
    });

    it('should return 401 without auth header', async () => {
      const response = await request(app.getHttpServer() as App)
        .post('/auth/logout')
        .send({
          refreshToken: 'valid-refresh-token',
          fcmToken: 'fcm-token-123',
        });

      expect(response.status).toBe(401);
    });
  });
});
