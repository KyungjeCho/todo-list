import { Injectable, BadRequestException } from '@nestjs/common';
import { UserValidationService } from '../../common/services/user-validation.service';
import { TodoAuthorizationService } from './services/todo-authorization.service';
import { TodoRepository } from '../infrastructure/todo.repository';
import type { DeleteTodoResponseDto } from './dto/todo-response.dto';

interface DeleteTodoInput {
  userAuthId: string;
  todoId: string;
}

@Injectable()
export class DeleteTodoUsecase {
  constructor(
    private readonly todoRepository: TodoRepository,
    private readonly userValidationService: UserValidationService,
    private readonly todoAuthorizationService: TodoAuthorizationService,
  ) {}

  async execute(input: DeleteTodoInput): Promise<DeleteTodoResponseDto> {
    const user = await this.userValidationService.ensureUserExists(
      input.userAuthId,
    );

    const todo = await this.todoAuthorizationService.validateOwnership(
      input.todoId,
      user.id,
    );

    if (todo.deletedAt) {
      throw new BadRequestException('ALREADY_DELETED');
    }

    const result = await this.todoRepository.softDelete(input.todoId);

    return {
      id: result.id,
      deletedAt: result.deletedAt.toISOString(),
    };
  }
}
