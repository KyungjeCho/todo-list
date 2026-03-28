import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodoController } from './todo.controller';
import { CreateTodoUsecase } from './application/create-todo.usecase';
import { GetTodosUsecase } from './application/get-todos.usecase';
import { UpdateTodoUsecase } from './application/update-todo.usecase';
import { ChangeTodoStatusUsecase } from './application/change-todo-status.usecase';
import { DeleteTodoUsecase } from './application/delete-todo.usecase';
import { TodoRepository } from './infrastructure/todo.repository';
import { Todo } from './domain/todo.entity';
import { TodoMemo } from '../memo/domain/todo-memo.entity';
import { UserRepository } from '../user/infrastructure/user.repository';
import { User } from '../user/domain/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Todo, TodoMemo, User])],
  controllers: [TodoController],
  providers: [
    CreateTodoUsecase,
    GetTodosUsecase,
    UpdateTodoUsecase,
    ChangeTodoStatusUsecase,
    DeleteTodoUsecase,
    TodoRepository,
    UserRepository,
  ],
  exports: [TodoRepository],
})
export class TodoModule {}
