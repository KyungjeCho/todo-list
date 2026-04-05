import { apiClient } from './client';
import type { Todo, CreateTodoRequest } from '../../types/todo';

export interface TodoListResponse {
  date: string;
  mode: 'PLAN' | 'REVIEW';
  stats: {
    total: number;
    completed: number;
    active: number;
    inactive: number;
    progressRate: number;
  };
  todos: Todo[];
}

export interface CompleteDayResponse {
  date: string;
  stats: {
    total: number;
    completed: number;
    active: number;
    inactive: number;
    progressRate: number;
  };
  carriedOverCount: number;
  carriedOverTodos: Array<{
    fromTodoId: string;
    toTodoId: string;
    content: string;
  }>;
}

export interface DeleteTodoResponse {
  id: string;
  deletedAt: string;
}

export interface RefineTextRequest {
  text: string;
}

export interface RefineTextResponse {
  refinedText: string;
}

export interface BatchCreateTodosRequest {
  todos: { content: string; todoDate: string }[];
}

export interface BatchCreateTodosResponse {
  created: Todo[];
}

export const todoApi = {
  async getTodos(date: string): Promise<TodoListResponse> {
    const response = await apiClient.get('/todos', {
      params: { date },
    });
    return response.data;
  },

  async createTodo(request: CreateTodoRequest): Promise<Todo> {
    const todayLocal = new Date();
    const localDate = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;
    const body: Record<string, string> = {
      content: request.content,
      todoDate: request.todoDate ?? localDate,
    };
    const response = await apiClient.post('/todos', body);
    return response.data;
  },

  async updateTodo(todoId: string, data: { content: string }): Promise<Todo> {
    const response = await apiClient.patch(`/todos/${todoId}`, data);
    return response.data;
  },

  async changeTodoStatus(
    todoId: string,
    data: { status: string },
  ): Promise<Todo> {
    const response = await apiClient.patch(`/todos/${todoId}/status`, data);
    return response.data;
  },

  async deleteTodo(todoId: string): Promise<DeleteTodoResponse> {
    const response = await apiClient.delete(`/todos/${todoId}`);
    return response.data;
  },

  async completeDay(date: string): Promise<CompleteDayResponse> {
    const response = await apiClient.post('/todos/complete', { date });
    return response.data;
  },

  async refineText(request: RefineTextRequest): Promise<RefineTextResponse> {
    const response = await apiClient.post('/todos/refine', request);
    return response.data;
  },

  async batchCreateTodos(
    request: BatchCreateTodosRequest,
  ): Promise<BatchCreateTodosResponse> {
    const response = await apiClient.post('/todos/batch', request);
    return response.data;
  },
};
