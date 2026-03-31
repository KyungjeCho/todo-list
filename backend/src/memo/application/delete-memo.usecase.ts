import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { MemoRepository } from '../infrastructure/memo.repository';
import { TodoRepository } from '../../todo/infrastructure/todo.repository';
import { UserRepository } from '../../user/infrastructure/user.repository';
import type { DeleteMemoResponseDto } from './dto';

interface DeleteMemoInput {
  userAuthId: string;
  todoId: string;
  memoId: string;
}

@Injectable()
export class DeleteMemoUsecase {
  constructor(
    private readonly memoRepository: MemoRepository,
    private readonly todoRepository: TodoRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: DeleteMemoInput): Promise<DeleteMemoResponseDto> {
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

    const memo = await this.memoRepository.findById(input.memoId);
    if (!memo) {
      throw new NotFoundException('MEMO_NOT_FOUND');
    }

    if (memo.todoId !== input.todoId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    const result = await this.memoRepository.softDelete(input.memoId);

    return {
      id: result.id,
      deletedAt: result.deletedAt.toISOString(),
    };
  }
}
