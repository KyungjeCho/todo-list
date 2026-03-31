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
import { TodoRepository } from './infrastructure/todo.repository';
import { CarriedOverHistoryRepository } from './infrastructure/carried-over-history.repository';
import { Todo } from './domain/todo.entity';
import { CarriedOverHistory } from './domain/carried-over-history.entity';
import { TodoMemo } from '../memo/domain/todo-memo.entity';
import { UserRepository } from '../user/infrastructure/user.repository';
import { User } from '../user/domain/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Todo, CarriedOverHistory, TodoMemo, User]),
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
    TodoRepository,
    CarriedOverHistoryRepository,
    UserRepository,
  ],
  exports: [TodoRepository, CarriedOverHistoryRepository],
})
export class TodoModule {}
