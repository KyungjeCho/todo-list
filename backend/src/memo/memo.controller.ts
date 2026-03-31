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
import type { Request } from 'express';
import { CreateMemoDto } from './application/dto/create-memo.dto';
import { UpdateMemoDto } from './application/dto/update-memo.dto';
import { CreateMemoUsecase } from './application/create-memo.usecase';
import { UpdateMemoUsecase } from './application/update-memo.usecase';
import { DeleteMemoUsecase } from './application/delete-memo.usecase';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

interface AuthenticatedRequest extends Request {
  user: { userAuthId: string };
}

@Controller('todos/:todoId/memos')
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter())
export class MemoController {
  constructor(
    private readonly createMemoUsecase: CreateMemoUsecase,
    private readonly updateMemoUsecase: UpdateMemoUsecase,
    private readonly deleteMemoUsecase: DeleteMemoUsecase,
  ) {}

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
