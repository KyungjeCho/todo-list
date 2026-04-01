import { apiClient } from './client';
import type {
  TodoMemo,
  CreateTodoMemoRequest,
  UpdateTodoMemoRequest,
} from '../../types/todo';

export interface DeleteMemoResponse {
  id: string;
  deletedAt: string;
}

export const memoApi = {
  async createMemo(
    todoId: string,
    request: CreateTodoMemoRequest,
  ): Promise<TodoMemo> {
    const response = await apiClient.post(`/todos/${todoId}/memos`, request);
    return response.data;
  },

  async updateMemo(
    todoId: string,
    memoId: string,
    request: UpdateTodoMemoRequest,
  ): Promise<TodoMemo> {
    const response = await apiClient.patch(
      `/todos/${todoId}/memos/${memoId}`,
      request,
    );
    return response.data;
  },

  async deleteMemo(
    todoId: string,
    memoId: string,
  ): Promise<DeleteMemoResponse> {
    const response = await apiClient.delete(`/todos/${todoId}/memos/${memoId}`);
    return response.data;
  },
};
