import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TodoRepository } from '../../infrastructure/todo.repository';
import { Todo } from '../../domain/todo.entity';
import { ERROR_CODES } from '../../../common/constants/error-codes';

@Injectable()
export class TodoAuthorizationService {
  constructor(private readonly todoRepository: TodoRepository) {}

  async validateOwnership(todoId: string, userId: string): Promise<Todo> {
    const todo = await this.todoRepository.findById(todoId);
    if (!todo) {
      throw new NotFoundException(ERROR_CODES.TODO_NOT_FOUND);
    }
    if (todo.userId !== userId) {
      throw new ForbiddenException(ERROR_CODES.FORBIDDEN);
    }
    return todo;
  }
}
