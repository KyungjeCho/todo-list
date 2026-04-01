import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TodoRepository } from '../infrastructure/todo.repository';
import { UserRepository } from '../../user/infrastructure/user.repository';
import type { DeleteTodoResponseDto } from './dto';

interface DeleteTodoInput {
  userAuthId: string;
  todoId: string;
}

@Injectable()
export class DeleteTodoUsecase {
  constructor(
    private readonly todoRepository: TodoRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: DeleteTodoInput): Promise<DeleteTodoResponseDto> {
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
