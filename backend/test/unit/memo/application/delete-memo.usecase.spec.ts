import { DeleteMemoUsecase } from 'src/memo/application/delete-memo.usecase';

describe('DeleteMemoUsecase', () => {
  let usecase: DeleteMemoUsecase;

  const mockMemoRepository = {
    findById: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockTodoRepository = {
    findById: jest.fn(),
  };

  const mockUserRepository = {
    findByUserAuthId: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new DeleteMemoUsecase(
      mockMemoRepository as never,
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
      memoId: 'memo-id-1',
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

    const mockExistingMemo = {
      id: 'memo-id-1',
      todoId: 'todo-id-1',
      content: '삭제할 메모',
      createdAt: new Date('2026-03-31T09:00:00Z'),
      updatedAt: new Date('2026-03-31T09:00:00Z'),
      deletedAt: null,
    };

    it('should soft-delete memo and return DeleteMemoResponse', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockTodo);
      mockMemoRepository.findById.mockResolvedValue(mockExistingMemo);
      const deletedAt = new Date('2026-03-31T15:00:00Z');
      mockMemoRepository.softDelete.mockResolvedValue({
        id: 'memo-id-1',
        deletedAt,
      });

      const result = await usecase.execute(deleteDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('memo-id-1');
      expect(result.deletedAt).toBeDefined();
    });

    it('should call repository softDelete with memo id', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockTodo);
      mockMemoRepository.findById.mockResolvedValue(mockExistingMemo);
      mockMemoRepository.softDelete.mockResolvedValue({
        id: 'memo-id-1',
        deletedAt: new Date(),
      });

      await usecase.execute(deleteDto);

      expect(mockMemoRepository.softDelete).toHaveBeenCalledWith('memo-id-1');
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(null);

      await expect(usecase.execute(deleteDto)).rejects.toThrow();
    });

    it('should throw error when todo not found', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(null);

      await expect(usecase.execute(deleteDto)).rejects.toThrow();
    });

    it('should throw error when memo not found', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockTodo);
      mockMemoRepository.findById.mockResolvedValue(null);

      await expect(usecase.execute(deleteDto)).rejects.toThrow();
    });

    it('should throw error when todo belongs to different user', async () => {
      const differentUser = { id: 'user-id-2', userAuthId: 'auth-id-1' };
      mockUserRepository.findByUserAuthId.mockResolvedValue(differentUser);
      mockTodoRepository.findById.mockResolvedValue(mockTodo);

      await expect(usecase.execute(deleteDto)).rejects.toThrow();
    });

    it('should throw error when memo does not belong to the todo', async () => {
      const memoFromDifferentTodo = {
        ...mockExistingMemo,
        todoId: 'todo-id-999',
      };
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockTodo);
      mockMemoRepository.findById.mockResolvedValue(memoFromDifferentTodo);

      await expect(usecase.execute(deleteDto)).rejects.toThrow();
    });

    it('should propagate error when softDelete fails', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockTodo);
      mockMemoRepository.findById.mockResolvedValue(mockExistingMemo);
      mockMemoRepository.softDelete.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(usecase.execute(deleteDto)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
