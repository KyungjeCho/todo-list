import { Injectable, BadRequestException } from '@nestjs/common';
import { TodoRepository } from '../infrastructure/todo.repository';
import { UserValidationService } from '../../common/services/user-validation.service';
import { TodoAuthorizationService } from './services/todo-authorization.service';
import { TodoItemMapper } from './mappers/todo-item.mapper';
import type { TodoItemDto } from './dto/todo-response.dto';

interface UpdateTodoInput {
  userAuthId: string;
  todoId: string;
  content: string;
}

@Injectable()
export class UpdateTodoUsecase {
  constructor(
    private readonly todoRepository: TodoRepository,
    private readonly userValidationService: UserValidationService,
    private readonly todoAuthorizationService: TodoAuthorizationService,
  ) {}

  async execute(input: UpdateTodoInput): Promise<TodoItemDto> {
    const user = await this.userValidationService.ensureUserExists(
      input.userAuthId,
    );

    await this.todoAuthorizationService.validateOwnership(
      input.todoId,
      user.id,
    );

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

    return TodoItemMapper.toDto(updated);
  }
}
