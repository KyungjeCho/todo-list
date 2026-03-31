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

interface CreateMemoInput {
  userAuthId: string;
  todoId: string;
  content: string;
}

@Injectable()
export class CreateMemoUsecase {
  constructor(
    private readonly memoRepository: MemoRepository,
    private readonly todoRepository: TodoRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: CreateMemoInput): Promise<MemoResponseDto> {
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

    const memo = await this.memoRepository.create({
      todoId: input.todoId,
      content: input.content.trim(),
      createdBy: user.id,
      updatedBy: user.id,
    });

    return {
      id: memo.id,
      todoId: memo.todoId,
      content: memo.content,
      createdAt: new Date(memo.createdAt).toISOString(),
      updatedAt: new Date(memo.updatedAt).toISOString(),
    };
  }
}
