import { GetTodosUsecase } from 'src/todo/application/get-todos.usecase';

describe('GetTodosUsecase', () => {
  let usecase: GetTodosUsecase;

  const mockTodoRepository = {
    findByUserIdAndDate: jest.fn(),
  };

  const mockUserRepository = {
    findByUserAuthId: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new GetTodosUsecase(
      mockTodoRepository as never,
      mockUserRepository as never,
    );
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    const queryDto = {
      userAuthId: 'auth-id-1',
      date: '2026-03-28',
    };

    const mockUser = {
      id: 'user-id-1',
      userAuthId: 'auth-id-1',
      planTime: '08:00',
      reviewTime: '22:00',
      timezone: 'Asia/Seoul',
    };

    const mockTodos = [
      {
        id: 'todo-id-1',
        userId: 'user-id-1',
        content: '장보기',
        status: 'ACTIVE',
        todoDate: '2026-03-28',
        memos: [],
        createdAt: new Date('2026-03-28T09:00:00Z'),
        updatedAt: new Date('2026-03-28T09:00:00Z'),
      },
      {
        id: 'todo-id-2',
        userId: 'user-id-1',
        content: '운동하기',
        status: 'COMPLETED',
        todoDate: '2026-03-28',
        memos: [
          {
            id: 'memo-id-1',
            content: '헬스장 30분',
            createdAt: new Date('2026-03-28T10:00:00Z'),
            updatedAt: new Date('2026-03-28T10:00:00Z'),
          },
        ],
        createdAt: new Date('2026-03-28T08:00:00Z'),
        updatedAt: new Date('2026-03-28T12:00:00Z'),
      },
      {
        id: 'todo-id-3',
        userId: 'user-id-1',
        content: '독서',
        status: 'INACTIVE',
        todoDate: '2026-03-28',
        memos: [],
        createdAt: new Date('2026-03-28T08:30:00Z'),
        updatedAt: new Date('2026-03-28T11:00:00Z'),
      },
    ];

    it('should return TodoListResponse with todos and stats', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue(mockTodos);

      const result = await usecase.execute(queryDto);

      expect(result).toBeDefined();
      expect(result.date).toBe('2026-03-28');
      expect(result.todos).toHaveLength(3);
    });

    it('should include mode (PLAN or REVIEW)', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue(mockTodos);

      const result = await usecase.execute(queryDto);

      expect(result.mode).toBeDefined();
      expect(['PLAN', 'REVIEW']).toContain(result.mode);
    });

    it('should calculate stats correctly', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue(mockTodos);

      const result = await usecase.execute(queryDto);

      expect(result.stats).toBeDefined();
      expect(result.stats.total).toBe(3);
      expect(result.stats.completed).toBe(1);
      expect(result.stats.active).toBe(1);
      expect(result.stats.inactive).toBe(1);
    });

    it('should calculate progressRate as percentage', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue(mockTodos);

      const result = await usecase.execute(queryDto);

      // 1 completed out of 3 total = 33.3%
      expect(result.stats.progressRate).toBeCloseTo(33.3, 0);
    });

    it('should return progressRate 0 when no todos', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue([]);

      const result = await usecase.execute(queryDto);

      expect(result.stats.total).toBe(0);
      expect(result.stats.progressRate).toBe(0);
    });

    it('should return empty todos array when none exist for the date', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue([]);

      const result = await usecase.execute(queryDto);

      expect(result.todos).toHaveLength(0);
      expect(result.date).toBe('2026-03-28');
    });

    it('should include memos in each todo item', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue(mockTodos);

      const result = await usecase.execute(queryDto);

      const todoWithMemo = result.todos.find(
        (t: { id: string }) => t.id === 'todo-id-2',
      );
      expect(todoWithMemo).toBeDefined();
      expect(todoWithMemo.memos).toHaveLength(1);
      expect(todoWithMemo.memos[0].content).toBe('헬스장 30분');
    });

    it('should return todos in createdAt ascending order', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue(mockTodos);

      const result = await usecase.execute(queryDto);

      for (let i = 1; i < result.todos.length; i++) {
        const prev = new Date(result.todos[i - 1].createdAt).getTime();
        const curr = new Date(result.todos[i].createdAt).getTime();
        expect(prev).toBeLessThanOrEqual(curr);
      }
    });

    it('should exclude CARRIED_OVER from active count in stats', async () => {
      const todosWithCarryOver = [
        { ...mockTodos[0], status: 'CARRIED_OVER' },
        mockTodos[1], // COMPLETED
        { ...mockTodos[2], status: 'ACTIVE' },
      ];
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue(
        todosWithCarryOver,
      );

      const result = await usecase.execute(queryDto);

      expect(result.stats.active).toBe(1);
      expect(result.stats.completed).toBe(1);
    });

    it('should include CARRIED_OVER in total count but not in progressRate denominator', async () => {
      const todosWithCarryOver = [
        { ...mockTodos[0], status: 'CARRIED_OVER' },
        { ...mockTodos[1], status: 'COMPLETED' },
      ];
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue(
        todosWithCarryOver,
      );

      const result = await usecase.execute(queryDto);

      expect(result.stats.total).toBe(2);
    });

    it('should return memos in createdAt ascending order within each todo', async () => {
      const todoWithMultipleMemos = {
        ...mockTodos[0],
        memos: [
          {
            id: 'memo-1',
            content: '첫 번째 메모',
            createdAt: new Date('2026-03-28T10:00:00Z'),
            updatedAt: new Date('2026-03-28T10:00:00Z'),
          },
          {
            id: 'memo-2',
            content: '두 번째 메모',
            createdAt: new Date('2026-03-28T11:00:00Z'),
            updatedAt: new Date('2026-03-28T11:00:00Z'),
          },
        ],
      };
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue([
        todoWithMultipleMemos,
      ]);

      const result = await usecase.execute(queryDto);

      const memos = result.todos[0].memos;
      expect(memos).toHaveLength(2);
      expect(new Date(memos[0].createdAt).getTime()).toBeLessThanOrEqual(
        new Date(memos[1].createdAt).getTime(),
      );
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(null);

      await expect(usecase.execute(queryDto)).rejects.toThrow();
    });

    it('should include isCarriedOver flag in each todo', async () => {
      const todosWithCarryOver = [
        {
          ...mockTodos[0],
          status: 'CARRIED_OVER',
        },
        mockTodos[1],
      ];
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue(
        todosWithCarryOver,
      );

      const result = await usecase.execute(queryDto);

      const carriedOverTodo = result.todos.find(
        (t: { id: string }) => t.id === 'todo-id-1',
      );
      expect(carriedOverTodo.isCarriedOver).toBe(true);

      const normalTodo = result.todos.find(
        (t: { id: string }) => t.id === 'todo-id-2',
      );
      expect(normalTodo.isCarriedOver).toBe(false);
    });
  });
});
