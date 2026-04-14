import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserController } from 'src/user/user.controller';
import { GetProfileUsecase } from 'src/user/application/get-profile.usecase';
import { UpdateSettingsUsecase } from 'src/user/application/update-settings.usecase';
import { CompleteOnboardingUsecase } from 'src/user/application/complete-onboarding.usecase';
import { RegisterDeviceUsecase } from 'src/notification/application/register-device.usecase';
import { UserRepository } from 'src/user/infrastructure/user.repository';
import { JwtStrategy } from 'src/auth/infrastructure/jwt.strategy';

const TEST_JWT_SECRET = 'test-jwt-secret';

describe('UserController (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockGetProfileUsecase = {
    execute: jest.fn(),
  };

  const mockUpdateSettingsUsecase = {
    execute: jest.fn(),
  };

  const mockCompleteOnboardingUsecase = {
    execute: jest.fn(),
  };

  const mockRegisterDeviceUsecase = {
    execute: jest.fn(),
  };

  const mockUserRepository = {
    findByUserAuthId: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [UserController],
      providers: [
        { provide: GetProfileUsecase, useValue: mockGetProfileUsecase },
        {
          provide: UpdateSettingsUsecase,
          useValue: mockUpdateSettingsUsecase,
        },
        {
          provide: CompleteOnboardingUsecase,
          useValue: mockCompleteOnboardingUsecase,
        },
        {
          provide: RegisterDeviceUsecase,
          useValue: mockRegisterDeviceUsecase,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: () => TEST_JWT_SECRET,
            getOrThrow: () => TEST_JWT_SECRET,
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
    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createValidToken(): string {
    return jwtService.sign(
      { sub: 'test-user-auth-id', type: 'access' },
      { secret: TEST_JWT_SECRET },
    );
  }

  describe('GET /users/me', () => {
    it('should return user profile (200)', async () => {
      const mockProfile = {
        id: 'user-id-1',
        userName: '홍길동',
        planTime: '08:00',
        reviewTime: '22:00',
        timezone: 'Asia/Seoul',
        language: 'ko',
      };

      mockGetProfileUsecase.execute.mockResolvedValue(mockProfile);

      const response = await request(app.getHttpServer() as App)
        .get('/users/me')
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('user-id-1');
      expect(response.body.userName).toBe('홍길동');
      expect(response.body.planTime).toBe('08:00');
      expect(response.body.reviewTime).toBe('22:00');
      expect(response.body.timezone).toBe('Asia/Seoul');
      expect(response.body.language).toBe('ko');
    });

    it('should return profile with null time fields', async () => {
      const mockProfile = {
        id: 'user-id-1',
        userName: 'User',
        planTime: null,
        reviewTime: null,
        timezone: 'UTC',
        language: 'en',
      };

      mockGetProfileUsecase.execute.mockResolvedValue(mockProfile);

      const response = await request(app.getHttpServer() as App)
        .get('/users/me')
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.planTime).toBeNull();
      expect(response.body.reviewTime).toBeNull();
    });

    it('should return 401 without auth header', async () => {
      const response = await request(app.getHttpServer() as App).get(
        '/users/me',
      );

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent user', async () => {
      mockGetProfileUsecase.execute.mockRejectedValue({
        statusCode: 404,
        code: 'NOT_FOUND',
      });

      const response = await request(app.getHttpServer() as App)
        .get('/users/me')
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /users/me/settings', () => {
    it('should update userName and return updated profile (200)', async () => {
      const updatedProfile = {
        id: 'user-id-1',
        userName: '김철수',
        planTime: '08:00',
        reviewTime: '22:00',
        timezone: 'Asia/Seoul',
        language: 'ko',
      };

      mockUpdateSettingsUsecase.execute.mockResolvedValue(updatedProfile);

      const response = await request(app.getHttpServer() as App)
        .patch('/users/me/settings')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ userName: '김철수' });

      expect(response.status).toBe(200);
      expect(response.body.userName).toBe('김철수');
    });

    it('should update planTime (200)', async () => {
      const updatedProfile = {
        id: 'user-id-1',
        userName: '홍길동',
        planTime: '09:00',
        reviewTime: '22:00',
        timezone: 'Asia/Seoul',
        language: 'ko',
      };

      mockUpdateSettingsUsecase.execute.mockResolvedValue(updatedProfile);

      const response = await request(app.getHttpServer() as App)
        .patch('/users/me/settings')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ planTime: '09:00' });

      expect(response.status).toBe(200);
      expect(response.body.planTime).toBe('09:00');
    });

    it('should set planTime to null (disable notification)', async () => {
      const updatedProfile = {
        id: 'user-id-1',
        userName: '홍길동',
        planTime: null,
        reviewTime: '22:00',
        timezone: 'Asia/Seoul',
        language: 'ko',
      };

      mockUpdateSettingsUsecase.execute.mockResolvedValue(updatedProfile);

      const response = await request(app.getHttpServer() as App)
        .patch('/users/me/settings')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ planTime: null });

      expect(response.status).toBe(200);
      expect(response.body.planTime).toBeNull();
    });

    it('should update multiple fields (onboarding)', async () => {
      const updatedProfile = {
        id: 'user-id-1',
        userName: '홍길동',
        planTime: '07:00',
        reviewTime: '23:00',
        timezone: 'Asia/Tokyo',
        language: 'ko',
      };

      mockUpdateSettingsUsecase.execute.mockResolvedValue(updatedProfile);

      const response = await request(app.getHttpServer() as App)
        .patch('/users/me/settings')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({
          planTime: '07:00',
          reviewTime: '23:00',
          timezone: 'Asia/Tokyo',
        });

      expect(response.status).toBe(200);
      expect(response.body.planTime).toBe('07:00');
      expect(response.body.reviewTime).toBe('23:00');
      expect(response.body.timezone).toBe('Asia/Tokyo');
    });

    it('should return 400 for invalid time format', async () => {
      mockUpdateSettingsUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'INVALID_TIME_FORMAT',
      });

      const response = await request(app.getHttpServer() as App)
        .patch('/users/me/settings')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ planTime: 'invalid' });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid timezone', async () => {
      mockUpdateSettingsUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'INVALID_TIMEZONE',
      });

      const response = await request(app.getHttpServer() as App)
        .patch('/users/me/settings')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ timezone: 'Invalid/Zone' });

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth header', async () => {
      const response = await request(app.getHttpServer() as App)
        .patch('/users/me/settings')
        .send({ userName: 'Test' });

      expect(response.status).toBe(401);
    });
  });
});
