import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateTodoUsecase } from 'src/todo/application/update-todo.usecase';

describe('UpdateTodoUsecase', () => {
  let usecase: UpdateTodoUsecase;

  const mockTodoRepository = {
    update: jest.fn(),
  };

  const mockUserValidationService = {
    ensureUserExists: jest.fn(),
  };

  const mockTodoAuthorizationService = {
    validateOwnership: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new UpdateTodoUsecase(
      mockTodoRepository as never,
      mockUserValidationService as never,
      mockTodoAuthorizationService as never,
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
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        mockExistingTodo,
      );
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
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        mockExistingTodo,
      );
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
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockRejectedValue(
        new NotFoundException('TODO_NOT_FOUND'),
      );

      await expect(usecase.execute(updateDto)).rejects.toThrow();
    });

    it('should throw error when user not found', async () => {
      mockUserValidationService.ensureUserExists.mockRejectedValue(
        new NotFoundException('USER_NOT_FOUND'),
      );

      await expect(usecase.execute(updateDto)).rejects.toThrow();
    });

    it('should throw error when todo belongs to different user', async () => {
      const differentUser = { id: 'user-id-2', userAuthId: 'auth-id-1' };
      mockUserValidationService.ensureUserExists.mockResolvedValue(
        differentUser,
      );
      mockTodoAuthorizationService.validateOwnership.mockRejectedValue(
        new ForbiddenException('FORBIDDEN'),
      );

      await expect(usecase.execute(updateDto)).rejects.toThrow();
    });

    it('should throw error for empty content', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        mockExistingTodo,
      );

      await expect(
        usecase.execute({ ...updateDto, content: '' }),
      ).rejects.toThrow();
    });

    it('should throw error for content exceeding 255 characters', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        mockExistingTodo,
      );

      const longContent = 'a'.repeat(256);
      await expect(
        usecase.execute({ ...updateDto, content: longContent }),
      ).rejects.toThrow();
    });

    it('should set updatedBy from user id', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        mockExistingTodo,
      );
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
