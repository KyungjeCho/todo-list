import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseFilters,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateMemoDto } from './application/dto/create-memo.dto';
import { UpdateMemoDto } from './application/dto/update-memo.dto';
import { CreateMemoUsecase } from './application/create-memo.usecase';
import { UpdateMemoUsecase } from './application/update-memo.usecase';
import { DeleteMemoUsecase } from './application/delete-memo.usecase';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@Controller('todos/:todoId/memos')
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter())
export class MemoController {
  constructor(
    private readonly createMemoUsecase: CreateMemoUsecase,
    private readonly updateMemoUsecase: UpdateMemoUsecase,
    private readonly deleteMemoUsecase: DeleteMemoUsecase,
  ) {}

  /**
   * 투두에 메모를 추가한다.
   * @param req - 인증된 요청 (userAuthId 포함)
   * @param todoId - 메모를 추가할 투두 ID
   * @param body - 메모 내용
   * @returns 생성된 메모
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMemo(
    @Req() req: AuthenticatedRequest,
    @Param('todoId') todoId: string,
    @Body() body: CreateMemoDto,
  ) {
    return this.createMemoUsecase.execute({
      userAuthId: req.user.userAuthId,
      todoId,
      content: body.content,
    });
  }

  /**
   * 메모 내용을 수정한다.
   * @param req - 인증된 요청 (userAuthId 포함)
   * @param todoId - 메모가 속한 투두 ID
   * @param memoId - 수정할 메모 ID
   * @param body - 수정할 내용
   * @returns 수정된 메모
   */
  @Patch(':memoId')
  async updateMemo(
    @Req() req: AuthenticatedRequest,
    @Param('todoId') todoId: string,
    @Param('memoId') memoId: string,
    @Body() body: UpdateMemoDto,
  ) {
    return this.updateMemoUsecase.execute({
      userAuthId: req.user.userAuthId,
      todoId,
      memoId,
      content: body.content,
    });
  }

  /**
   * 메모를 삭제한다.
   * @param req - 인증된 요청 (userAuthId 포함)
   * @param todoId - 메모가 속한 투두 ID
   * @param memoId - 삭제할 메모 ID
   * @returns 삭제 결과
   */
  @Delete(':memoId')
  async deleteMemo(
    @Req() req: AuthenticatedRequest,
    @Param('todoId') todoId: string,
    @Param('memoId') memoId: string,
  ) {
    return this.deleteMemoUsecase.execute({
      userAuthId: req.user.userAuthId,
      todoId,
      memoId,
    });
  }
}
