import { Injectable, BadRequestException } from '@nestjs/common';
import { MemoRepository } from '../infrastructure/memo.repository';
import { UserValidationService } from '../../common/services/user-validation.service';
import { TodoAuthorizationService } from '../../todo/application/services/todo-authorization.service';
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
    private readonly userValidationService: UserValidationService,
    private readonly todoAuthorizationService: TodoAuthorizationService,
  ) {}

  async execute(input: CreateMemoInput): Promise<MemoResponseDto> {
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
