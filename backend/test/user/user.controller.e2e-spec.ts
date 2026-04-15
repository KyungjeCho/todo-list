import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { UserController } from 'src/user/user.controller';
import { GetProfileUsecase } from 'src/user/application/get-profile.usecase';
import { UpdateSettingsUsecase } from 'src/user/application/update-settings.usecase';
import { CompleteOnboardingUsecase } from 'src/user/application/complete-onboarding.usecase';
import { RegisterDeviceUsecase } from 'src/notification/application/register-device.usecase';
import { UserRepository } from 'src/user/infrastructure/user.repository';
import { JwtStrategy } from 'src/auth/infrastructure/jwt.strategy';

const TEST_JWT_SECRET = 'test-e2e-secret';
const TEST_USER_ID = 'e2e-user-onboarding-001';

describe('UserController E2E — POST /users/me/onboarding/complete', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let accessToken: string;

  const mockGetProfile = { execute: jest.fn() };
  const mockUpdateSettings = { execute: jest.fn() };
  const mockCompleteOnboarding = { execute: jest.fn() };
  const mockRegisterDevice = { execute: jest.fn() };
  const mockUserRepository = { findByUserAuthId: jest.fn() };

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
        { provide: GetProfileUsecase, useValue: mockGetProfile },
        { provide: UpdateSettingsUsecase, useValue: mockUpdateSettings },
        {
          provide: CompleteOnboardingUsecase,
          useValue: mockCompleteOnboarding,
        },
        { provide: RegisterDeviceUsecase, useValue: mockRegisterDevice },
        { provide: UserRepository, useValue: mockUserRepository },
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'jwt.secret') return TEST_JWT_SECRET;
              return undefined;
            },
            getOrThrow: (key: string) => {
              if (key === 'jwt.secret') return TEST_JWT_SECRET;
              throw new Error(`Missing config: ${key}`);
            },
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    accessToken = jwtService.sign({ sub: TEST_USER_ID, type: 'access' });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const profileTrue = {
    id: TEST_USER_ID,
    userName: 'E2E User',
    planTime: '08:00:00',
    reviewTime: '22:00:00',
    timezone: 'Asia/Seoul',
    language: 'ko',
    hasCompletedOnboarding: true,
  };

  it('C1: 미완료 사용자 → 200 + hasCompletedOnboarding:true', async () => {
    mockCompleteOnboarding.execute.mockResolvedValue(profileTrue);

    const res = await request(app.getHttpServer() as App)
      .post('/users/me/onboarding/complete')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(
      res.body.hasCompletedOnboarding ?? res.body.data?.hasCompletedOnboarding,
    ).toBe(true);
    expect(mockCompleteOnboarding.execute).toHaveBeenCalledWith({
      userAuthId: TEST_USER_ID,
    });
  });

  it('C2: 이미 완료된 사용자 → 200 멱등 반환', async () => {
    mockCompleteOnboarding.execute.mockResolvedValue(profileTrue);

    const res = await request(app.getHttpServer() as App)
      .post('/users/me/onboarding/complete')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(
      res.body.hasCompletedOnboarding ?? res.body.data?.hasCompletedOnboarding,
    ).toBe(true);
  });

  it('C3: 인증 없음 → 401', async () => {
    await request(app.getHttpServer() as App)
      .post('/users/me/onboarding/complete')
      .expect(401);
  });

  it('C4: 매핑 사용자 없음 → 404 NOT_FOUND', async () => {
    const { NotFoundException } = await import('@nestjs/common');
    mockCompleteOnboarding.execute.mockRejectedValue(
      new NotFoundException('NOT_FOUND'),
    );

    const res = await request(app.getHttpServer() as App)
      .post('/users/me/onboarding/complete')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    const body = res.body as { message?: string };
    expect((body.message ?? '').toUpperCase()).toContain('NOT_FOUND');
  });

  it('C5: 본문에 임의 JSON 포함 시 200 (추가 필드 무시)', async () => {
    mockCompleteOnboarding.execute.mockResolvedValue(profileTrue);

    await request(app.getHttpServer() as App)
      .post('/users/me/onboarding/complete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ foo: 1, bar: 'baz' })
      .expect(200);

    expect(mockCompleteOnboarding.execute).toHaveBeenCalledWith({
      userAuthId: TEST_USER_ID,
    });
  });
});
