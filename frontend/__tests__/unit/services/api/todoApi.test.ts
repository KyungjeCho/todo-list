import { apiClient, ApiError } from 'src/services/api/client';
import { todoApi } from 'src/services/api/todoApi';
import type { CreateTodoRequest, Todo } from 'src/types/todo';

jest.mock('src/services/api/client', () => {
  class MockApiError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly timestamp: string;
    constructor(statusCode: number, code: string, message: string) {
      super(message);
      this.name = 'ApiError';
      this.statusCode = statusCode;
      this.code = code;
      this.timestamp = new Date().toISOString();
    }
  }
  return {
    apiClient: {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    },
    ApiError: MockApiError,
  };
});

const mockedClient = apiClient as jest.Mocked<typeof apiClient>;

const mockTodoItem: Todo = {
  id: 'todo-uuid-1',
  todoDate: '2026-03-28',
  content: '프로젝트 회의 준비',
  status: 'ACTIVE',
  isCarriedOver: false,
  memos: [],
  createdAt: '2026-03-28T09:00:00.000Z',
  updatedAt: '2026-03-28T09:00:00.000Z',
};

const mockTodoListResponse = {
  date: '2026-03-28',
  mode: 'PLAN' as const,
  stats: {
    total: 3,
    completed: 1,
    active: 2,
    inactive: 0,
    progressRate: 33.3,
  },
  todos: [mockTodoItem],
};

describe('TodoApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTodos', () => {
    it('날짜를 쿼리 파라미터로 전달하여 할 일 목록을 조회한다', async () => {
      mockedClient.get.mockResolvedValue({ data: mockTodoListResponse });

      const result = await todoApi.getTodos('2026-03-28');

      expect(mockedClient.get).toHaveBeenCalledWith('/todos', {
        params: { date: '2026-03-28' },
      });
      expect(result).toEqual(mockTodoListResponse);
    });

    it('API 에러 시 예외를 전파한다', async () => {
      mockedClient.get.mockRejectedValue(new Error('Network Error'));

      await expect(todoApi.getTodos('2026-03-28')).rejects.toThrow(
        'Network Error',
      );
    });
  });

  describe('createTodo', () => {
    it('할 일 생성 요청을 전송한다', async () => {
      mockedClient.post.mockResolvedValue({ data: mockTodoItem });

      const request: CreateTodoRequest = {
        content: '프로젝트 회의 준비',
        todoDate: '2026-03-28',
      };

      const result = await todoApi.createTodo(request);

      expect(mockedClient.post).toHaveBeenCalledWith('/todos', request);
      expect(result).toEqual(mockTodoItem);
    });

    it('API 에러 시 예외를 전파한다', async () => {
      mockedClient.post.mockRejectedValue(new Error('Validation Error'));

      await expect(
        todoApi.createTodo({ content: '', todoDate: '2026-03-28' }),
      ).rejects.toThrow('Validation Error');
    });
  });

  describe('updateTodo', () => {
    it('할 일 내용 수정 요청을 전송한다', async () => {
      const updatedTodo = { ...mockTodoItem, content: '수정된 내용' };
      mockedClient.patch.mockResolvedValue({ data: updatedTodo });

      const result = await todoApi.updateTodo('todo-uuid-1', {
        content: '수정된 내용',
      });

      expect(mockedClient.patch).toHaveBeenCalledWith('/todos/todo-uuid-1', {
        content: '수정된 내용',
      });
      expect(result).toEqual(updatedTodo);
    });
  });

  describe('changeTodoStatus', () => {
    it('할 일 상태 변경 요청을 전송한다 (ACTIVE → COMPLETED)', async () => {
      const completedTodo = { ...mockTodoItem, status: 'COMPLETED' as const };
      mockedClient.patch.mockResolvedValue({ data: completedTodo });

      const result = await todoApi.changeTodoStatus('todo-uuid-1', {
        status: 'COMPLETED',
      });

      expect(mockedClient.patch).toHaveBeenCalledWith(
        '/todos/todo-uuid-1/status',
        {
          status: 'COMPLETED',
        },
      );
      expect(result).toEqual(completedTodo);
    });

    it('할 일 상태 변경 요청을 전송한다 (ACTIVE → INACTIVE)', async () => {
      const inactiveTodo = { ...mockTodoItem, status: 'INACTIVE' as const };
      mockedClient.patch.mockResolvedValue({ data: inactiveTodo });

      const result = await todoApi.changeTodoStatus('todo-uuid-1', {
        status: 'INACTIVE',
      });

      expect(mockedClient.patch).toHaveBeenCalledWith(
        '/todos/todo-uuid-1/status',
        {
          status: 'INACTIVE',
        },
      );
      expect(result).toEqual(inactiveTodo);
    });

    it('할 일 상태 변경 요청을 전송한다 (INACTIVE → ACTIVE)', async () => {
      const activeTodo = { ...mockTodoItem, status: 'ACTIVE' as const };
      mockedClient.patch.mockResolvedValue({ data: activeTodo });

      const result = await todoApi.changeTodoStatus('todo-uuid-1', {
        status: 'ACTIVE',
      });

      expect(mockedClient.patch).toHaveBeenCalledWith(
        '/todos/todo-uuid-1/status',
        {
          status: 'ACTIVE',
        },
      );
      expect(result).toEqual(activeTodo);
    });
  });

  describe('deleteTodo', () => {
    it('할 일 삭제 요청을 전송한다', async () => {
      const deleteResponse = {
        id: 'todo-uuid-1',
        deletedAt: '2026-03-28T12:00:00.000Z',
      };
      mockedClient.delete.mockResolvedValue({ data: deleteResponse });

      const result = await todoApi.deleteTodo('todo-uuid-1');

      expect(mockedClient.delete).toHaveBeenCalledWith('/todos/todo-uuid-1');
      expect(result).toEqual(deleteResponse);
    });

    it('API 에러 시 예외를 전파한다', async () => {
      mockedClient.delete.mockRejectedValue(new Error('Not Found'));

      await expect(todoApi.deleteTodo('non-existent')).rejects.toThrow(
        'Not Found',
      );
    });
  });

  describe('refineText', () => {
    it('텍스트 정리 요청을 전송한다', async () => {
      const refineResponse = { refinedText: '내일까지 장보기' };
      mockedClient.post.mockResolvedValue({ data: refineResponse });

      const result = await todoApi.refineText({
        text: '장보기 가야 돼 내일까지',
      });

      expect(mockedClient.post).toHaveBeenCalledWith('/todos/refine', {
        text: '장보기 가야 돼 내일까지',
      });
      expect(result).toEqual(refineResponse);
    });

    it('API 에러 시 예외를 전파한다', async () => {
      mockedClient.post.mockRejectedValue(new Error('AI Error'));

      await expect(
        todoApi.refineText({ text: '장보기' }),
      ).rejects.toThrow('AI Error');
    });
  });

  describe('batchCreateTodos', () => {
    it('여러 할 일을 일괄 생성 요청을 전송한다', async () => {
      const batchResponse = {
        created: [mockTodoItem],
      };
      mockedClient.post.mockResolvedValue({ data: batchResponse });

      const result = await todoApi.batchCreateTodos({
        todos: [{ content: '장보기', todoDate: '2026-04-04' }],
      });

      expect(mockedClient.post).toHaveBeenCalledWith('/todos/batch', {
        todos: [{ content: '장보기', todoDate: '2026-04-04' }],
      });
      expect(result).toEqual(batchResponse);
    });

    it('API 에러 시 예외를 전파한다', async () => {
      mockedClient.post.mockRejectedValue(new Error('Batch Error'));

      await expect(
        todoApi.batchCreateTodos({
          todos: [{ content: '장보기', todoDate: '2026-04-04' }],
        }),
      ).rejects.toThrow('Batch Error');
    });
  });

  describe('HTTP 상태별 에러 매핑', () => {
    it('400 에러 시 ApiError로 전파된다', async () => {
      const error = new ApiError(400, 'VALIDATION_ERROR', '내용은 필수입니다');
      mockedClient.post.mockRejectedValue(error);

      await expect(
        todoApi.createTodo({ content: '', todoDate: '2026-03-28' }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
    });

    it('401 에러 시 ApiError로 전파된다', async () => {
      const error = new ApiError(401, 'UNAUTHORIZED', '인증이 필요합니다');
      mockedClient.get.mockRejectedValue(error);

      await expect(todoApi.getTodos('2026-03-28')).rejects.toMatchObject({
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    });

    it('404 에러 시 ApiError로 전파된다', async () => {
      const error = new ApiError(404, 'NOT_FOUND', '할 일을 찾을 수 없습니다');
      mockedClient.patch.mockRejectedValue(error);

      await expect(
        todoApi.updateTodo('non-existent', { content: '수정' }),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  describe('todoDate optional 전송', () => {
    it('todoDate가 있으면 body에 포함된다', async () => {
      mockedClient.post.mockResolvedValue({ data: mockTodoItem });

      await todoApi.createTodo({ content: '할 일', todoDate: '2026-03-28' });

      expect(mockedClient.post).toHaveBeenCalledWith('/todos', {
        content: '할 일',
        todoDate: '2026-03-28',
      });
    });

    it('todoDate가 없으면 로컬 날짜가 기본값으로 사용된다', async () => {
      mockedClient.post.mockResolvedValue({ data: mockTodoItem });

      await todoApi.createTodo({ content: '할 일' });

      const callArgs = mockedClient.post.mock.calls[0];
      expect(callArgs[1]).toHaveProperty('todoDate');
      expect((callArgs[1] as Record<string, string>).todoDate).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
    });
  });
});
