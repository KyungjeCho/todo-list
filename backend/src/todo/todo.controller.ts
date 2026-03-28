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
} from '@nestjs/common';
import type { Request } from 'express';
import { CreateTodoDto } from './application/dto/create-todo.dto';
import { ChangeTodoStatusDto } from './application/dto/change-todo-status.dto';
import { GetTodosQueryDto } from './application/dto/get-todos-query.dto';
import { CreateTodoUsecase } from './application/create-todo.usecase';
import { GetTodosUsecase } from './application/get-todos.usecase';
import { UpdateTodoUsecase } from './application/update-todo.usecase';
import { ChangeTodoStatusUsecase } from './application/change-todo-status.usecase';
import { DeleteTodoUsecase } from './application/delete-todo.usecase';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

interface AuthenticatedRequest extends Request {
  user: { userAuthId: string };
}

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
  ) {}

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

  @Patch(':todoId')
  async updateTodo(
    @Req() req: AuthenticatedRequest,
    @Param('todoId') todoId: string,
    @Body() body: { content: string },
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
