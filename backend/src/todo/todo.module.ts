import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodoController } from './todo.controller';
import { CreateTodoUsecase } from './application/create-todo.usecase';
import { GetTodosUsecase } from './application/get-todos.usecase';
import { UpdateTodoUsecase } from './application/update-todo.usecase';
import { ChangeTodoStatusUsecase } from './application/change-todo-status.usecase';
import { DeleteTodoUsecase } from './application/delete-todo.usecase';
import { CompleteDayUsecase } from './application/complete-day.usecase';
import { GetMonthlySummaryUsecase } from './application/get-monthly-summary.usecase';
import { RefineTextUsecase } from './application/refine-text.usecase';
import { BatchCreateTodoUsecase } from './application/batch-create-todo.usecase';
import { TodoAuthorizationService } from './application/services/todo-authorization.service';
import { TodoRepository } from './infrastructure/todo.repository';
import { CarriedOverHistoryRepository } from './infrastructure/carried-over-history.repository';
import { UserValidationService } from '../common/services/user-validation.service';
import { Todo } from './domain/todo.entity';
import { CarriedOverHistory } from './domain/carried-over-history.entity';
import { TodoMemo } from '../memo/domain/todo-memo.entity';
import { UserRepository } from '../user/infrastructure/user.repository';
import { User } from '../user/domain/user.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Todo, CarriedOverHistory, TodoMemo, User]),
    AiModule,
  ],
  controllers: [TodoController],
  providers: [
    CreateTodoUsecase,
    GetTodosUsecase,
    UpdateTodoUsecase,
    ChangeTodoStatusUsecase,
    DeleteTodoUsecase,
    CompleteDayUsecase,
    GetMonthlySummaryUsecase,
    RefineTextUsecase,
    BatchCreateTodoUsecase,
    TodoAuthorizationService,
    TodoRepository,
    CarriedOverHistoryRepository,
    UserValidationService,
    UserRepository,
  ],
  exports: [
    TodoRepository,
    CarriedOverHistoryRepository,
    TodoAuthorizationService,
  ],
})
export class TodoModule {}
