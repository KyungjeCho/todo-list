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

interface ChangeTodoStatusInput {
  userAuthId: string;
  todoId: string;
  status: string;
}

@Injectable()
export class ChangeTodoStatusUsecase {
  constructor(
    private readonly todoRepository: TodoRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: ChangeTodoStatusInput): Promise<TodoItemDto> {
    const user = await this.userRepository.findByUserAuthId(input.userAuthId);
    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    if (input.status === (TodoStatus.CARRIED_OVER as string)) {
      throw new BadRequestException('CARRIED_OVER_NOT_ALLOWED');
    }

    const todo = await this.todoRepository.findById(input.todoId);
    if (!todo) {
      throw new NotFoundException('TODO_NOT_FOUND');
    }

    if (todo.userId !== user.id) {
      throw new ForbiddenException('FORBIDDEN');
    }

    todo.changeStatus(input.status as TodoStatus);

    const updated = await this.todoRepository.update({
      ...todo,
      id: input.todoId,
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
