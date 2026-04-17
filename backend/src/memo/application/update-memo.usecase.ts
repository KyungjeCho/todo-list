import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { MemoRepository } from '../infrastructure/memo.repository';
import { UserValidationService } from '../../common/services/user-validation.service';
import { TodoAuthorizationService } from '../../todo/application/services/todo-authorization.service';
import { ERROR_CODES } from '../../common/constants/error-codes';
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
    private readonly userValidationService: UserValidationService,
    private readonly todoAuthorizationService: TodoAuthorizationService,
  ) {}

  async execute(input: UpdateMemoInput): Promise<MemoResponseDto> {
    const user = await this.userValidationService.ensureUserExists(
      input.userAuthId,
    );

    await this.todoAuthorizationService.validateOwnership(
      input.todoId,
      user.id,
    );

    // WHY: 단일 쿼리로 memoId+todoId를 동시에 검증하여 IDOR 방어
    const memo = await this.memoRepository.findByIdAndTodoId(
      input.memoId,
      input.todoId,
    );
    if (!memo) {
      throw new NotFoundException(ERROR_CODES.MEMO_NOT_FOUND);
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
