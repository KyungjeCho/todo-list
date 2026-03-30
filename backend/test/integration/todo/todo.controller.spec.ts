import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
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
import { JwtStrategy } from 'src/auth/infrastructure/jwt.strategy';

const TEST_JWT_SECRET = 'test-jwt-secret';

describe('TodoController (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockCreateTodoUsecase = {
    execute: jest.fn(),
  };

  const mockGetTodosUsecase = {
    execute: jest.fn(),
  };

  const mockUpdateTodoUsecase = {
    execute: jest.fn(),
  };

  const mockChangeTodoStatusUsecase = {
    execute: jest.fn(),
  };

  const mockDeleteTodoUsecase = {
    execute: jest.fn(),
  };

  const mockCompleteDayUsecase = {
    execute: jest.fn(),
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

  describe('JWT validation (cross-cutting)', () => {
    it('should return 401 for expired JWT', async () => {
      const expiredToken = jwtService.sign(
        { sub: 'test-user-auth-id', type: 'access' },
        { secret: TEST_JWT_SECRET, expiresIn: '0s' },
      );

      const response = await request(app.getHttpServer() as App)
        .get('/todos')
        .query({ date: '2026-03-28' })
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should return 401 for malformed JWT', async () => {
      const response = await request(app.getHttpServer() as App)
        .get('/todos')
        .query({ date: '2026-03-28' })
        .set('Authorization', 'Bearer not-a-valid-jwt');

      expect(response.status).toBe(401);
    });

    it('should return 401 for JWT signed with wrong secret', async () => {
      const wrongToken = jwtService.sign(
        { sub: 'test-user-auth-id', type: 'access' },
        { secret: 'wrong-secret' },
      );

      const response = await request(app.getHttpServer() as App)
        .get('/todos')
        .query({ date: '2026-03-28' })
        .set('Authorization', `Bearer ${wrongToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /todos', () => {
    it('should return todo list for a date (200)', async () => {
      const mockResponse = {
        date: '2026-03-28',
        mode: 'PLAN',
        stats: {
          total: 2,
          completed: 1,
          active: 1,
          inactive: 0,
          progressRate: 50.0,
        },
        todos: [
          {
            id: 'todo-id-1',
            content: '장보기',
            status: 'ACTIVE',
            isCarriedOver: false,
            todoDate: '2026-03-28',
            memos: [],
            createdAt: '2026-03-28T09:00:00.000Z',
            updatedAt: '2026-03-28T09:00:00.000Z',
          },
          {
            id: 'todo-id-2',
            content: '운동하기',
            status: 'COMPLETED',
            isCarriedOver: false,
            todoDate: '2026-03-28',
            memos: [],
            createdAt: '2026-03-28T08:00:00.000Z',
            updatedAt: '2026-03-28T12:00:00.000Z',
          },
        ],
      };

      mockGetTodosUsecase.execute.mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer() as App)
        .get('/todos')
        .query({ date: '2026-03-28' })
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.date).toBe('2026-03-28');
      expect(response.body.mode).toBe('PLAN');
      expect(response.body.stats.total).toBe(2);
      expect(response.body.todos).toHaveLength(2);
    });

    it('should return empty list when no todos (200)', async () => {
      mockGetTodosUsecase.execute.mockResolvedValue({
        date: '2026-03-28',
        mode: 'PLAN',
        stats: {
          total: 0,
          completed: 0,
          active: 0,
          inactive: 0,
          progressRate: 0,
        },
        todos: [],
      });

      const response = await request(app.getHttpServer() as App)
        .get('/todos')
        .query({ date: '2026-03-28' })
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.todos).toHaveLength(0);
    });

    it('should return 401 without auth header', async () => {
      const response = await request(app.getHttpServer() as App)
        .get('/todos')
        .query({ date: '2026-03-28' });

      expect(response.status).toBe(401);
    });

    it('should pass userAuthId from JWT to usecase', async () => {
      mockGetTodosUsecase.execute.mockResolvedValue({
        date: '2026-03-28',
        mode: 'PLAN',
        stats: {
          total: 0,
          completed: 0,
          active: 0,
          inactive: 0,
          progressRate: 0,
        },
        todos: [],
      });

      await request(app.getHttpServer() as App)
        .get('/todos')
        .query({ date: '2026-03-28' })
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(mockGetTodosUsecase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userAuthId: 'test-user-auth-id',
        }),
      );
    });
  });

  describe('POST /todos', () => {
    it('should create a new todo (201)', async () => {
      const mockTodoItem = {
        id: 'todo-id-1',
        content: '장보기',
        status: 'ACTIVE',
        isCarriedOver: false,
        todoDate: '2026-03-28',
        memos: [],
        createdAt: '2026-03-28T09:00:00.000Z',
        updatedAt: '2026-03-28T09:00:00.000Z',
      };

      mockCreateTodoUsecase.execute.mockResolvedValue(mockTodoItem);

      const response = await request(app.getHttpServer() as App)
        .post('/todos')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ content: '장보기', todoDate: '2026-03-28' });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('todo-id-1');
      expect(response.body.content).toBe('장보기');
      expect(response.body.status).toBe('ACTIVE');
    });

    it('should create todo without todoDate (defaults to today)', async () => {
      mockCreateTodoUsecase.execute.mockResolvedValue({
        id: 'todo-id-1',
        content: '운동하기',
        status: 'ACTIVE',
        isCarriedOver: false,
        todoDate: '2026-03-28',
        memos: [],
        createdAt: '2026-03-28T09:00:00.000Z',
        updatedAt: '2026-03-28T09:00:00.000Z',
      });

      const response = await request(app.getHttpServer() as App)
        .post('/todos')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ content: '운동하기' });

      expect(response.status).toBe(201);
      expect(response.body.content).toBe('운동하기');
    });

    it('should return 400 for empty content', async () => {
      mockCreateTodoUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });

      const response = await request(app.getHttpServer() as App)
        .post('/todos')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ content: '' });

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth header', async () => {
      const response = await request(app.getHttpServer() as App)
        .post('/todos')
        .send({ content: '장보기' });

      expect(response.status).toBe(401);
    });

    it('should return 400 for content exceeding 255 characters', async () => {
      mockCreateTodoUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });

      const response = await request(app.getHttpServer() as App)
        .post('/todos')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ content: 'a'.repeat(256) });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing content field', async () => {
      mockCreateTodoUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });

      const response = await request(app.getHttpServer() as App)
        .post('/todos')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid todoDate format', async () => {
      mockCreateTodoUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });

      const response = await request(app.getHttpServer() as App)
        .post('/todos')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ content: '장보기', todoDate: 'not-a-date' });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /todos/:todoId', () => {
    it('should update todo content (200)', async () => {
      mockUpdateTodoUsecase.execute.mockResolvedValue({
        id: 'todo-id-1',
        content: '수정된 할 일',
        status: 'ACTIVE',
        isCarriedOver: false,
        todoDate: '2026-03-28',
        memos: [],
        createdAt: '2026-03-28T09:00:00.000Z',
        updatedAt: '2026-03-28T10:00:00.000Z',
      });

      const response = await request(app.getHttpServer() as App)
        .patch('/todos/todo-id-1')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ content: '수정된 할 일' });

      expect(response.status).toBe(200);
      expect(response.body.content).toBe('수정된 할 일');
    });

    it('should return 404 for non-existent todo', async () => {
      mockUpdateTodoUsecase.execute.mockRejectedValue({
        statusCode: 404,
        code: 'NOT_FOUND',
      });

      const response = await request(app.getHttpServer() as App)
        .patch('/todos/non-existent-id')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ content: '수정' });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth header', async () => {
      const response = await request(app.getHttpServer() as App)
        .patch('/todos/todo-id-1')
        .send({ content: '수정' });

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /todos/:todoId/status', () => {
    it('should change todo status (200)', async () => {
      mockChangeTodoStatusUsecase.execute.mockResolvedValue({
        id: 'todo-id-1',
        content: '장보기',
        status: 'COMPLETED',
        isCarriedOver: false,
        todoDate: '2026-03-28',
        memos: [],
        createdAt: '2026-03-28T09:00:00.000Z',
        updatedAt: '2026-03-28T11:00:00.000Z',
      });

      const response = await request(app.getHttpServer() as App)
        .patch('/todos/todo-id-1/status')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('COMPLETED');
    });

    it('should return 400 for invalid status transition', async () => {
      mockChangeTodoStatusUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'INVALID_STATUS_TRANSITION',
      });

      const response = await request(app.getHttpServer() as App)
        .patch('/todos/todo-id-1/status')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ status: 'CARRIED_OVER' });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent todo', async () => {
      mockChangeTodoStatusUsecase.execute.mockRejectedValue({
        statusCode: 404,
        code: 'NOT_FOUND',
      });

      const response = await request(app.getHttpServer() as App)
        .patch('/todos/non-existent-id/status')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth header', async () => {
      const response = await request(app.getHttpServer() as App)
        .patch('/todos/todo-id-1/status')
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(401);
    });

    it('should pass userAuthId from JWT to usecase', async () => {
      mockChangeTodoStatusUsecase.execute.mockResolvedValue({
        id: 'todo-id-1',
        content: '장보기',
        status: 'COMPLETED',
        isCarriedOver: false,
        todoDate: '2026-03-28',
        memos: [],
        createdAt: '2026-03-28T09:00:00.000Z',
        updatedAt: '2026-03-28T11:00:00.000Z',
      });

      await request(app.getHttpServer() as App)
        .patch('/todos/todo-id-1/status')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ status: 'COMPLETED' });

      expect(mockChangeTodoStatusUsecase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userAuthId: 'test-user-auth-id',
          todoId: 'todo-id-1',
          status: 'COMPLETED',
        }),
      );
    });

    it('should return 400 for empty status field', async () => {
      mockChangeTodoStatusUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });

      const response = await request(app.getHttpServer() as App)
        .patch('/todos/todo-id-1/status')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid status value', async () => {
      mockChangeTodoStatusUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });

      const response = await request(app.getHttpServer() as App)
        .patch('/todos/todo-id-1/status')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /todos/:todoId', () => {
    it('should delete todo (200)', async () => {
      mockDeleteTodoUsecase.execute.mockResolvedValue({
        id: 'todo-id-1',
        deletedAt: '2026-03-28T15:00:00.000Z',
      });

      const response = await request(app.getHttpServer() as App)
        .delete('/todos/todo-id-1')
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('todo-id-1');
      expect(response.body.deletedAt).toBeDefined();
    });

    it('should return 404 for non-existent todo', async () => {
      mockDeleteTodoUsecase.execute.mockRejectedValue({
        statusCode: 404,
        code: 'NOT_FOUND',
      });

      const response = await request(app.getHttpServer() as App)
        .delete('/todos/non-existent-id')
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth header', async () => {
      const response = await request(app.getHttpServer() as App).delete(
        '/todos/todo-id-1',
      );

      expect(response.status).toBe(401);
    });

    it('should pass userAuthId and todoId to usecase', async () => {
      mockDeleteTodoUsecase.execute.mockResolvedValue({
        id: 'todo-id-1',
        deletedAt: '2026-03-28T15:00:00.000Z',
      });

      await request(app.getHttpServer() as App)
        .delete('/todos/todo-id-1')
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(mockDeleteTodoUsecase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userAuthId: 'test-user-auth-id',
          todoId: 'todo-id-1',
        }),
      );
    });
  });
});
