import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateMemoUsecase } from 'src/memo/application/update-memo.usecase';

describe('UpdateMemoUsecase', () => {
  let usecase: UpdateMemoUsecase;

  const mockMemoRepository = {
    findById: jest.fn(),
    findByIdAndTodoId: jest.fn(),
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
    usecase = new UpdateMemoUsecase(
      mockMemoRepository as never,
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
      memoId: 'memo-id-1',
      content: '수정된 메모',
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
      content: '원래 메모',
      createdAt: new Date('2026-03-31T09:00:00Z'),
      updatedAt: new Date('2026-03-31T09:00:00Z'),
    };

    it('should update memo content and return MemoResponse', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        mockTodo,
      );
      mockMemoRepository.findByIdAndTodoId.mockResolvedValue(mockExistingMemo);
      mockMemoRepository.update.mockResolvedValue({
        ...mockExistingMemo,
        content: '수정된 메모',
        updatedAt: new Date('2026-03-31T10:00:00Z'),
      });

      const result = await usecase.execute(updateDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('memo-id-1');
      expect(result.content).toBe('수정된 메모');
    });

    it('should call repository with correct update data', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        mockTodo,
      );
      mockMemoRepository.findByIdAndTodoId.mockResolvedValue(mockExistingMemo);
      mockMemoRepository.update.mockResolvedValue({
        ...mockExistingMemo,
        content: '수정된 메모',
      });

      await usecase.execute(updateDto);

      expect(mockMemoRepository.update).toHaveBeenCalledWith(
        'memo-id-1',
        expect.objectContaining({
          content: '수정된 메모',
        }),
      );
    });

    it('should throw error when user not found', async () => {
      mockUserValidationService.ensureUserExists.mockRejectedValue(
        new NotFoundException('USER_NOT_FOUND'),
      );

      await expect(usecase.execute(updateDto)).rejects.toThrow();
    });

    it('should throw error when todo not found', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockRejectedValue(
        new NotFoundException('TODO_NOT_FOUND'),
      );

      await expect(usecase.execute(updateDto)).rejects.toThrow();
    });

    it('should throw error when memo not found or does not belong to todo', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        mockTodo,
      );
      // findByIdAndTodoId returns null when memoId+todoId pair doesn't match
      mockMemoRepository.findByIdAndTodoId.mockResolvedValue(null);

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
        mockTodo,
      );
      mockMemoRepository.findByIdAndTodoId.mockResolvedValue(mockExistingMemo);

      await expect(
        usecase.execute({ ...updateDto, content: '' }),
      ).rejects.toThrow();
    });

    it('should set updatedBy from the user id', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoAuthorizationService.validateOwnership.mockResolvedValue(
        mockTodo,
      );
      mockMemoRepository.findByIdAndTodoId.mockResolvedValue(mockExistingMemo);
      mockMemoRepository.update.mockResolvedValue({
        ...mockExistingMemo,
        content: '수정된 메모',
      });

      await usecase.execute(updateDto);

      expect(mockMemoRepository.update).toHaveBeenCalledWith(
        'memo-id-1',
        expect.objectContaining({
          updatedBy: 'user-id-1',
        }),
      );
    });
  });
});
