import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { MemoRepository } from '../infrastructure/memo.repository';
import { TodoRepository } from '../../todo/infrastructure/todo.repository';
import { UserRepository } from '../../user/infrastructure/user.repository';
import type { MemoResponseDto } from './dto';

interface UpdateMemoInput {
  userAuthId: string;
  todoId: string;
  memoId: string;
  content: string;
}

@Injectable()
export class UpdateMemoUsecase {
  constructor(
    private readonly memoRepository: MemoRepository,
    private readonly todoRepository: TodoRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: UpdateMemoInput): Promise<MemoResponseDto> {
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

    // WHY: 단일 쿼리로 memoId+todoId를 동시에 검증하여 IDOR 방어
    const memo = await this.memoRepository.findByIdAndTodoId(
      input.memoId,
      input.todoId,
    );
    if (!memo) {
      throw new NotFoundException('MEMO_NOT_FOUND');
    }

    if (!input.content || input.content.trim().length === 0) {
      throw new BadRequestException('CONTENT_REQUIRED');
    }

    const updated = await this.memoRepository.update(input.memoId, {
      content: input.content.trim(),
      updatedBy: user.id,
    });

    return {
      id: updated.id,
      todoId: updated.todoId,
      content: updated.content,
      createdAt: new Date(updated.createdAt).toISOString(),
      updatedAt: new Date(updated.updatedAt).toISOString(),
    };
  }
}
