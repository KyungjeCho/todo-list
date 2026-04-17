import { Injectable, NotFoundException } from '@nestjs/common';
import { MemoRepository } from '../infrastructure/memo.repository';
import { UserValidationService } from '../../common/services/user-validation.service';
import { TodoAuthorizationService } from '../../todo/application/services/todo-authorization.service';
import { ERROR_CODES } from '../../common/constants/error-codes';
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
    private readonly userValidationService: UserValidationService,
    private readonly todoAuthorizationService: TodoAuthorizationService,
  ) {}

  async execute(input: DeleteMemoInput): Promise<DeleteMemoResponseDto> {
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

    const result = await this.memoRepository.softDelete(input.memoId);

    return {
      id: result.id,
      deletedAt: result.deletedAt.toISOString(),
    };
  }
}
