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
import { RefineTextUsecase } from 'src/todo/application/refine-text.usecase';
import { BatchCreateTodoUsecase } from 'src/todo/application/batch-create-todo.usecase';
import { JwtStrategy } from 'src/auth/infrastructure/jwt.strategy';

const TEST_JWT_SECRET = 'test-jwt-secret';

describe('TodoController - Voice Endpoints (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockCreateTodoUsecase = { execute: jest.fn() };
  const mockGetTodosUsecase = { execute: jest.fn() };
  const mockUpdateTodoUsecase = { execute: jest.fn() };
  const mockChangeTodoStatusUsecase = { execute: jest.fn() };
  const mockDeleteTodoUsecase = { execute: jest.fn() };
  const mockCompleteDayUsecase = { execute: jest.fn() };
  const mockGetMonthlySummaryUsecase = { execute: jest.fn() };
  const mockRefineTextUsecase = { execute: jest.fn() };
  const mockBatchCreateTodoUsecase = { execute: jest.fn() };

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
        { provide: RefineTextUsecase, useValue: mockRefineTextUsecase },
        {
          provide: BatchCreateTodoUsecase,
          useValue: mockBatchCreateTodoUsecase,
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
      new ValidationPipe({ whitelist: true, transform: true }),
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

  describe('POST /todos/refine', () => {
    it('텍스트를 정리하여 200을 반환한다', async () => {
      mockRefineTextUsecase.execute.mockResolvedValue({
        refinedText: '내일까지 장보기',
      });

      const response = await request(app.getHttpServer() as App)
        .post('/todos/refine')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ text: '장보기 가야 돼 내일까지' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ refinedText: '내일까지 장보기' });
      expect(mockRefineTextUsecase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userAuthId: 'test-user-auth-id',
          text: '장보기 가야 돼 내일까지',
        }),
      );
    });

    it('text가 빈 문자열이면 400을 반환한다', async () => {
      const response = await request(app.getHttpServer() as App)
        .post('/todos/refine')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ text: '' });

      expect(response.status).toBe(400);
    });

    it('인증 토큰 없이 요청하면 401을 반환한다', async () => {
      const response = await request(app.getHttpServer() as App)
        .post('/todos/refine')
        .send({ text: '장보기' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /todos/batch', () => {
    const mockBatchResponse = {
      created: [
        {
          id: 'todo-1',
          content: '장보기',
          todoDate: '2026-04-04',
          status: 'ACTIVE',
          isCarriedOver: false,
          memos: [],
          createdAt: '2026-04-04T10:00:00.000Z',
          updatedAt: '2026-04-04T10:00:00.000Z',
        },
      ],
    };

    it('여러 할 일을 일괄 생성하여 201을 반환한다', async () => {
      mockBatchCreateTodoUsecase.execute.mockResolvedValue(mockBatchResponse);

      const response = await request(app.getHttpServer() as App)
        .post('/todos/batch')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({
          todos: [{ content: '장보기', todoDate: '2026-04-04' }],
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockBatchResponse);
      expect(mockBatchCreateTodoUsecase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userAuthId: 'test-user-auth-id',
          todos: [{ content: '장보기', todoDate: '2026-04-04' }],
        }),
      );
    });

    it('todos가 빈 배열이면 400을 반환한다', async () => {
      const response = await request(app.getHttpServer() as App)
        .post('/todos/batch')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ todos: [] });

      expect(response.status).toBe(400);
    });

    it('인증 토큰 없이 요청하면 401을 반환한다', async () => {
      const response = await request(app.getHttpServer() as App)
        .post('/todos/batch')
        .send({ todos: [{ content: '장보기', todoDate: '2026-04-04' }] });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /todos/voice (deprecated)', () => {
    it('410 Gone을 반환한다', async () => {
      const response = await request(app.getHttpServer() as App)
        .post('/todos/voice')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({});

      expect(response.status).toBe(410);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 410,
          code: 'ENDPOINT_DEPRECATED',
        }),
      );
    });
  });
});
