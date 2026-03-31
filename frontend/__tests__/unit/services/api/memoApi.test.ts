import { apiClient, ApiError } from 'src/services/api/client';
import { memoApi } from 'src/services/api/memoApi';
import type { TodoMemo } from 'src/types/todo';

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

const mockMemoResponse: TodoMemo = {
  id: 'memo-uuid-1',
  todoId: 'todo-uuid-1',
  content: '회의 메모',
  createdAt: '2026-03-31T09:00:00.000Z',
  updatedAt: '2026-03-31T09:00:00.000Z',
};

describe('MemoApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMemo', () => {
    it('메모 생성 요청을 전송한다', async () => {
      mockedClient.post.mockResolvedValue({ data: mockMemoResponse });

      const result = await memoApi.createMemo('todo-uuid-1', {
        content: '회의 메모',
      });

      expect(mockedClient.post).toHaveBeenCalledWith(
        '/todos/todo-uuid-1/memos',
        { content: '회의 메모' },
      );
      expect(result).toEqual(mockMemoResponse);
    });

    it('API 에러 시 예외를 전파한다', async () => {
      mockedClient.post.mockRejectedValue(new Error('Network Error'));

      await expect(
        memoApi.createMemo('todo-uuid-1', { content: '메모' }),
      ).rejects.toThrow('Network Error');
    });
  });

  describe('updateMemo', () => {
    it('메모 수정 요청을 전송한다', async () => {
      const updatedMemo = { ...mockMemoResponse, content: '수정된 메모' };
      mockedClient.patch.mockResolvedValue({ data: updatedMemo });

      const result = await memoApi.updateMemo('todo-uuid-1', 'memo-uuid-1', {
        content: '수정된 메모',
      });

      expect(mockedClient.patch).toHaveBeenCalledWith(
        '/todos/todo-uuid-1/memos/memo-uuid-1',
        { content: '수정된 메모' },
      );
      expect(result).toEqual(updatedMemo);
    });

    it('API 에러 시 예외를 전파한다', async () => {
      mockedClient.patch.mockRejectedValue(new Error('Not Found'));

      await expect(
        memoApi.updateMemo('todo-uuid-1', 'non-existent', {
          content: '수정',
        }),
      ).rejects.toThrow('Not Found');
    });
  });

  describe('deleteMemo', () => {
    it('메모 삭제 요청을 전송한다', async () => {
      const deleteResponse = {
        id: 'memo-uuid-1',
        deletedAt: '2026-03-31T15:00:00.000Z',
      };
      mockedClient.delete.mockResolvedValue({ data: deleteResponse });

      const result = await memoApi.deleteMemo('todo-uuid-1', 'memo-uuid-1');

      expect(mockedClient.delete).toHaveBeenCalledWith(
        '/todos/todo-uuid-1/memos/memo-uuid-1',
      );
      expect(result).toEqual(deleteResponse);
    });

    it('API 에러 시 예외를 전파한다', async () => {
      mockedClient.delete.mockRejectedValue(new Error('Not Found'));

      await expect(
        memoApi.deleteMemo('todo-uuid-1', 'non-existent'),
      ).rejects.toThrow('Not Found');
    });
  });

  describe('HTTP 상태별 에러 매핑', () => {
    it('400 에러 시 ApiError로 전파된다 (CONTENT_REQUIRED)', async () => {
      const error = new ApiError(400, 'CONTENT_REQUIRED', '내용은 필수입니다');
      mockedClient.post.mockRejectedValue(error);

      await expect(
        memoApi.createMemo('todo-uuid-1', { content: '' }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'CONTENT_REQUIRED',
      });
    });

    it('404 에러 시 ApiError로 전파된다 (TODO_NOT_FOUND)', async () => {
      const error = new ApiError(
        404,
        'TODO_NOT_FOUND',
        '할 일을 찾을 수 없습니다',
      );
      mockedClient.post.mockRejectedValue(error);

      await expect(
        memoApi.createMemo('non-existent', { content: '메모' }),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'TODO_NOT_FOUND',
      });
    });

    it('404 에러 시 ApiError로 전파된다 (MEMO_NOT_FOUND)', async () => {
      const error = new ApiError(
        404,
        'MEMO_NOT_FOUND',
        '메모를 찾을 수 없습니다',
      );
      mockedClient.patch.mockRejectedValue(error);

      await expect(
        memoApi.updateMemo('todo-uuid-1', 'non-existent', { content: '수정' }),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'MEMO_NOT_FOUND',
      });
    });

    it('401 에러 시 ApiError로 전파된다', async () => {
      const error = new ApiError(401, 'UNAUTHORIZED', '인증이 필요합니다');
      mockedClient.post.mockRejectedValue(error);

      await expect(
        memoApi.createMemo('todo-uuid-1', { content: '메모' }),
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    });
  });
});
