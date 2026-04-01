import { UpdateTodoUsecase } from 'src/todo/application/update-todo.usecase';

describe('UpdateTodoUsecase', () => {
  let usecase: UpdateTodoUsecase;

  const mockTodoRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRepository = {
    findByUserAuthId: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new UpdateTodoUsecase(
      mockTodoRepository as never,
      mockUserRepository as never,
    );
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    const updateDto = {
      userAuthId: 'auth-id-1',
      todoId: 'todo-id-1',
      content: '수정된 할 일',
    };

    const mockUser = {
      id: 'user-id-1',
      userAuthId: 'auth-id-1',
    };

    const mockExistingTodo = {
      id: 'todo-id-1',
      userId: 'user-id-1',
      content: '원래 할 일',
      status: 'ACTIVE',
      todoDate: '2026-03-28',
      memos: [],
      createdAt: new Date('2026-03-28T09:00:00Z'),
      updatedAt: new Date('2026-03-28T09:00:00Z'),
    };

    it('should update todo content and return updated TodoItem', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockExistingTodo);
      mockTodoRepository.update.mockResolvedValue({
        ...mockExistingTodo,
        content: '수정된 할 일',
        updatedAt: new Date('2026-03-28T10:00:00Z'),
      });

      const result = await usecase.execute(updateDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('todo-id-1');
      expect(result.content).toBe('수정된 할 일');
    });

    it('should call repository with correct update data', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockExistingTodo);
      mockTodoRepository.update.mockResolvedValue({
        ...mockExistingTodo,
        content: '수정된 할 일',
      });

      await usecase.execute(updateDto);

      expect(mockTodoRepository.update).toHaveBeenCalledWith(
        'todo-id-1',
        expect.objectContaining({
          content: '수정된 할 일',
        }),
      );
    });

    it('should throw error when todo not found', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(null);

      await expect(usecase.execute(updateDto)).rejects.toThrow();
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(null);

      await expect(usecase.execute(updateDto)).rejects.toThrow();
    });

    it('should throw error when todo belongs to different user', async () => {
      const differentUser = { id: 'user-id-2', userAuthId: 'auth-id-1' };
      mockUserRepository.findByUserAuthId.mockResolvedValue(differentUser);
      mockTodoRepository.findById.mockResolvedValue(mockExistingTodo);

      await expect(usecase.execute(updateDto)).rejects.toThrow();
    });

    it('should throw error for empty content', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockExistingTodo);

      await expect(
        usecase.execute({ ...updateDto, content: '' }),
      ).rejects.toThrow();
    });

    it('should throw error for content exceeding 255 characters', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockExistingTodo);

      const longContent = 'a'.repeat(256);
      await expect(
        usecase.execute({ ...updateDto, content: longContent }),
      ).rejects.toThrow();
    });

    it('should set updatedBy from user id', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockExistingTodo);
      mockTodoRepository.update.mockResolvedValue({
        ...mockExistingTodo,
        content: '수정된 할 일',
      });

      await usecase.execute(updateDto);

      expect(mockTodoRepository.update).toHaveBeenCalledWith(
        'todo-id-1',
        expect.objectContaining({
          updatedBy: 'user-id-1',
        }),
      );
    });
  });
});
