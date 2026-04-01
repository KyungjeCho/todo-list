import { ChangeTodoStatusUsecase } from 'src/todo/application/change-todo-status.usecase';

describe('ChangeTodoStatusUsecase', () => {
  let usecase: ChangeTodoStatusUsecase;

  const mockTodoRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRepository = {
    findByUserAuthId: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new ChangeTodoStatusUsecase(
      mockTodoRepository as never,
      mockUserRepository as never,
    );
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    const mockUser = {
      id: 'user-id-1',
      userAuthId: 'auth-id-1',
    };

    const createMockTodo = (status: string) => ({
      id: 'todo-id-1',
      userId: 'user-id-1',
      content: '장보기',
      status,
      todoDate: '2026-03-28',
      memos: [],
      createdAt: new Date('2026-03-28T09:00:00Z'),
      updatedAt: new Date('2026-03-28T09:00:00Z'),
      canTransitionTo: jest.fn(),
      changeStatus: jest.fn(),
    });

    describe('valid transitions', () => {
      it('should change ACTIVE -> COMPLETED', async () => {
        const mockTodo = createMockTodo('ACTIVE');
        mockTodo.canTransitionTo.mockReturnValue(true);
        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findById.mockResolvedValue(mockTodo);
        mockTodoRepository.update.mockResolvedValue({
          ...mockTodo,
          status: 'COMPLETED',
        });

        const result = await usecase.execute({
          userAuthId: 'auth-id-1',
          todoId: 'todo-id-1',
          status: 'COMPLETED',
        });

        expect(result).toBeDefined();
        expect(result.status).toBe('COMPLETED');
        expect(mockTodo.changeStatus).toHaveBeenCalledWith('COMPLETED');
        expect(mockTodoRepository.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'todo-id-1',
            updatedBy: 'user-id-1',
          }),
        );
      });

      it('should change ACTIVE -> INACTIVE', async () => {
        const mockTodo = createMockTodo('ACTIVE');
        mockTodo.canTransitionTo.mockReturnValue(true);
        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findById.mockResolvedValue(mockTodo);
        mockTodoRepository.update.mockResolvedValue({
          ...mockTodo,
          status: 'INACTIVE',
        });

        const result = await usecase.execute({
          userAuthId: 'auth-id-1',
          todoId: 'todo-id-1',
          status: 'INACTIVE',
        });

        expect(result.status).toBe('INACTIVE');
        expect(mockTodo.changeStatus).toHaveBeenCalledWith('INACTIVE');
        expect(mockTodoRepository.update).toHaveBeenCalled();
      });

      it('should change INACTIVE -> ACTIVE', async () => {
        const mockTodo = createMockTodo('INACTIVE');
        mockTodo.canTransitionTo.mockReturnValue(true);
        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findById.mockResolvedValue(mockTodo);
        mockTodoRepository.update.mockResolvedValue({
          ...mockTodo,
          status: 'ACTIVE',
        });

        const result = await usecase.execute({
          userAuthId: 'auth-id-1',
          todoId: 'todo-id-1',
          status: 'ACTIVE',
        });

        expect(result.status).toBe('ACTIVE');
        expect(mockTodo.changeStatus).toHaveBeenCalledWith('ACTIVE');
        expect(mockTodoRepository.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'todo-id-1',
            updatedBy: 'user-id-1',
          }),
        );
      });

      it('should change COMPLETED -> ACTIVE', async () => {
        const mockTodo = createMockTodo('COMPLETED');
        mockTodo.canTransitionTo.mockReturnValue(true);
        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findById.mockResolvedValue(mockTodo);
        mockTodoRepository.update.mockResolvedValue({
          ...mockTodo,
          status: 'ACTIVE',
        });

        const result = await usecase.execute({
          userAuthId: 'auth-id-1',
          todoId: 'todo-id-1',
          status: 'ACTIVE',
        });

        expect(result.status).toBe('ACTIVE');
        expect(mockTodo.changeStatus).toHaveBeenCalledWith('ACTIVE');
        expect(mockTodoRepository.update).toHaveBeenCalled();
      });
    });

    describe('invalid transitions', () => {
      it('should reject INACTIVE -> COMPLETED', async () => {
        const mockTodo = createMockTodo('INACTIVE');
        mockTodo.canTransitionTo.mockReturnValue(false);
        mockTodo.changeStatus.mockImplementation(() => {
          throw new Error(
            'Invalid status transition from INACTIVE to COMPLETED',
          );
        });
        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findById.mockResolvedValue(mockTodo);

        await expect(
          usecase.execute({
            userAuthId: 'auth-id-1',
            todoId: 'todo-id-1',
            status: 'COMPLETED',
          }),
        ).rejects.toThrow();

        expect(mockTodoRepository.update).not.toHaveBeenCalled();
      });

      it('should reject CARRIED_OVER -> any status', async () => {
        const mockTodo = createMockTodo('CARRIED_OVER');
        mockTodo.canTransitionTo.mockReturnValue(false);
        mockTodo.changeStatus.mockImplementation(() => {
          throw new Error(
            'Invalid status transition from CARRIED_OVER to ACTIVE',
          );
        });
        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findById.mockResolvedValue(mockTodo);

        await expect(
          usecase.execute({
            userAuthId: 'auth-id-1',
            todoId: 'todo-id-1',
            status: 'ACTIVE',
          }),
        ).rejects.toThrow();

        expect(mockTodoRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('user cannot set CARRIED_OVER', () => {
      it('should reject CARRIED_OVER as target status', async () => {
        const mockTodo = createMockTodo('ACTIVE');
        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findById.mockResolvedValue(mockTodo);

        await expect(
          usecase.execute({
            userAuthId: 'auth-id-1',
            todoId: 'todo-id-1',
            status: 'CARRIED_OVER',
          }),
        ).rejects.toThrow();
      });
    });

    describe('authorization', () => {
      it('should throw error when todo not found', async () => {
        mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);
        mockTodoRepository.findById.mockResolvedValue(null);

        await expect(
          usecase.execute({
            userAuthId: 'auth-id-1',
            todoId: 'todo-id-1',
            status: 'COMPLETED',
          }),
        ).rejects.toThrow();
      });

      it('should throw error when user not found', async () => {
        mockUserRepository.findByUserAuthId.mockResolvedValue(null);

        await expect(
          usecase.execute({
            userAuthId: 'auth-id-1',
            todoId: 'todo-id-1',
            status: 'COMPLETED',
          }),
        ).rejects.toThrow();
      });

      it('should throw error when todo belongs to different user', async () => {
        const differentUser = { id: 'user-id-2', userAuthId: 'auth-id-1' };
        const mockTodo = createMockTodo('ACTIVE');
        mockUserRepository.findByUserAuthId.mockResolvedValue(differentUser);
        mockTodoRepository.findById.mockResolvedValue(mockTodo);

        await expect(
          usecase.execute({
            userAuthId: 'auth-id-1',
            todoId: 'todo-id-1',
            status: 'COMPLETED',
          }),
        ).rejects.toThrow();
      });
    });
  });
});
