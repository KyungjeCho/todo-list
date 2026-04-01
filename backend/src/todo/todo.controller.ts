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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { CreateTodoDto } from './application/dto/create-todo.dto';
import { UpdateTodoDto } from './application/dto/update-todo.dto';
import { ChangeTodoStatusDto } from './application/dto/change-todo-status.dto';
import { CompleteDayDto } from './application/dto/complete-day.dto';
import { GetTodosQueryDto } from './application/dto/get-todos-query.dto';
import { GetMonthlySummaryQueryDto } from './application/dto/monthly-summary.dto';
import { VoiceTodoDateDto } from './application/dto/voice-todo.dto';
import { CreateTodoUsecase } from './application/create-todo.usecase';
import { GetTodosUsecase } from './application/get-todos.usecase';
import { UpdateTodoUsecase } from './application/update-todo.usecase';
import { ChangeTodoStatusUsecase } from './application/change-todo-status.usecase';
import { DeleteTodoUsecase } from './application/delete-todo.usecase';
import { CompleteDayUsecase } from './application/complete-day.usecase';
import { GetMonthlySummaryUsecase } from './application/get-monthly-summary.usecase';
import { CreateVoiceTodoUsecase } from './application/create-voice-todo.usecase';
import { SUPPORTED_AUDIO_MIME_TYPES } from '../ai/infrastructure/gemini.service';
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
    private readonly completeDayUsecase: CompleteDayUsecase,
    private readonly getMonthlySummaryUsecase: GetMonthlySummaryUsecase,
    private readonly createVoiceTodoUsecase: CreateVoiceTodoUsecase,
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

  @Post('voice')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({
    short: { ttl: 1000, limit: 1 },
    medium: { ttl: 60000, limit: 5 },
  })
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!SUPPORTED_AUDIO_MIME_TYPES.includes(file.mimetype)) {
          cb(
            new BadRequestException(
              `지원하지 않는 오디오 포맷입니다: ${file.mimetype}. wav, m4a, mp3만 지원합니다.`,
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async createVoiceTodo(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: VoiceTodoDateDto,
  ) {
    if (!file) {
      throw new BadRequestException('오디오 파일이 필요합니다.');
    }

    return this.createVoiceTodoUsecase.execute({
      userAuthId: req.user.userAuthId,
      audioBuffer: file.buffer,
      mimeType: file.mimetype,
      todoDate: body.todoDate,
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
