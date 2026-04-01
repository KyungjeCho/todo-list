import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TodoController } from 'src/todo/todo.controller';
import { CompleteDayUsecase } from 'src/todo/application/complete-day.usecase';
import { CreateTodoUsecase } from 'src/todo/application/create-todo.usecase';
import { GetTodosUsecase } from 'src/todo/application/get-todos.usecase';
import { UpdateTodoUsecase } from 'src/todo/application/update-todo.usecase';
import { ChangeTodoStatusUsecase } from 'src/todo/application/change-todo-status.usecase';
import { DeleteTodoUsecase } from 'src/todo/application/delete-todo.usecase';
import { GetMonthlySummaryUsecase } from 'src/todo/application/get-monthly-summary.usecase';
import { CreateVoiceTodoUsecase } from 'src/todo/application/create-voice-todo.usecase';
import { JwtStrategy } from 'src/auth/infrastructure/jwt.strategy';

const TEST_JWT_SECRET = 'test-jwt-secret';

describe('TodoCompleteController (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockCompleteDayUsecase = {
    execute: jest.fn(),
  };

  const mockCreateTodoUsecase = { execute: jest.fn() };
  const mockGetTodosUsecase = { execute: jest.fn() };
  const mockUpdateTodoUsecase = { execute: jest.fn() };
  const mockChangeTodoStatusUsecase = { execute: jest.fn() };
  const mockDeleteTodoUsecase = { execute: jest.fn() };
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
        { provide: CompleteDayUsecase, useValue: mockCompleteDayUsecase },
        { provide: CreateTodoUsecase, useValue: mockCreateTodoUsecase },
        { provide: GetTodosUsecase, useValue: mockGetTodosUsecase },
        { provide: UpdateTodoUsecase, useValue: mockUpdateTodoUsecase },
        {
          provide: ChangeTodoStatusUsecase,
          useValue: mockChangeTodoStatusUsecase,
        },
        { provide: DeleteTodoUsecase, useValue: mockDeleteTodoUsecase },
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

  describe('POST /todos/complete', () => {
    it('should complete day and return carry-over result (200)', async () => {
      const mockResponse = {
        date: '2026-03-28',
        stats: {
          total: 3,
          completed: 1,
          active: 0,
          inactive: 1,
          progressRate: 33.3,
        },
        carriedOverCount: 1,
        carriedOverTodos: [
          {
            fromTodoId: 'todo-1',
            toTodoId: 'new-todo-1',
            content: '장보기',
          },
        ],
      };

      mockCompleteDayUsecase.execute.mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer() as App)
        .post('/todos/complete')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ date: '2026-03-28' });

      expect(response.status).toBe(200);
      expect(response.body.date).toBe('2026-03-28');
      expect(response.body.carriedOverCount).toBe(1);
      expect(response.body.carriedOverTodos).toHaveLength(1);
      expect(response.body.carriedOverTodos[0].content).toBe('장보기');
      expect(response.body.stats.total).toBe(3);
    });

    it('should return 200 with zero carry-overs when all completed', async () => {
      const mockResponse = {
        date: '2026-03-28',
        stats: {
          total: 2,
          completed: 2,
          active: 0,
          inactive: 0,
          progressRate: 100.0,
        },
        carriedOverCount: 0,
        carriedOverTodos: [],
      };

      mockCompleteDayUsecase.execute.mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer() as App)
        .post('/todos/complete')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ date: '2026-03-28' });

      expect(response.status).toBe(200);
      expect(response.body.carriedOverCount).toBe(0);
      expect(response.body.carriedOverTodos).toHaveLength(0);
      expect(response.body.stats.progressRate).toBe(100.0);
    });

    it('should return 401 without auth header', async () => {
      const response = await request(app.getHttpServer() as App)
        .post('/todos/complete')
        .send({ date: '2026-03-28' });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid date format', async () => {
      mockCompleteDayUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });

      const response = await request(app.getHttpServer() as App)
        .post('/todos/complete')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ date: 'invalid-date' });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing date field', async () => {
      mockCompleteDayUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });

      const response = await request(app.getHttpServer() as App)
        .post('/todos/complete')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should pass userAuthId from JWT to usecase', async () => {
      mockCompleteDayUsecase.execute.mockResolvedValue({
        date: '2026-03-28',
        stats: {
          total: 0,
          completed: 0,
          active: 0,
          inactive: 0,
          progressRate: 0,
        },
        carriedOverCount: 0,
        carriedOverTodos: [],
      });

      await request(app.getHttpServer() as App)
        .post('/todos/complete')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ date: '2026-03-28' });

      expect(mockCompleteDayUsecase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userAuthId: 'test-user-auth-id',
          date: '2026-03-28',
        }),
      );
    });

    it('should return 401 for expired JWT', async () => {
      const expiredToken = jwtService.sign(
        { sub: 'test-user-auth-id', type: 'access' },
        { secret: TEST_JWT_SECRET, expiresIn: '0s' },
      );

      const response = await request(app.getHttpServer() as App)
        .post('/todos/complete')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ date: '2026-03-28' });

      expect(response.status).toBe(401);
    });
  });
});
