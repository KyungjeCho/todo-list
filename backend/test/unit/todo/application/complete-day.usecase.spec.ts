import { CompleteDayUsecase } from 'src/todo/application/complete-day.usecase';
import { TodoStatus } from 'src/todo/domain/todo.entity';

describe('CompleteDayUsecase', () => {
  let usecase: CompleteDayUsecase;

  const mockTodoRepository = {
    findByUserIdAndDate: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };

  const mockUserRepository = {
    findByUserAuthId: jest.fn(),
  };

  const mockTxTodoRepo = {
    save: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  };

  const mockTxHistoryRepo = {
    save: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(async (cb: (manager: unknown) => Promise<void>) => {
      const manager = {
        getRepository: jest.fn((entity: unknown) => {
          const entityName = typeof entity === 'function' ? entity.name : '';
          if (entityName === 'Todo') return mockTxTodoRepo;
          return mockTxHistoryRepo;
        }),
      };
      await cb(manager);
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTxHistoryRepo.findOne.mockResolvedValue(null);
    usecase = new CompleteDayUsecase(
      mockTodoRepository as never,
      mockUserRepository as never,
      mockDataSource as never,
    );
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    const mockUser = {
      id: 'user-id-1',
      userAuthId: 'auth-id-1',
      timezone: 'Asia/Seoul',
    };

    const createMockTodo = (
      id: string,
      status: TodoStatus,
      content: string,
    ) => ({
      id,
      userId: 'user-id-1',
      content,
      status,
      todoDate: '2026-03-28',
      memos: [],
      createdAt: new Date('2026-03-28T09:00:00Z'),
      updatedAt: new Date('2026-03-28T09:00:00Z'),
    });

    describe('carry-over logic: ACTIVE -> CARRIED_OVER with new ACTIVE todo', () => {
      it('should change ACTIVE todos to CARRIED_OVER and create new ACTIVE todos for next day', async () => {
        const activeTodo = createMockTodo(
          'todo-1',
          TodoStatus.ACTIVE,
          '장보기',
        );
        const completedTodo = createMockTodo(
          'todo-2',
          TodoStatus.COMPLETED,
          '운동하기',
        );

        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findByUserIdAndDate.mockResolvedValue([
          activeTodo,
          completedTodo,
        ]);
        mockTxTodoRepo.save.mockImplementation((todo) =>
          Promise.resolve({ id: todo.id ?? 'new-todo-1', ...todo }),
        );
        mockTxTodoRepo.create.mockImplementation((data) => ({
          id: 'new-todo-1',
          ...data,
        }));
        mockTxHistoryRepo.create.mockImplementation((data) => data);
        mockTxHistoryRepo.save.mockResolvedValue({
          id: 'history-1',
          fromTodoId: 'todo-1',
          toTodoId: 'new-todo-1',
        });

        const result = await usecase.execute({
          userAuthId: 'auth-id-1',
          date: '2026-03-28',
        });

        expect(result).toBeDefined();
        expect(result.date).toBe('2026-03-28');
        expect(result.carriedOverCount).toBe(1);
        expect(result.carriedOverTodos).toHaveLength(1);
        expect(result.carriedOverTodos[0].fromTodoId).toBe('todo-1');
        expect(result.carriedOverTodos[0].content).toBe('장보기');

        // 트랜잭션 내에서 실행 확인
        expect(mockDataSource.transaction).toHaveBeenCalled();

        // ACTIVE -> CARRIED_OVER 상태 변경 확인
        expect(mockTxTodoRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'todo-1',
            status: TodoStatus.CARRIED_OVER,
          }),
        );

        // 새로운 ACTIVE todo 생성 확인 (다음 날)
        expect(mockTxTodoRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-id-1',
            content: '장보기',
            status: TodoStatus.ACTIVE,
            todoDate: '2026-03-29',
          }),
        );

        // 이월 이력 생성 확인
        expect(mockTxHistoryRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            fromTodoId: 'todo-1',
          }),
        );
      });

      it('should not carry over COMPLETED todos', async () => {
        const completedTodo = createMockTodo(
          'todo-1',
          TodoStatus.COMPLETED,
          '운동하기',
        );

        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findByUserIdAndDate.mockResolvedValue([
          completedTodo,
        ]);

        const result = await usecase.execute({
          userAuthId: 'auth-id-1',
          date: '2026-03-28',
        });

        expect(result.carriedOverCount).toBe(0);
        expect(result.carriedOverTodos).toHaveLength(0);
        expect(mockDataSource.transaction).not.toHaveBeenCalled();
      });

      it('should not carry over INACTIVE todos', async () => {
        const inactiveTodo = createMockTodo(
          'todo-1',
          TodoStatus.INACTIVE,
          '나중에 할 일',
        );

        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findByUserIdAndDate.mockResolvedValue([
          inactiveTodo,
        ]);

        const result = await usecase.execute({
          userAuthId: 'auth-id-1',
          date: '2026-03-28',
        });

        expect(result.carriedOverCount).toBe(0);
        expect(mockDataSource.transaction).not.toHaveBeenCalled();
      });
    });

    describe('consecutive carry-over scenario', () => {
      it('should handle already CARRIED_OVER todos (skip them)', async () => {
        const carriedOverTodo = createMockTodo(
          'todo-1',
          TodoStatus.CARRIED_OVER,
          '이미 이월된 할 일',
        );
        const activeTodo = createMockTodo(
          'todo-2',
          TodoStatus.ACTIVE,
          '새 할 일',
        );

        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findByUserIdAndDate.mockResolvedValue([
          carriedOverTodo,
          activeTodo,
        ]);
        mockTxTodoRepo.save.mockImplementation((todo) =>
          Promise.resolve({ id: todo.id ?? 'new-todo-1', ...todo }),
        );
        mockTxTodoRepo.create.mockImplementation((data) => ({
          id: 'new-todo-1',
          ...data,
        }));
        mockTxHistoryRepo.create.mockImplementation((data) => data);
        mockTxHistoryRepo.save.mockResolvedValue({});

        const result = await usecase.execute({
          userAuthId: 'auth-id-1',
          date: '2026-03-28',
        });

        // 이미 CARRIED_OVER인 todo-1은 건너뛰고 ACTIVE인 todo-2만 이월
        expect(result.carriedOverCount).toBe(1);
        expect(result.carriedOverTodos[0].fromTodoId).toBe('todo-2');
      });
    });

    describe('stats calculation', () => {
      it('should return correct stats after completion', async () => {
        const todos = [
          createMockTodo('todo-1', TodoStatus.ACTIVE, '할 일 1'),
          createMockTodo('todo-2', TodoStatus.COMPLETED, '완료된 일'),
          createMockTodo('todo-3', TodoStatus.INACTIVE, '비활성 일'),
          createMockTodo('todo-4', TodoStatus.ACTIVE, '할 일 2'),
        ];

        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findByUserIdAndDate.mockResolvedValue(todos);
        mockTxTodoRepo.save.mockImplementation((todo) =>
          Promise.resolve({ id: todo.id ?? `new-${todo.content}`, ...todo }),
        );
        mockTxTodoRepo.create.mockImplementation((data) => ({
          id: `new-${data.content}`,
          ...data,
        }));
        mockTxHistoryRepo.create.mockImplementation((data) => data);
        mockTxHistoryRepo.save.mockResolvedValue({});

        const result = await usecase.execute({
          userAuthId: 'auth-id-1',
          date: '2026-03-28',
        });

        expect(result.stats).toBeDefined();
        expect(result.stats.total).toBe(4);
        expect(result.stats.completed).toBe(1);
        expect(result.carriedOverCount).toBe(2);
      });

      it('should exclude CARRIED_OVER from progressRate denominator', async () => {
        const todos = [
          createMockTodo('todo-1', TodoStatus.ACTIVE, '이월될 일'),
          createMockTodo('todo-2', TodoStatus.COMPLETED, '완료된 일'),
        ];

        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findByUserIdAndDate.mockResolvedValue(todos);
        mockTxTodoRepo.save.mockImplementation((todo) =>
          Promise.resolve({ id: todo.id ?? 'new-todo', ...todo }),
        );
        mockTxTodoRepo.create.mockImplementation((data) => ({
          id: 'new-todo',
          ...data,
        }));
        mockTxHistoryRepo.create.mockImplementation((data) => data);
        mockTxHistoryRepo.save.mockResolvedValue({});

        const result = await usecase.execute({
          userAuthId: 'auth-id-1',
          date: '2026-03-28',
        });

        // 이월 후: CARRIED_OVER 1, COMPLETED 1
        // progressRate = 1 / (2 - 1) * 100 = 100% (CARRIED_OVER 제외)
        expect(result.stats.progressRate).toBe(100);
      });
    });

    describe('duplicate carry-over prevention', () => {
      it('should skip todos that already have carry-over history', async () => {
        const activeTodo = createMockTodo(
          'todo-1',
          TodoStatus.ACTIVE,
          '이미 이월된 항목',
        );

        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findByUserIdAndDate.mockResolvedValue([activeTodo]);
        mockTxHistoryRepo.findOne.mockResolvedValue({
          id: 'history-1',
          fromTodoId: 'todo-1',
          toTodoId: 'existing-todo',
        });

        const result = await usecase.execute({
          userAuthId: 'auth-id-1',
          date: '2026-03-28',
        });

        expect(result.carriedOverCount).toBe(0);
        expect(mockTxTodoRepo.save).not.toHaveBeenCalled();
      });
    });

    describe('transaction safety', () => {
      it('should execute all carry-over operations within a transaction', async () => {
        const activeTodo = createMockTodo('todo-1', TodoStatus.ACTIVE, '할 일');

        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findByUserIdAndDate.mockResolvedValue([activeTodo]);
        mockTxTodoRepo.save.mockImplementation((todo) =>
          Promise.resolve({ id: todo.id ?? 'new-todo-1', ...todo }),
        );
        mockTxTodoRepo.create.mockImplementation((data) => ({
          id: 'new-todo-1',
          ...data,
        }));
        mockTxHistoryRepo.create.mockImplementation((data) => data);
        mockTxHistoryRepo.save.mockResolvedValue({});

        await usecase.execute({
          userAuthId: 'auth-id-1',
          date: '2026-03-28',
        });

        expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      });

      it('should not start transaction when no ACTIVE todos exist', async () => {
        const completedTodo = createMockTodo(
          'todo-1',
          TodoStatus.COMPLETED,
          '완료',
        );

        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findByUserIdAndDate.mockResolvedValue([
          completedTodo,
        ]);

        await usecase.execute({
          userAuthId: 'auth-id-1',
          date: '2026-03-28',
        });

        expect(mockDataSource.transaction).not.toHaveBeenCalled();
      });
    });

    describe('empty day', () => {
      it('should handle day with no todos', async () => {
        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findByUserIdAndDate.mockResolvedValue([]);

        const result = await usecase.execute({
          userAuthId: 'auth-id-1',
          date: '2026-03-28',
        });

        expect(result.carriedOverCount).toBe(0);
        expect(result.carriedOverTodos).toHaveLength(0);
        expect(result.stats.total).toBe(0);
      });
    });

    describe('authorization', () => {
      it('should throw error when user not found', async () => {
        mockUserRepository.findByUserAuthId.mockResolvedValue(null);

        await expect(
          usecase.execute({
            userAuthId: 'auth-id-1',
            date: '2026-03-28',
          }),
        ).rejects.toThrow();
      });
    });
  });
});
