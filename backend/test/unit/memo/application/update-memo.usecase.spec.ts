import { UpdateMemoUsecase } from 'src/memo/application/update-memo.usecase';

describe('UpdateMemoUsecase', () => {
  let usecase: UpdateMemoUsecase;

  const mockMemoRepository = {
    findById: jest.fn(),
    findByIdAndTodoId: jest.fn(),
    update: jest.fn(),
  };

  const mockTodoRepository = {
    findById: jest.fn(),
  };

  const mockUserRepository = {
    findByUserAuthId: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new UpdateMemoUsecase(
      mockMemoRepository as never,
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
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockTodo);
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
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockTodo);
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
      mockUserRepository.findByUserAuthId.mockResolvedValue(null);

      await expect(usecase.execute(updateDto)).rejects.toThrow();
    });

    it('should throw error when todo not found', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(null);

      await expect(usecase.execute(updateDto)).rejects.toThrow();
    });

    it('should throw error when memo not found or does not belong to todo', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockTodo);
      // findByIdAndTodoId returns null when memoId+todoId pair doesn't match
      mockMemoRepository.findByIdAndTodoId.mockResolvedValue(null);

      await expect(usecase.execute(updateDto)).rejects.toThrow();
    });

    it('should throw error when todo belongs to different user', async () => {
      const differentUser = { id: 'user-id-2', userAuthId: 'auth-id-1' };
      mockUserRepository.findByUserAuthId.mockResolvedValue(differentUser);
      mockTodoRepository.findById.mockResolvedValue(mockTodo);

      await expect(usecase.execute(updateDto)).rejects.toThrow();
    });

    it('should throw error for empty content', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockTodo);
      mockMemoRepository.findByIdAndTodoId.mockResolvedValue(mockExistingMemo);

      await expect(
        usecase.execute({ ...updateDto, content: '' }),
      ).rejects.toThrow();
    });

    it('should set updatedBy from the user id', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
      mockTodoRepository.findById.mockResolvedValue(mockTodo);
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
