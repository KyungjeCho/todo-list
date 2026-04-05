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
