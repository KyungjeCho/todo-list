export interface MemoResponseDto {
  id: string;
  todoId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteMemoResponseDto {
  id: string;
  deletedAt: string;
}
