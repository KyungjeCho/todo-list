export type TodoStatus = 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'CARRIED_OVER';

export interface TodoMemo {
  id: string;
  todoId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  id: string;
  todoDate: string;
  content: string;
  status: TodoStatus;
  isCarriedOver: boolean;
  memos: TodoMemo[];
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  total: number;
  completed: number;
  active: number;
  inactive: number;
  progressRate: number;
}

export interface CreateTodoRequest {
  content: string;
  todoDate?: string;
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
