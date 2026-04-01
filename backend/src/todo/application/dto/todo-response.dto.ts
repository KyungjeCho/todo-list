export interface TodoItemDto {
  id: string;
  content: string;
  status: string;
  isCarriedOver: boolean;
  todoDate: string;
  memos: MemoItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoItemDto {
  id: string;
  todoId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface TodoStatsDto {
  total: number;
  completed: number;
  active: number;
  inactive: number;
  progressRate: number;
}

export interface TodoListResponseDto {
  date: string;
  mode: 'PLAN' | 'REVIEW';
  stats: TodoStatsDto;
  todos: TodoItemDto[];
}

export interface DeleteTodoResponseDto {
  id: string;
  deletedAt: string;
}
