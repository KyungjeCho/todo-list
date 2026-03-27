export type TodoStatus = 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'CARRIED_OVER';

export interface Todo {
  id: string;
  userId: string;
  todoDate: string;
  content: string;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TodoMemo {
  id: string;
  todoId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoRequest {
  content: string;
  todoDate: string;
}

export interface UpdateTodoRequest {
  content?: string;
  status?: TodoStatus;
}

export interface CreateTodoMemoRequest {
  content: string;
}

export interface UpdateTodoMemoRequest {
  content: string;
}
