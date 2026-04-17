import { Injectable, BadRequestException } from '@nestjs/common';
import { TodoRepository } from '../infrastructure/todo.repository';
import { UserValidationService } from '../../common/services/user-validation.service';
import { TodoItemMapper } from './mappers/todo-item.mapper';
import { TodoStatus } from '../domain/todo.entity';
import type { TodoItemDto } from './dto/todo-response.dto';

interface CreateTodoInput {
  userAuthId: string;
  content: string;
  todoDate?: string;
}

@Injectable()
export class CreateTodoUsecase {
  constructor(
    private readonly todoRepository: TodoRepository,
    private readonly userValidationService: UserValidationService,
  ) {}

  async execute(input: CreateTodoInput): Promise<TodoItemDto> {
    const user = await this.userValidationService.ensureUserExists(
      input.userAuthId,
    );

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

    return TodoItemMapper.toDto(todo);
  }
}
