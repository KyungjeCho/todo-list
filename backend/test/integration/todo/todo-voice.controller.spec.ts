import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
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
import { GetMonthlySummaryUsecase } from 'src/todo/application/get-monthly-summary.usecase';
import { CreateVoiceTodoUsecase } from 'src/todo/application/create-voice-todo.usecase';
import { JwtStrategy } from 'src/auth/infrastructure/jwt.strategy';

const TEST_JWT_SECRET = 'test-jwt-secret';

describe('TodoController - Voice Todo (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockCreateTodoUsecase = { execute: jest.fn() };
  const mockGetTodosUsecase = { execute: jest.fn() };
  const mockUpdateTodoUsecase = { execute: jest.fn() };
  const mockChangeTodoStatusUsecase = { execute: jest.fn() };
  const mockDeleteTodoUsecase = { execute: jest.fn() };
  const mockCompleteDayUsecase = { execute: jest.fn() };
  const mockGetMonthlySummaryUsecase = { execute: jest.fn() };
  const mockCreateVoiceTodoUsecase = { execute: jest.fn() };

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
          useValue: mockCreateVoiceTodoUsecase,
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

  describe('POST /todos/voice', () => {
    const mockVoiceTodoResponse = {
      id: 'todo-id-1',
      content: '장보기',
      rawText: '장보기',
      status: 'ACTIVE',
      isCarriedOver: false,
      todoDate: '2026-04-01',
      memos: [],
      createdAt: '2026-04-01T09:00:00.000Z',
      updatedAt: '2026-04-01T09:00:00.000Z',
    };

    it('multipart/form-data로 오디오 파일을 업로드하면 201을 반환한다', async () => {
      mockCreateVoiceTodoUsecase.execute.mockResolvedValue(
        mockVoiceTodoResponse,
      );

      const response = await request(app.getHttpServer() as App)
        .post('/todos/voice')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .attach('audio', Buffer.from('fake-audio-data'), {
          filename: 'recording.wav',
          contentType: 'audio/wav',
        })
        .field('todoDate', '2026-04-01');

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: 'todo-id-1',
          content: '장보기',
          rawText: '장보기',
          status: 'ACTIVE',
        }),
      );
    });

    it('usecase에 userAuthId, audioBuffer, mimeType, todoDate를 전달한다', async () => {
      mockCreateVoiceTodoUsecase.execute.mockResolvedValue(
        mockVoiceTodoResponse,
      );

      await request(app.getHttpServer() as App)
        .post('/todos/voice')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .attach('audio', Buffer.from('fake-audio-data'), {
          filename: 'recording.wav',
          contentType: 'audio/wav',
        })
        .field('todoDate', '2026-04-01');

      expect(mockCreateVoiceTodoUsecase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userAuthId: 'test-user-auth-id',
          mimeType: expect.stringContaining('audio/wav'),
          todoDate: '2026-04-01',
        }),
      );

      const callArgs = mockCreateVoiceTodoUsecase.execute.mock.calls[0][0];
      expect(callArgs.audioBuffer).toBeInstanceOf(Buffer);
    });

    it('todoDate 없이 요청하면 400을 반환한다', async () => {
      const response = await request(app.getHttpServer() as App)
        .post('/todos/voice')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .attach('audio', Buffer.from('fake-audio-data'), {
          filename: 'recording.m4a',
          contentType: 'audio/mp4',
        });

      expect(response.status).toBe(400);
    });

    it('오디오 파일 없이 요청하면 400을 반환한다', async () => {
      const response = await request(app.getHttpServer() as App)
        .post('/todos/voice')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .field('todoDate', '2026-04-01');

      expect(response.status).toBe(400);
    });

    it('인증 토큰 없이 요청하면 401을 반환한다', async () => {
      const response = await request(app.getHttpServer() as App)
        .post('/todos/voice')
        .attach('audio', Buffer.from('fake-audio-data'), {
          filename: 'recording.wav',
          contentType: 'audio/wav',
        });

      expect(response.status).toBe(401);
    });

    it('usecase 실행 실패 시 에러 응답을 반환한다', async () => {
      mockCreateVoiceTodoUsecase.execute.mockRejectedValue({
        status: 500,
        response: {
          statusCode: 500,
          code: 'VOICE_AI_API_ERROR',
          message: 'Gemini API 호출 실패',
        },
      });

      const response = await request(app.getHttpServer() as App)
        .post('/todos/voice')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .attach('audio', Buffer.from('fake-audio-data'), {
          filename: 'recording.wav',
          contentType: 'audio/wav',
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('m4a 포맷 오디오 파일을 지원한다', async () => {
      mockCreateVoiceTodoUsecase.execute.mockResolvedValue({
        ...mockVoiceTodoResponse,
        content: '운동하기',
        rawText: '운동하기',
      });

      const response = await request(app.getHttpServer() as App)
        .post('/todos/voice')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .attach('audio', Buffer.from('fake-audio-data'), {
          filename: 'recording.m4a',
          contentType: 'audio/mp4',
        })
        .field('todoDate', '2026-04-01');

      expect(response.status).toBe(201);
    });

    it('잘못된 todoDate 형식이면 400을 반환한다', async () => {
      const response = await request(app.getHttpServer() as App)
        .post('/todos/voice')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .attach('audio', Buffer.from('fake-audio-data'), {
          filename: 'recording.wav',
          contentType: 'audio/wav',
        })
        .field('todoDate', 'invalid-date');

      expect(response.status).toBe(400);
    });

    it('지원하지 않는 오디오 포맷이면 400을 반환한다', async () => {
      const response = await request(app.getHttpServer() as App)
        .post('/todos/voice')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .attach('audio', Buffer.from('fake-audio-data'), {
          filename: 'recording.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(400);
    });

    it('mp3 포맷 오디오 파일을 지원한다', async () => {
      mockCreateVoiceTodoUsecase.execute.mockResolvedValue({
        ...mockVoiceTodoResponse,
        content: '독서하기',
        rawText: '독서하기',
      });

      const response = await request(app.getHttpServer() as App)
        .post('/todos/voice')
        .set('Authorization', `Bearer ${createValidToken()}`)
        .attach('audio', Buffer.from('fake-audio-data'), {
          filename: 'recording.mp3',
          contentType: 'audio/mpeg',
        })
        .field('todoDate', '2026-04-01');

      expect(response.status).toBe(201);
    });
  });
});
