import { NotFoundException } from '@nestjs/common';
import { BatchCreateTodoUsecase } from 'src/todo/application/batch-create-todo.usecase';

describe('BatchCreateTodoUsecase', () => {
  let usecase: BatchCreateTodoUsecase;

  const mockUserValidationService = {
    ensureUserExists: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new BatchCreateTodoUsecase(
      mockUserValidationService as never,
      mockDataSource as never,
    );
  });

  const mockUser = { id: 'user-id-1' };

  it('여러 할 일을 트랜잭션으로 일괄 생성하여 반환한다', async () => {
    mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);

    const createdTodos = [
      {
        id: 'todo-1',
        content: '장보기',
        todoDate: '2026-04-04',
        status: 'ACTIVE',
        isCarriedOver: false,
        memos: [],
        createdAt: new Date('2026-04-04T10:00:00Z'),
        updatedAt: new Date('2026-04-04T10:00:00Z'),
      },
      {
        id: 'todo-2',
        content: '운동하기',
        todoDate: '2026-04-04',
        status: 'ACTIVE',
        isCarriedOver: false,
        memos: [],
        createdAt: new Date('2026-04-04T10:00:00Z'),
        updatedAt: new Date('2026-04-04T10:00:00Z'),
      },
    ];

    mockDataSource.transaction.mockImplementation(
      async (cb: (manager: unknown) => Promise<unknown>) => {
        let callIndex = 0;
        const mockRepo = {
          create: jest.fn().mockImplementation((data: unknown) => data),
          save: jest.fn().mockImplementation(() => {
            return createdTodos[callIndex];
          }),
          findOne: jest.fn().mockImplementation(() => {
            const todo = createdTodos[callIndex];
            callIndex++;
            return todo;
          }),
        };
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockRepo),
        };
        return cb(mockManager);
      },
    );

    const result = await usecase.execute({
      userAuthId: 'test-user-auth-id',
      todos: [
        { content: '장보기', todoDate: '2026-04-04' },
        { content: '운동하기', todoDate: '2026-04-04' },
      ],
    });

    expect(result.created).toHaveLength(2);
    expect(result.created[0]).toEqual(
      expect.objectContaining({
        id: 'todo-1',
        content: '장보기',
      }),
    );
    expect(mockUserValidationService.ensureUserExists).toHaveBeenCalledWith(
      'test-user-auth-id',
    );
  });

  it('사용자가 존재하지 않으면 NotFoundException을 throw한다', async () => {
    mockUserValidationService.ensureUserExists.mockRejectedValue(
      new NotFoundException('USER_NOT_FOUND'),
    );

    await expect(
      usecase.execute({
        userAuthId: 'non-existent',
        todos: [{ content: '장보기', todoDate: '2026-04-04' }],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('트랜잭션 실패 시 에러를 전파한다', async () => {
    mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
    mockDataSource.transaction.mockRejectedValue(
      new Error('Transaction failed'),
    );

    await expect(
      usecase.execute({
        userAuthId: 'test-user-auth-id',
        todos: [{ content: '장보기', todoDate: '2026-04-04' }],
      }),
    ).rejects.toThrow('Transaction failed');
  });
});
