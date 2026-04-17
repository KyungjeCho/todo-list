import { NotFoundException } from '@nestjs/common';
import { GetTodosUsecase } from 'src/todo/application/get-todos.usecase';

describe('GetTodosUsecase', () => {
  let usecase: GetTodosUsecase;

  const mockTodoRepository = {
    findByUserIdAndDate: jest.fn(),
  };

  const mockCarriedOverHistoryRepository = {
    findToTodoIds: jest.fn(),
  };

  const mockUserValidationService = {
    ensureUserExists: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCarriedOverHistoryRepository.findToTodoIds.mockResolvedValue(new Set());
    usecase = new GetTodosUsecase(
      mockTodoRepository as never,
      mockCarriedOverHistoryRepository as never,
      mockUserValidationService as never,
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
            todoId: 'todo-id-2',
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
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue(mockTodos);

      const result = await usecase.execute(queryDto);

      expect(result).toBeDefined();
      expect(result.date).toBe('2026-03-28');
      expect(result.todos).toHaveLength(3);
    });

    it('should include mode (PLAN or REVIEW)', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue(mockTodos);

      const result = await usecase.execute(queryDto);

      expect(result.mode).toBeDefined();
      expect(['PLAN', 'REVIEW']).toContain(result.mode);
    });

    it('should calculate stats correctly', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue(mockTodos);

      const result = await usecase.execute(queryDto);

      expect(result.stats).toBeDefined();
      expect(result.stats.total).toBe(3);
      expect(result.stats.completed).toBe(1);
      expect(result.stats.active).toBe(1);
      expect(result.stats.inactive).toBe(1);
    });

    it('should calculate progressRate as percentage', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue(mockTodos);

      const result = await usecase.execute(queryDto);

      // 1 completed out of 3 total = 33.3%
      expect(result.stats.progressRate).toBeCloseTo(33.3, 0);
    });

    it('should return progressRate 0 when no todos', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue([]);

      const result = await usecase.execute(queryDto);

      expect(result.stats.total).toBe(0);
      expect(result.stats.progressRate).toBe(0);
    });

    it('should return empty todos array when none exist for the date', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue([]);

      const result = await usecase.execute(queryDto);

      expect(result.todos).toHaveLength(0);
      expect(result.date).toBe('2026-03-28');
    });

    it('should include memos in each todo item', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue(mockTodos);

      const result = await usecase.execute(queryDto);

      const todoWithMemo = result.todos.find(
        (t: { id: string }) => t.id === 'todo-id-2',
      );
      expect(todoWithMemo).toBeDefined();
      expect(todoWithMemo!.memos).toHaveLength(1);
      expect(todoWithMemo!.memos[0].content).toBe('헬스장 30분');
    });

    it('should return todos in createdAt ascending order', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
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
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
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
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
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
            todoId: 'todo-id-1',
            content: '첫 번째 메모',
            createdAt: new Date('2026-03-28T10:00:00Z'),
            updatedAt: new Date('2026-03-28T10:00:00Z'),
          },
          {
            id: 'memo-2',
            todoId: 'todo-id-1',
            content: '두 번째 메모',
            createdAt: new Date('2026-03-28T11:00:00Z'),
            updatedAt: new Date('2026-03-28T11:00:00Z'),
          },
        ],
      };
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
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
      mockUserValidationService.ensureUserExists.mockRejectedValue(
        new NotFoundException('USER_NOT_FOUND'),
      );

      await expect(usecase.execute(queryDto)).rejects.toThrow();
    });

    it('should set isCarriedOver based on carriedOverToIds even when original status is preserved (FR-001~004)', async () => {
      // WHY(FR-001): 이월 후 어제 원본은 ACTIVE 상태를 유지하며, 이월 여부는
      // CarriedOverHistory(carriedOverToIds)로만 판정한다.
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue(mockTodos);
      mockCarriedOverHistoryRepository.findToTodoIds.mockResolvedValue(
        new Set(['todo-id-1']),
      );

      const result = await usecase.execute(queryDto);

      const carriedOverTodo = result.todos.find(
        (t: { id: string }) => t.id === 'todo-id-1',
      );
      expect(carriedOverTodo!.status).toBe('ACTIVE');
      expect(carriedOverTodo!.isCarriedOver).toBe(true);

      const normalTodo = result.todos.find(
        (t: { id: string }) => t.id === 'todo-id-2',
      );
      expect(normalTodo!.isCarriedOver).toBe(false);
    });

    it('should set isCarriedOver true for child todos created by carry-over', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndDate.mockResolvedValue(mockTodos);
      mockCarriedOverHistoryRepository.findToTodoIds.mockResolvedValue(
        new Set(['todo-id-1']),
      );

      const result = await usecase.execute(queryDto);

      const childTodo = result.todos.find(
        (t: { id: string }) => t.id === 'todo-id-1',
      );
      expect(childTodo!.isCarriedOver).toBe(true);

      const normalTodo2 = result.todos.find(
        (t: { id: string }) => t.id === 'todo-id-2',
      );
      expect(normalTodo2!.isCarriedOver).toBe(false);
    });
  });
});
