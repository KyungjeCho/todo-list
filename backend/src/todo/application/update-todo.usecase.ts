import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TodoRepository } from '../infrastructure/todo.repository';
import { UserRepository } from '../../user/infrastructure/user.repository';
import { TodoStatus } from '../domain/todo.entity';
import type { TodoItemDto } from './dto';

interface UpdateTodoInput {
  userAuthId: string;
  todoId: string;
  content: string;
}

@Injectable()
export class UpdateTodoUsecase {
  constructor(
    private readonly todoRepository: TodoRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: UpdateTodoInput): Promise<TodoItemDto> {
    const user = await this.userRepository.findByUserAuthId(input.userAuthId);
    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const todo = await this.todoRepository.findById(input.todoId);
    if (!todo) {
      throw new NotFoundException('TODO_NOT_FOUND');
    }

    if (todo.userId !== user.id) {
      throw new ForbiddenException('FORBIDDEN');
    }

    if (!input.content || input.content.trim().length === 0) {
      throw new BadRequestException('CONTENT_REQUIRED');
    }

    if (input.content.length > 255) {
      throw new BadRequestException('CONTENT_TOO_LONG');
    }

    const updated = await this.todoRepository.update(input.todoId, {
      content: input.content,
      updatedBy: user.id,
    });

    const memos = (
      (updated.memos as {
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
      id: updated.id,
      content: updated.content,
      status: updated.status,
      isCarriedOver: updated.status === TodoStatus.CARRIED_OVER,
      todoDate: updated.todoDate,
      memos,
      createdAt: new Date(updated.createdAt).toISOString(),
      updatedAt: new Date(updated.updatedAt).toISOString(),
    };
  }
}
