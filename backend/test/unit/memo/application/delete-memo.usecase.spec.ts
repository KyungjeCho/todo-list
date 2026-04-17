import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeleteMemoUsecase } from 'src/memo/application/delete-memo.usecase';

describe('DeleteMemoUsecase', () => {
  let usecase: DeleteMemoUsecase;

  const mockMemoRepository = {
    findById: jest.fn(),
    findByIdAndTodoId: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockUserValidationService = {
    ensureUserExists: jest.fn(),
  };

  const mockTodoAuthorizationService = {
    validateOwnership: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new DeleteMemoUsecase(
      mockMemoRepository as never,
      mockUserValidationService as never,
      mockTodoAuthorizationService as never,
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
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        mockTodo,
      );
      mockMemoRepository.findByIdAndTodoId.mockResolvedValue(mockExistingMemo);
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
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        mockTodo,
      );
      mockMemoRepository.findByIdAndTodoId.mockResolvedValue(mockExistingMemo);
      mockMemoRepository.softDelete.mockResolvedValue({
        id: 'memo-id-1',
        deletedAt: new Date(),
      });

      await usecase.execute(deleteDto);

      expect(mockMemoRepository.softDelete).toHaveBeenCalledWith('memo-id-1');
    });

    it('should throw error when user not found', async () => {
      mockUserValidationService.ensureUserExists.mockRejectedValue(
        new NotFoundException('USER_NOT_FOUND'),
      );

      await expect(usecase.execute(deleteDto)).rejects.toThrow();
    });

    it('should throw error when todo not found', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockRejectedValue(
        new NotFoundException('TODO_NOT_FOUND'),
      );

      await expect(usecase.execute(deleteDto)).rejects.toThrow();
    });

    it('should throw error when memo not found or does not belong to todo', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        mockTodo,
      );
      mockMemoRepository.findByIdAndTodoId.mockResolvedValue(null);

      await expect(usecase.execute(deleteDto)).rejects.toThrow();
    });

    it('should throw error when todo belongs to different user', async () => {
      const differentUser = { id: 'user-id-2', userAuthId: 'auth-id-1' };
      mockUserValidationService.ensureUserExists.mockResolvedValue(
        differentUser,
      );
      mockTodoAuthorizationService.validateOwnership.mockRejectedValue(
        new ForbiddenException('FORBIDDEN'),
      );

      await expect(usecase.execute(deleteDto)).rejects.toThrow();
    });

    it('should propagate error when softDelete fails', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        mockTodo,
      );
      mockMemoRepository.findByIdAndTodoId.mockResolvedValue(mockExistingMemo);
      mockMemoRepository.softDelete.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(usecase.execute(deleteDto)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
