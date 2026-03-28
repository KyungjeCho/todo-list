import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TodoRepository } from '../infrastructure/todo.repository';
import { UserRepository } from '../../user/infrastructure/user.repository';
import { TodoStatus } from '../domain/todo.entity';
import type { TodoItemDto } from './dto';

interface CreateTodoInput {
  userAuthId: string;
  content: string;
  todoDate?: string;
}

@Injectable()
export class CreateTodoUsecase {
  constructor(
    private readonly todoRepository: TodoRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: CreateTodoInput): Promise<TodoItemDto> {
    const user = await this.userRepository.findByUserAuthId(input.userAuthId);
    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    if (!input.content || input.content.trim().length === 0) {
      throw new BadRequestException('CONTENT_REQUIRED');
    }

    if (input.content.length > 255) {
      throw new BadRequestException('CONTENT_TOO_LONG');
    }

    const todoDate = input.todoDate ?? new Date().toISOString().split('T')[0];

    const todo = await this.todoRepository.create({
      userId: user.id,
      content: input.content,
      todoDate,
      status: TodoStatus.ACTIVE,
      createdBy: user.id,
      updatedBy: user.id,
    });

    const memos = (
      (todo.memos as {
        id: string;
        content: string;
        createdAt: Date;
        updatedAt: Date;
      }[]) ?? []
    ).map((memo) => ({
      id: memo.id,
      content: memo.content,
      createdAt: new Date(memo.createdAt).toISOString(),
      updatedAt: new Date(memo.updatedAt).toISOString(),
    }));

    return {
      id: todo.id,
      content: todo.content,
      status: todo.status,
      isCarriedOver: false,
      todoDate: todo.todoDate,
      memos,
      createdAt: new Date(todo.createdAt).toISOString(),
      updatedAt: new Date(todo.updatedAt).toISOString(),
    };
  }
}
