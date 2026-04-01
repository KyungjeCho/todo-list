import { CreateMemoUsecase } from 'src/memo/application/create-memo.usecase';

describe('CreateMemoUsecase', () => {
  let usecase: CreateMemoUsecase;

  const mockMemoRepository = {
    create: jest.fn(),
  };

  const mockTodoRepository = {
    findById: jest.fn(),
  };

  const mockUserRepository = {
    findByUserAuthId: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new CreateMemoUsecase(
      mockMemoRepository as never,
      mockTodoRepository as never,
      mockUserRepository as never,
    );
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    const createDto = {
      userAuthId: 'auth-id-1',
      todoId: 'todo-id-1',
      content: '회의 메모입니다',
    };

    const mockUser = {
      id: 'user-id-1',
      userAuthId: 'auth-id-1',
    };

    const mockTodo = {
      id: 'todo-id-1',
      userId: 'user-id-1',
      content: '장보기',
      status: 'ACTIVE',
      todoDate: '2026-03-31',
    };

    it('should create a memo and return MemoResponse', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockTodo);
      mockMemoRepository.create.mockResolvedValue({
        id: 'memo-id-1',
        todoId: 'todo-id-1',
        content: '회의 메모입니다',
        createdAt: new Date('2026-03-31T09:00:00Z'),
        updatedAt: new Date('2026-03-31T09:00:00Z'),
      });

      const result = await usecase.execute(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('memo-id-1');
      expect(result.todoId).toBe('todo-id-1');
      expect(result.content).toBe('회의 메모입니다');
    });

    it('should call memoRepository.create with correct data', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockTodo);
      mockMemoRepository.create.mockResolvedValue({
        id: 'memo-id-1',
        todoId: 'todo-id-1',
        content: '회의 메모입니다',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await usecase.execute(createDto);

      expect(mockMemoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          todoId: 'todo-id-1',
          content: '회의 메모입니다',
          createdBy: 'user-id-1',
        }),
      );
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(null);

      await expect(usecase.execute(createDto)).rejects.toThrow();
    });

    it('should throw error when todo not found', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(null);

      await expect(usecase.execute(createDto)).rejects.toThrow();
    });

    it('should throw error when todo belongs to different user', async () => {
      const differentUser = { id: 'user-id-2', userAuthId: 'auth-id-1' };
      mockUserRepository.findByUserAuthId.mockResolvedValue(differentUser);
      mockTodoRepository.findById.mockResolvedValue(mockTodo);

      await expect(usecase.execute(createDto)).rejects.toThrow();
    });

    it('should throw error for empty content', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockTodo);

      await expect(
        usecase.execute({ ...createDto, content: '' }),
      ).rejects.toThrow();
    });

    it('should set createdBy from the user id', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockTodo);
      mockMemoRepository.create.mockResolvedValue({
        id: 'memo-id-1',
        todoId: 'todo-id-1',
        content: '메모',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await usecase.execute(createDto);

      expect(mockMemoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'user-id-1',
        }),
      );
    });
  });
});
