import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import type { App } from 'supertest/types';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MemoController } from 'src/memo/memo.controller';
import { CreateMemoUsecase } from 'src/memo/application/create-memo.usecase';
import { UpdateMemoUsecase } from 'src/memo/application/update-memo.usecase';
import { DeleteMemoUsecase } from 'src/memo/application/delete-memo.usecase';
import { JwtStrategy } from 'src/auth/infrastructure/jwt.strategy';

const TEST_JWT_SECRET = 'test-jwt-secret';

describe('MemoController (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockCreateMemoUsecase = {
    execute: jest.fn(),
  };

  const mockUpdateMemoUsecase = {
    execute: jest.fn(),
  };

  const mockDeleteMemoUsecase = {
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
      controllers: [MemoController],
      providers: [
        { provide: CreateMemoUsecase, useValue: mockCreateMemoUsecase },
        { provide: UpdateMemoUsecase, useValue: mockUpdateMemoUsecase },
        { provide: DeleteMemoUsecase, useValue: mockDeleteMemoUsecase },
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

  describe('POST /todos/:todoId/memos', () => {
    it('should create a new memo (201)', async () => {
      const mockMemoResponse = {
        id: 'memo-id-1',
        todoId: 'todo-id-1',
        content: '회의 메모',
        createdAt: '2026-03-31T09:00:00.000Z',
        updatedAt: '2026-03-31T09:00:00.000Z',
      };

      mockCreateMemoUsecase.execute.mockResolvedValue(mockMemoResponse);

      const response = await request(app.getHttpServer() as App)
        .post('/todos/todo-id-1/memos')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ content: '회의 메모' });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('memo-id-1');
      expect(response.body.todoId).toBe('todo-id-1');
      expect(response.body.content).toBe('회의 메모');
    });

    it('should return 401 without auth header', async () => {
      const response = await request(app.getHttpServer() as App)
        .post('/todos/todo-id-1/memos')
        .send({ content: '메모' });

      expect(response.status).toBe(401);
    });

    it('should return 400 for empty content', async () => {
      mockCreateMemoUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'CONTENT_REQUIRED',
      });

      const response = await request(app.getHttpServer() as App)
        .post('/todos/todo-id-1/memos')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ content: '' });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing content field', async () => {
      mockCreateMemoUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'CONTENT_REQUIRED',
      });

      const response = await request(app.getHttpServer() as App)
        .post('/todos/todo-id-1/memos')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 when todo not found', async () => {
      mockCreateMemoUsecase.execute.mockRejectedValue({
        statusCode: 404,
        code: 'TODO_NOT_FOUND',
      });

      const response = await request(app.getHttpServer() as App)
        .post('/todos/non-existent-id/memos')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ content: '메모' });

      expect(response.status).toBe(404);
    });

    it('should pass userAuthId and todoId from JWT and URL to usecase', async () => {
      mockCreateMemoUsecase.execute.mockResolvedValue({
        id: 'memo-id-1',
        todoId: 'todo-id-1',
        content: '메모',
        createdAt: '2026-03-31T09:00:00.000Z',
        updatedAt: '2026-03-31T09:00:00.000Z',
      });

      await request(app.getHttpServer() as App)
        .post('/todos/todo-id-1/memos')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ content: '메모' });

      expect(mockCreateMemoUsecase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userAuthId: 'test-user-auth-id',
          todoId: 'todo-id-1',
          content: '메모',
        }),
      );
    });
  });

  describe('PATCH /todos/:todoId/memos/:memoId', () => {
    it('should update memo content (200)', async () => {
      const mockMemoResponse = {
        id: 'memo-id-1',
        todoId: 'todo-id-1',
        content: '수정된 메모',
        createdAt: '2026-03-31T09:00:00.000Z',
        updatedAt: '2026-03-31T10:00:00.000Z',
      };

      mockUpdateMemoUsecase.execute.mockResolvedValue(mockMemoResponse);

      const response = await request(app.getHttpServer() as App)
        .patch('/todos/todo-id-1/memos/memo-id-1')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ content: '수정된 메모' });

      expect(response.status).toBe(200);
      expect(response.body.content).toBe('수정된 메모');
    });

    it('should return 401 without auth header', async () => {
      const response = await request(app.getHttpServer() as App)
        .patch('/todos/todo-id-1/memos/memo-id-1')
        .send({ content: '수정' });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent memo', async () => {
      mockUpdateMemoUsecase.execute.mockRejectedValue({
        statusCode: 404,
        code: 'MEMO_NOT_FOUND',
      });

      const response = await request(app.getHttpServer() as App)
        .patch('/todos/todo-id-1/memos/non-existent-id')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ content: '수정' });

      expect(response.status).toBe(404);
    });

    it('should return 400 for empty content', async () => {
      mockUpdateMemoUsecase.execute.mockRejectedValue({
        statusCode: 400,
        code: 'CONTENT_REQUIRED',
      });

      const response = await request(app.getHttpServer() as App)
        .patch('/todos/todo-id-1/memos/memo-id-1')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ content: '' });

      expect(response.status).toBe(400);
    });

    it('should pass userAuthId, todoId, and memoId to usecase', async () => {
      mockUpdateMemoUsecase.execute.mockResolvedValue({
        id: 'memo-id-1',
        todoId: 'todo-id-1',
        content: '수정된 메모',
        createdAt: '2026-03-31T09:00:00.000Z',
        updatedAt: '2026-03-31T10:00:00.000Z',
      });

      await request(app.getHttpServer() as App)
        .patch('/todos/todo-id-1/memos/memo-id-1')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .send({ content: '수정된 메모' });

      expect(mockUpdateMemoUsecase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userAuthId: 'test-user-auth-id',
          todoId: 'todo-id-1',
          memoId: 'memo-id-1',
          content: '수정된 메모',
        }),
      );
    });
  });

  describe('DELETE /todos/:todoId/memos/:memoId', () => {
    it('should delete memo (200)', async () => {
      mockDeleteMemoUsecase.execute.mockResolvedValue({
        id: 'memo-id-1',
        deletedAt: '2026-03-31T15:00:00.000Z',
      });

      const response = await request(app.getHttpServer() as App)
        .delete('/todos/todo-id-1/memos/memo-id-1')
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('memo-id-1');
      expect(response.body.deletedAt).toBeDefined();
    });

    it('should return 401 without auth header', async () => {
      const response = await request(app.getHttpServer() as App).delete(
        '/todos/todo-id-1/memos/memo-id-1',
      );

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent memo', async () => {
      mockDeleteMemoUsecase.execute.mockRejectedValue({
        statusCode: 404,
        code: 'MEMO_NOT_FOUND',
      });

      const response = await request(app.getHttpServer() as App)
        .delete('/todos/todo-id-1/memos/non-existent-id')
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(response.status).toBe(404);
    });

    it('should pass userAuthId, todoId, and memoId to usecase', async () => {
      mockDeleteMemoUsecase.execute.mockResolvedValue({
        id: 'memo-id-1',
        deletedAt: '2026-03-31T15:00:00.000Z',
      });

      await request(app.getHttpServer() as App)
        .delete('/todos/todo-id-1/memos/memo-id-1')
        .set('Authorization', `Bearer ${createValidToken()}`);

      expect(mockDeleteMemoUsecase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userAuthId: 'test-user-auth-id',
          todoId: 'todo-id-1',
          memoId: 'memo-id-1',
        }),
      );
    });
  });

  describe('JWT validation (cross-cutting)', () => {
    it('should return 401 for expired JWT', async () => {
      const expiredToken = jwtService.sign(
        { sub: 'test-user-auth-id', type: 'access' },
        { secret: TEST_JWT_SECRET, expiresIn: '0s' },
      );

      const response = await request(app.getHttpServer() as App)
        .post('/todos/todo-id-1/memos')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ content: '메모' });

      expect(response.status).toBe(401);
    });

    it('should return 401 for malformed JWT', async () => {
      const response = await request(app.getHttpServer() as App)
        .post('/todos/todo-id-1/memos')
        .set('Authorization', 'Bearer not-a-valid-jwt')
        .send({ content: '메모' });

      expect(response.status).toBe(401);
    });
  });
});
