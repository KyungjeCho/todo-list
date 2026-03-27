import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import type { App } from 'supertest/types';
import { AuthController } from 'src/auth/auth.controller';
import { OAuthLoginUsecase } from 'src/auth/application/oauth-login.usecase';
import { OAuthCallbackUsecase } from 'src/auth/application/oauth-callback.usecase';
import { TokenRefreshUsecase } from 'src/auth/application/token-refresh.usecase';
import { LogoutUsecase } from 'src/auth/application/logout.usecase';

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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: OAuthLoginUsecase, useValue: mockOAuthLoginUsecase },
        { provide: OAuthCallbackUsecase, useValue: mockOAuthCallbackUsecase },
        { provide: TokenRefreshUsecase, useValue: mockTokenRefreshUsecase },
        { provide: LogoutUsecase, useValue: mockLogoutUsecase },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
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
    it('should redirect to app deep link with tokens (302)', async () => {
      mockOAuthCallbackUsecase.execute.mockResolvedValue({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        isNewUser: true,
      });

      const stateWithRedirect = Buffer.from(
        JSON.stringify({ redirectUri: 'exp://localhost/--/auth/callback' }),
      ).toString('base64');

      const response = await request(app.getHttpServer() as App)
        .get('/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state: stateWithRedirect });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('exp://localhost/--/auth/callback');
    });

    it('should include isNewUser=true for new users', async () => {
      mockOAuthCallbackUsecase.execute.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        isNewUser: true,
      });

      const response = await request(app.getHttpServer() as App)
        .get('/auth/oauth/google/callback')
        .query({ code: 'auth-code-123', state: 'encoded-state' });

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
        .query({ code: 'auth-code-123', state: 'encoded-state' });

      expect(response.headers.location).toContain('isNewUser=false');
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

      const response = await request(app.getHttpServer() as App)
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid-access-token')
        .send({
          refreshToken: 'valid-refresh-token',
          fcmToken: 'fcm-token-123',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Successfully logged out');
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
