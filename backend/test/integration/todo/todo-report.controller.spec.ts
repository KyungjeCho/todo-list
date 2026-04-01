import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TodoController } from 'src/todo/todo.controller';
import { CreateTodoUsecase } from 'src/todo/application/create-todo.usecase';
import { GetTodosUsecase } from 'src/todo/application/get-todos.usecase';
import { UpdateTodoUsecase } from 'src/todo/application/update-todo.usecase';
import { ChangeTodoStatusUsecase } from 'src/todo/application/change-todo-status.usecase';
import { DeleteTodoUsecase } from 'src/todo/application/delete-todo.usecase';
import { CompleteDayUsecase } from 'src/todo/application/complete-day.usecase';
import { GetMonthlySummaryUsecase } from 'src/todo/application/get-monthly-summary.usecase';
import { CreateVoiceTodoUsecase } from 'src/todo/application/create-voice-todo.usecase';
import { JwtStrategy } from 'src/auth/infrastructure/jwt.strategy';

const TEST_JWT_SECRET = 'test-jwt-secret';

describe('TodoReportController (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockCreateTodoUsecase = { execute: jest.fn() };
  const mockGetTodosUsecase = { execute: jest.fn() };
  const mockUpdateTodoUsecase = { execute: jest.fn() };
  const mockChangeTodoStatusUsecase = { execute: jest.fn() };
  const mockDeleteTodoUsecase = { execute: jest.fn() };
  const mockCompleteDayUsecase = { execute: jest.fn() };
  const mockGetMonthlySummaryUsecase = { execute: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [TodoController],
      providers: [
        { provide: CreateTodoUsecase, useValue: mockCreateTodoUsecase },
        { provide: GetTodosUsecase, useValue: mockGetTodosUsecase },
        { provide: UpdateTodoUsecase, useValue: mockUpdateTodoUsecase },
        {
          provide: ChangeTodoStatusUsecase,
          useValue: mockChangeTodoStatusUsecase,
        },
        { provide: DeleteTodoUsecase, useValue: mockDeleteTodoUsecase },
        { provide: CompleteDayUsecase, useValue: mockCompleteDayUsecase },
        {
          provide: GetMonthlySummaryUsecase,
          useValue: mockGetMonthlySummaryUsecase,
        },
        {
          provide: CreateVoiceTodoUsecase,
          useValue: { execute: jest.fn() },
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

  describe('GET /todos/report/summary', () => {
    const mockSummaryResponse = {
      year: 2026,
      month: 3,
      days: [
        {
          date: '2026-03-01',
          totalCount: 3,
          completedCount: 2,
          activeCount: 1,
          carriedOverCount: 0,
        },
        {
          date: '2026-03-15',
          totalCount: 5,
          completedCount: 3,
          activeCount: 2,
          carriedOverCount: 0,
        },
      ],
    };

    it('월별 요약을 반환한다 (200)', async () => {
      mockGetMonthlySummaryUsecase.execute.mockResolvedValue(
        mockSummaryResponse,
      );

      const response = await request(app.getHttpServer() as App)
        .get('/todos/report/summary')
        .query({ year: 2026, month: 3 })
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.year).toBe(2026);
      expect(response.body.month).toBe(3);
      expect(response.body.days).toHaveLength(2);
      expect(response.body.days[0].date).toBe('2026-03-01');
      expect(response.body.days[0].totalCount).toBe(3);
      expect(response.body.days[0].completedCount).toBe(2);
    });

    it('할 일이 없는 월은 빈 days 배열을 반환한다 (200)', async () => {
      mockGetMonthlySummaryUsecase.execute.mockResolvedValue({
        year: 2026,
        month: 4,
        days: [],
      });

      const response = await request(app.getHttpServer() as App)
        .get('/todos/report/summary')
        .query({ year: 2026, month: 4 })
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.days).toHaveLength(0);
    });

    it('인증 헤더 없이 요청하면 401을 반환한다', async () => {
      const response = await request(app.getHttpServer() as App)
        .get('/todos/report/summary')
        .query({ year: 2026, month: 3 });

      expect(response.status).toBe(401);
    });

    it('JWT에서 userAuthId를 추출하여 usecase에 전달한다', async () => {
      mockGetMonthlySummaryUsecase.execute.mockResolvedValue({
        year: 2026,
        month: 3,
        days: [],
      });

      await request(app.getHttpServer() as App)
        .get('/todos/report/summary')
        .query({ year: 2026, month: 3 })
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(mockGetMonthlySummaryUsecase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userAuthId: 'test-user-auth-id',
          year: 2026,
          month: 3,
        }),
      );
    });

    it('year 파라미터가 없으면 400을 반환한다', async () => {
      mockGetMonthlySummaryUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'BAD_REQUEST',
      });

      const response = await request(app.getHttpServer() as App)
        .get('/todos/report/summary')
        .query({ month: 3 })
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(response.status).toBe(400);
    });

    it('month 파라미터가 없으면 400을 반환한다', async () => {
      mockGetMonthlySummaryUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'BAD_REQUEST',
      });

      const response = await request(app.getHttpServer() as App)
        .get('/todos/report/summary')
        .query({ year: 2026 })
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(response.status).toBe(400);
    });

    it('유효하지 않은 month 값에 대해 400을 반환한다', async () => {
      mockGetMonthlySummaryUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'BAD_REQUEST',
      });

      const response = await request(app.getHttpServer() as App)
        .get('/todos/report/summary')
        .query({ year: 2026, month: 13 })
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(response.status).toBe(400);
    });

    it('사용자를 찾지 못하면 404를 반환한다', async () => {
      mockGetMonthlySummaryUsecase.execute.mockRejectedValue({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });

      const response = await request(app.getHttpServer() as App)
        .get('/todos/report/summary')
        .query({ year: 2026, month: 3 })
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(response.status).toBe(404);
    });
  });
});
