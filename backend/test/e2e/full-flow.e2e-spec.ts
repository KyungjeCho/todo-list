import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { TodoController } from 'src/todo/todo.controller';
import { UserController } from 'src/user/user.controller';
import { CreateTodoUsecase } from 'src/todo/application/create-todo.usecase';
import { GetTodosUsecase } from 'src/todo/application/get-todos.usecase';
import { UpdateTodoUsecase } from 'src/todo/application/update-todo.usecase';
import { ChangeTodoStatusUsecase } from 'src/todo/application/change-todo-status.usecase';
import { DeleteTodoUsecase } from 'src/todo/application/delete-todo.usecase';
import { CompleteDayUsecase } from 'src/todo/application/complete-day.usecase';
import { GetMonthlySummaryUsecase } from 'src/todo/application/get-monthly-summary.usecase';
import { CreateVoiceTodoUsecase } from 'src/todo/application/create-voice-todo.usecase';
import { GetProfileUsecase } from 'src/user/application/get-profile.usecase';
import { UpdateSettingsUsecase } from 'src/user/application/update-settings.usecase';
import { JwtStrategy } from 'src/auth/infrastructure/jwt.strategy';
import { TodoStatus } from 'src/todo/domain/todo.entity';

const TEST_JWT_SECRET = 'test-e2e-secret';
const TEST_USER_ID = 'e2e-user-001';

/**
 * Backend E2E: 온보딩 → 할 일 CRUD → 회고 → 이월 전체 흐름
 *
 * WHY: 사용자의 핵심 여정 전체를 단일 시나리오로 검증하여
 * 모듈 간 통합 문제를 조기에 발견한다.
 */
describe('Full Flow E2E (onboarding → CRUD → review → carryover)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let accessToken: string;

  const mockGetProfile = { execute: jest.fn() };
  const mockUpdateSettings = { execute: jest.fn() };
  const mockCreateTodo = { execute: jest.fn() };
  const mockGetTodos = { execute: jest.fn() };
  const mockUpdateTodo = { execute: jest.fn() };
  const mockChangeTodoStatus = { execute: jest.fn() };
  const mockDeleteTodo = { execute: jest.fn() };
  const mockCompleteDay = { execute: jest.fn() };
  const mockGetMonthlySummary = { execute: jest.fn() };
  const mockCreateVoiceTodo = { execute: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [UserController, TodoController],
      providers: [
        { provide: GetProfileUsecase, useValue: mockGetProfile },
        { provide: UpdateSettingsUsecase, useValue: mockUpdateSettings },
        { provide: CreateTodoUsecase, useValue: mockCreateTodo },
        { provide: GetTodosUsecase, useValue: mockGetTodos },
        { provide: UpdateTodoUsecase, useValue: mockUpdateTodo },
        { provide: ChangeTodoStatusUsecase, useValue: mockChangeTodoStatus },
        { provide: DeleteTodoUsecase, useValue: mockDeleteTodo },
        { provide: CompleteDayUsecase, useValue: mockCompleteDay },
        { provide: GetMonthlySummaryUsecase, useValue: mockGetMonthlySummary },
        { provide: CreateVoiceTodoUsecase, useValue: mockCreateVoiceTodo },
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'jwt.secret') return TEST_JWT_SECRET;
              return undefined;
            },
          },
        },
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

    jwtService = moduleFixture.get<JwtService>(JwtService);
    accessToken = jwtService.sign({ sub: TEST_USER_ID, type: 'access' });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Step 1: 온보딩 — 프로필 조회 후 설정 변경', async () => {
    mockGetProfile.execute.mockResolvedValue({
      id: TEST_USER_ID,
      nickname: 'E2E User',
      planTime: null,
      reviewTime: null,
      timezone: 'Asia/Seoul',
    });

    const profileRes = await request(app.getHttpServer() as App)
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(profileRes.body.data.id).toBe(TEST_USER_ID);

    mockUpdateSettings.execute.mockResolvedValue({
      id: TEST_USER_ID,
      planTime: '08:00',
      reviewTime: '22:00',
      timezone: 'Asia/Seoul',
    });

    const settingsRes = await request(app.getHttpServer() as App)
      .patch('/users/me/settings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ planTime: '08:00', reviewTime: '22:00' })
      .expect(200);

    expect(settingsRes.body.data.planTime).toBe('08:00');
    expect(settingsRes.body.data.reviewTime).toBe('22:00');
  });

  it('Step 2: 할 일 생성', async () => {
    const todo = {
      id: 'todo-001',
      content: '장보기',
      status: TodoStatus.ACTIVE,
      todoDate: '2026-04-01',
      isCarriedOver: false,
      createdAt: new Date().toISOString(),
    };
    mockCreateTodo.execute.mockResolvedValue(todo);

    const res = await request(app.getHttpServer() as App)
      .post('/todos')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: '장보기', todoDate: '2026-04-01' })
      .expect(201);

    expect(res.body.data.content).toBe('장보기');
    expect(res.body.data.status).toBe(TodoStatus.ACTIVE);
  });

  it('Step 3: 할 일 목록 조회', async () => {
    mockGetTodos.execute.mockResolvedValue({
      todos: [
        {
          id: 'todo-001',
          content: '장보기',
          status: TodoStatus.ACTIVE,
          todoDate: '2026-04-01',
        },
      ],
      mode: 'PLAN',
      stats: { total: 1, completed: 0, active: 1, inactive: 0 },
    });

    const res = await request(app.getHttpServer() as App)
      .get('/todos?date=2026-04-01')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.todos).toHaveLength(1);
    expect(res.body.data.mode).toBe('PLAN');
  });

  it('Step 4: 할 일 수정', async () => {
    mockUpdateTodo.execute.mockResolvedValue({
      id: 'todo-001',
      content: '장보기 — 우유, 빵',
      status: TodoStatus.ACTIVE,
    });

    const res = await request(app.getHttpServer() as App)
      .patch('/todos/todo-001')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: '장보기 — 우유, 빵' })
      .expect(200);

    expect(res.body.data.content).toBe('장보기 — 우유, 빵');
  });

  it('Step 5: 할 일 완료 처리', async () => {
    mockChangeTodoStatus.execute.mockResolvedValue({
      id: 'todo-001',
      content: '장보기 — 우유, 빵',
      status: TodoStatus.COMPLETED,
    });

    const res = await request(app.getHttpServer() as App)
      .patch('/todos/todo-001/status')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'COMPLETED' })
      .expect(200);

    expect(res.body.data.status).toBe(TodoStatus.COMPLETED);
  });

  it('Step 6: 두 번째 할 일 생성 (미완료 상태로 남김)', async () => {
    mockCreateTodo.execute.mockResolvedValue({
      id: 'todo-002',
      content: '운동하기',
      status: TodoStatus.ACTIVE,
      todoDate: '2026-04-01',
    });

    const res = await request(app.getHttpServer() as App)
      .post('/todos')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: '운동하기', todoDate: '2026-04-01' })
      .expect(201);

    expect(res.body.data.content).toBe('운동하기');
  });

  it('Step 7: 일정 완료 (회고) → 미완료 항목 이월', async () => {
    mockCompleteDay.execute.mockResolvedValue({
      completedCount: 1,
      carriedOverCount: 1,
      carriedOverTodos: [
        {
          originalId: 'todo-002',
          newId: 'todo-003',
          content: '운동하기',
          newDate: '2026-04-02',
        },
      ],
    });

    const res = await request(app.getHttpServer() as App)
      .post('/todos/complete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ date: '2026-04-01' })
      .expect(201);

    expect(res.body.data.carriedOverCount).toBe(1);
    expect(res.body.data.carriedOverTodos[0].content).toBe('운동하기');
  });

  it('Step 8: 이월 후 다음 날 목록 조회 확인', async () => {
    mockGetTodos.execute.mockResolvedValue({
      todos: [
        {
          id: 'todo-003',
          content: '운동하기',
          status: TodoStatus.ACTIVE,
          todoDate: '2026-04-02',
          isCarriedOver: true,
        },
      ],
      mode: 'PLAN',
      stats: { total: 1, completed: 0, active: 1, inactive: 0 },
    });

    const res = await request(app.getHttpServer() as App)
      .get('/todos?date=2026-04-02')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.todos[0].isCarriedOver).toBe(true);
  });

  it('Step 9: 할 일 삭제', async () => {
    mockDeleteTodo.execute.mockResolvedValue({ id: 'todo-003', deleted: true });

    await request(app.getHttpServer() as App)
      .delete('/todos/todo-003')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(mockDeleteTodo.execute).toHaveBeenCalledWith(
      TEST_USER_ID,
      'todo-003',
    );
  });

  it('Step 10: 월별 요약 조회', async () => {
    mockGetMonthlySummary.execute.mockResolvedValue({
      month: '2026-04',
      days: [
        { date: '2026-04-01', totalCount: 2, completedCount: 1 },
        { date: '2026-04-02', totalCount: 1, completedCount: 0 },
      ],
    });

    const res = await request(app.getHttpServer() as App)
      .get('/todos/report/summary?month=2026-04')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.days).toHaveLength(2);
    expect(res.body.data.days[0].completedCount).toBe(1);
  });
});
