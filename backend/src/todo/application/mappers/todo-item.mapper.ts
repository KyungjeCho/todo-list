import { Todo, TodoStatus } from '../../domain/todo.entity';
import type { TodoItemDto } from '../dto/todo-response.dto';

export class TodoItemMapper {
  static toDto(todo: Todo): TodoItemDto {
    const memos = (
      (todo.memos as {
        id: string;
        todoId: string;
        content: string;
        createdAt: Date;
        updatedAt: Date;
      }[]) ?? []
    ).map((memo) => ({
      id: memo.id,
      todoId: memo.todoId,
      content: memo.content,
      createdAt: new Date(memo.createdAt).toISOString(),
      updatedAt: new Date(memo.updatedAt).toISOString(),
    }));

    return {
      id: todo.id,
      content: todo.content,
      status: todo.status,
      isCarriedOver: todo.status === TodoStatus.CARRIED_OVER,
      todoDate: todo.todoDate,
      memos,
      createdAt: new Date(todo.createdAt).toISOString(),
      updatedAt: new Date(todo.updatedAt).toISOString(),
    };
  }
}
