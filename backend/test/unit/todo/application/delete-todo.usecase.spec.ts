import { DeleteTodoUsecase } from 'src/todo/application/delete-todo.usecase';

describe('DeleteTodoUsecase', () => {
  let usecase: DeleteTodoUsecase;

  const mockTodoRepository = {
    findById: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockUserRepository = {
    findByUserAuthId: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new DeleteTodoUsecase(
      mockTodoRepository as never,
      mockUserRepository as never,
    );
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    const deleteDto = {
      userAuthId: 'auth-id-1',
      todoId: 'todo-id-1',
    };

    const mockUser = {
      id: 'user-id-1',
      userAuthId: 'auth-id-1',
    };

    const mockExistingTodo = {
      id: 'todo-id-1',
      userId: 'user-id-1',
      content: '장보기',
      status: 'ACTIVE',
      todoDate: '2026-03-28',
      createdAt: new Date('2026-03-28T09:00:00Z'),
      updatedAt: new Date('2026-03-28T09:00:00Z'),
    };

    it('should soft-delete todo and return DeleteTodoResponse', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockExistingTodo);
      const deletedAt = new Date('2026-03-28T15:00:00Z');
      mockTodoRepository.softDelete.mockResolvedValue({
        id: 'todo-id-1',
        deletedAt,
      });

      const result = await usecase.execute(deleteDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('todo-id-1');
      expect(result.deletedAt).toBeDefined();
    });

    it('should call repository softDelete with todo id', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockExistingTodo);
      mockTodoRepository.softDelete.mockResolvedValue({
        id: 'todo-id-1',
        deletedAt: new Date(),
      });

      await usecase.execute(deleteDto);

      expect(mockTodoRepository.softDelete).toHaveBeenCalledWith('todo-id-1');
    });

    it('should throw error when todo not found', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(null);

      await expect(usecase.execute(deleteDto)).rejects.toThrow();
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(null);

      await expect(usecase.execute(deleteDto)).rejects.toThrow();
    });

    it('should throw error when todo belongs to different user', async () => {
      const differentUser = { id: 'user-id-2', userAuthId: 'auth-id-1' };
      mockUserRepository.findByUserAuthId.mockResolvedValue(differentUser);
      mockTodoRepository.findById.mockResolvedValue(mockExistingTodo);

      await expect(usecase.execute(deleteDto)).rejects.toThrow();
    });

    it('should allow deleting todo regardless of status', async () => {
      const completedTodo = { ...mockExistingTodo, status: 'COMPLETED' };
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(completedTodo);
      mockTodoRepository.softDelete.mockResolvedValue({
        id: 'todo-id-1',
        deletedAt: new Date(),
      });

      const result = await usecase.execute(deleteDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('todo-id-1');
    });

    it('should throw error when todo is already soft-deleted', async () => {
      const alreadyDeletedTodo = {
        ...mockExistingTodo,
        deletedAt: new Date('2026-03-28T10:00:00Z'),
      };
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(alreadyDeletedTodo);

      await expect(usecase.execute(deleteDto)).rejects.toThrow();
      expect(mockTodoRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should propagate error when softDelete fails', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockExistingTodo);
      mockTodoRepository.softDelete.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(usecase.execute(deleteDto)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should allow deleting INACTIVE todo', async () => {
      const inactiveTodo = { ...mockExistingTodo, status: 'INACTIVE' };
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(inactiveTodo);
      mockTodoRepository.softDelete.mockResolvedValue({
        id: 'todo-id-1',
        deletedAt: new Date(),
      });

      const result = await usecase.execute(deleteDto);

      expect(result.id).toBe('todo-id-1');
    });
  });
});
