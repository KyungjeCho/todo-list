import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseFilters,
  Req,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CreateTodoDto } from './application/dto/create-todo.dto';
import { UpdateTodoDto } from './application/dto/update-todo.dto';
import { ChangeTodoStatusDto } from './application/dto/change-todo-status.dto';
import { CompleteDayDto } from './application/dto/complete-day.dto';
import { GetTodosQueryDto } from './application/dto/get-todos-query.dto';
import { GetMonthlySummaryQueryDto } from './application/dto/monthly-summary.dto';
import { RefineTextDto } from './application/dto/refine-text.dto';
import { BatchCreateTodosDto } from './application/dto/batch-create-todos.dto';
import { CreateTodoUsecase } from './application/create-todo.usecase';
import { GetTodosUsecase } from './application/get-todos.usecase';
import { UpdateTodoUsecase } from './application/update-todo.usecase';
import { ChangeTodoStatusUsecase } from './application/change-todo-status.usecase';
import { DeleteTodoUsecase } from './application/delete-todo.usecase';
import { CompleteDayUsecase } from './application/complete-day.usecase';
import { GetMonthlySummaryUsecase } from './application/get-monthly-summary.usecase';
import { RefineTextUsecase } from './application/refine-text.usecase';
import { BatchCreateTodoUsecase } from './application/batch-create-todo.usecase';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@Controller('todos')
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter())
export class TodoController {
  constructor(
    private readonly createTodoUsecase: CreateTodoUsecase,
    private readonly getTodosUsecase: GetTodosUsecase,
    private readonly updateTodoUsecase: UpdateTodoUsecase,
    private readonly changeTodoStatusUsecase: ChangeTodoStatusUsecase,
    private readonly deleteTodoUsecase: DeleteTodoUsecase,
    private readonly completeDayUsecase: CompleteDayUsecase,
    private readonly getMonthlySummaryUsecase: GetMonthlySummaryUsecase,
    private readonly refineTextUsecase: RefineTextUsecase,
    private readonly batchCreateTodoUsecase: BatchCreateTodoUsecase,
  ) {}

  /**
   * 지정 연/월의 일별 완료율 요약을 조회한다.
   * @param req - 인증된 요청 (userAuthId 포함)
   * @param query - year, month 쿼리 파라미터
   * @returns 월간 일별 통계 요약
   */
  @Get('report/summary')
  async getMonthlySummary(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetMonthlySummaryQueryDto,
  ) {
    return this.getMonthlySummaryUsecase.execute({
      userAuthId: req.user.userAuthId,
      year: query.year,
      month: query.month,
    });
  }

  /**
   * 특정 날짜의 투두 목록과 통계를 조회한다.
   * @param req - 인증된 요청 (userAuthId 포함)
   * @param query - date 쿼리 파라미터 (YYYY-MM-DD)
   * @returns 투두 목록, 모드(PLAN/REVIEW), 통계
   */
  @Get()
  async getTodos(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetTodosQueryDto,
  ) {
    return this.getTodosUsecase.execute({
      userAuthId: req.user.userAuthId,
      date: query.date,
    });
  }

  /**
   * AI를 사용하여 투두 텍스트를 다듬는다.
   * @param req - 인증된 요청 (userAuthId 포함)
   * @param body - 다듬을 텍스트
   * @returns 다듬어진 텍스트
   */
  @Post('refine')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { ttl: 1000, limit: 1 },
    medium: { ttl: 60000, limit: 30 },
  })
  async refineText(
    @Req() req: AuthenticatedRequest,
    @Body() body: RefineTextDto,
  ) {
    return this.refineTextUsecase.execute({
      userAuthId: req.user.userAuthId,
      text: body.text,
    });
  }

  /**
   * 여러 투두를 한 번에 생성한다.
   * @param req - 인증된 요청 (userAuthId 포함)
   * @param body - 생성할 투두 배열 (content, todoDate)
   * @returns 생성된 투두 목록
   */
  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  async batchCreateTodos(
    @Req() req: AuthenticatedRequest,
    @Body() body: BatchCreateTodosDto,
  ) {
    return this.batchCreateTodoUsecase.execute({
      userAuthId: req.user.userAuthId,
      todos: body.todos,
    });
  }

  /**
   * @deprecated 디바이스 내장 STT + POST /todos/refine 조합으로 대체됨.
   */
  @Post('voice')
  @HttpCode(HttpStatus.GONE)
  createVoiceTodo() {
    throw new HttpException(
      {
        statusCode: HttpStatus.GONE,
        code: 'ENDPOINT_DEPRECATED',
        message:
          '이 엔드포인트는 더 이상 사용되지 않습니다. 디바이스 내장 STT + POST /todos/refine 조합으로 대체되었습니다.',
      },
      HttpStatus.GONE,
    );
  }

  /**
   * 단일 투두를 생성한다.
   * @param req - 인증된 요청 (userAuthId 포함)
   * @param body - 투두 내용과 날짜
   * @returns 생성된 투두
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTodo(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateTodoDto,
  ) {
    return this.createTodoUsecase.execute({
      userAuthId: req.user.userAuthId,
      content: body.content,
      todoDate: body.todoDate,
    });
  }

  /**
   * 특정 날짜의 모든 ACTIVE 투두를 COMPLETED로 일괄 전환한다.
   * @param req - 인증된 요청 (userAuthId 포함)
   * @param body - 완료 처리할 날짜
   * @returns 완료 처리 결과
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async completeDay(
    @Req() req: AuthenticatedRequest,
    @Body() body: CompleteDayDto,
  ) {
    return this.completeDayUsecase.execute({
      userAuthId: req.user.userAuthId,
      date: body.date,
    });
  }

  /**
   * 투두의 내용을 수정한다.
   * @param req - 인증된 요청 (userAuthId 포함)
   * @param todoId - 수정할 투두 ID
   * @param body - 수정할 내용
   * @returns 수정된 투두
   */
  @Patch(':todoId')
  async updateTodo(
    @Req() req: AuthenticatedRequest,
    @Param('todoId') todoId: string,
    @Body() body: UpdateTodoDto,
  ) {
    return this.updateTodoUsecase.execute({
      userAuthId: req.user.userAuthId,
      todoId,
      content: body.content,
    });
  }

  /**
   * 투두의 상태를 변경한다 (ACTIVE, COMPLETED, INACTIVE).
   * @param req - 인증된 요청 (userAuthId 포함)
   * @param todoId - 상태를 변경할 투두 ID
   * @param body - 변경할 상태
   * @returns 상태가 변경된 투두
   */
  @Patch(':todoId/status')
  async changeTodoStatus(
    @Req() req: AuthenticatedRequest,
    @Param('todoId') todoId: string,
    @Body() body: ChangeTodoStatusDto,
  ) {
    return this.changeTodoStatusUsecase.execute({
      userAuthId: req.user.userAuthId,
      todoId,
      status: body.status,
    });
  }

  /**
   * 투두를 삭제한다.
   * @param req - 인증된 요청 (userAuthId 포함)
   * @param todoId - 삭제할 투두 ID
   * @returns 삭제 결과
   */
  @Delete(':todoId')
  async deleteTodo(
    @Req() req: AuthenticatedRequest,
    @Param('todoId') todoId: string,
  ) {
    return this.deleteTodoUsecase.execute({
      userAuthId: req.user.userAuthId,
      todoId,
    });
  }
}
