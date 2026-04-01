import { CreateTodoUsecase } from 'src/todo/application/create-todo.usecase';

describe('CreateTodoUsecase', () => {
  let usecase: CreateTodoUsecase;

  const mockTodoRepository = {
    create: jest.fn(),
    findById: jest.fn(),
  };

  const mockUserRepository = {
    findByUserAuthId: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new CreateTodoUsecase(
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
      content: '장보기',
      todoDate: '2026-03-28',
    };

    const mockUser = {
      id: 'user-id-1',
      userAuthId: 'auth-id-1',
    };

    it('should create a todo and return TodoItem', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.create.mockResolvedValue({
        id: 'todo-id-1',
        userId: 'user-id-1',
        content: '장보기',
        status: 'ACTIVE',
        todoDate: '2026-03-28',
        memos: [],
        createdAt: new Date('2026-03-28T09:00:00Z'),
        updatedAt: new Date('2026-03-28T09:00:00Z'),
      });

      const result = await usecase.execute(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('todo-id-1');
      expect(result.content).toBe('장보기');
      expect(result.status).toBe('ACTIVE');
      expect(result.todoDate).toBe('2026-03-28');
      expect(mockTodoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id-1',
          content: '장보기',
          todoDate: '2026-03-28',
          status: 'ACTIVE',
        }),
      );
    });

    it('should default todoDate to today if not provided', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-15T14:30:00Z'));

      try {
        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.create.mockResolvedValue({
          id: 'todo-id-1',
          userId: 'user-id-1',
          content: '운동하기',
          status: 'ACTIVE',
          todoDate: '2026-04-15',
          memos: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const dtoWithoutDate = {
          userAuthId: 'auth-id-1',
          content: '운동하기',
        };

        await usecase.execute(dtoWithoutDate);

        expect(mockTodoRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            content: '운동하기',
            status: 'ACTIVE',
            todoDate: '2026-04-15',
          }),
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('should set initial status to ACTIVE', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.create.mockResolvedValue({
        id: 'todo-id-1',
        userId: 'user-id-1',
        content: '장보기',
        status: 'ACTIVE',
        todoDate: '2026-03-28',
        memos: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await usecase.execute(createDto);

      expect(result.status).toBe('ACTIVE');
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(null);

      await expect(usecase.execute(createDto)).rejects.toThrow();
    });

    it('should throw error for empty content', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);

      await expect(
        usecase.execute({ ...createDto, content: '' }),
      ).rejects.toThrow();
    });

    it('should throw error for content exceeding 255 characters', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);

      const longContent = 'a'.repeat(256);
      await expect(
        usecase.execute({ ...createDto, content: longContent }),
      ).rejects.toThrow();
    });

    it('should assign createdBy from the user id', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.create.mockResolvedValue({
        id: 'todo-id-1',
        userId: 'user-id-1',
        content: '장보기',
        status: 'ACTIVE',
        todoDate: '2026-03-28',
        memos: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await usecase.execute(createDto);

      expect(mockTodoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'user-id-1',
        }),
      );
    });
  });
});
