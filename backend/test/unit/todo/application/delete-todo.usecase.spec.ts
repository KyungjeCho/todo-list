import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeleteTodoUsecase } from 'src/todo/application/delete-todo.usecase';

describe('DeleteTodoUsecase', () => {
  let usecase: DeleteTodoUsecase;

  const mockTodoRepository = {
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
    usecase = new DeleteTodoUsecase(
      mockTodoRepository as never,
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
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        mockExistingTodo,
      );
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
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        mockExistingTodo,
      );
      mockTodoRepository.softDelete.mockResolvedValue({
        id: 'todo-id-1',
        deletedAt: new Date(),
      });

      await usecase.execute(deleteDto);

      expect(mockTodoRepository.softDelete).toHaveBeenCalledWith('todo-id-1');
    });

    it('should throw error when todo not found', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockRejectedValue(
        new NotFoundException('TODO_NOT_FOUND'),
      );

      await expect(usecase.execute(deleteDto)).rejects.toThrow();
    });

    it('should throw error when user not found', async () => {
      mockUserValidationService.ensureUserExists.mockRejectedValue(
        new NotFoundException('USER_NOT_FOUND'),
      );

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

    it('should allow deleting todo regardless of status', async () => {
      const completedTodo = { ...mockExistingTodo, status: 'COMPLETED' };
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        completedTodo,
      );
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
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        alreadyDeletedTodo,
      );

      await expect(usecase.execute(deleteDto)).rejects.toThrow();
      expect(mockTodoRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should propagate error when softDelete fails', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        mockExistingTodo,
      );
      mockTodoRepository.softDelete.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(usecase.execute(deleteDto)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should allow deleting INACTIVE todo', async () => {
      const inactiveTodo = { ...mockExistingTodo, status: 'INACTIVE' };
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        inactiveTodo,
      );
      mockTodoRepository.softDelete.mockResolvedValue({
        id: 'todo-id-1',
        deletedAt: new Date(),
      });

      const result = await usecase.execute(deleteDto);

      expect(result.id).toBe('todo-id-1');
    });
  });
});
