import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemoController } from './memo.controller';
import { CreateMemoUsecase } from './application/create-memo.usecase';
import { UpdateMemoUsecase } from './application/update-memo.usecase';
import { DeleteMemoUsecase } from './application/delete-memo.usecase';
import { MemoRepository } from './infrastructure/memo.repository';
import { TodoMemo } from './domain/todo-memo.entity';
import { Todo } from '../todo/domain/todo.entity';
import { User } from '../user/domain/user.entity';
import { TodoRepository } from '../todo/infrastructure/todo.repository';
import { UserRepository } from '../user/infrastructure/user.repository';

@Module({
  imports: [TypeOrmModule.forFeature([TodoMemo, Todo, User])],
  controllers: [MemoController],
  providers: [
    CreateMemoUsecase,
    UpdateMemoUsecase,
    DeleteMemoUsecase,
    MemoRepository,
    TodoRepository,
    UserRepository,
  ],
  exports: [MemoRepository],
})
export class MemoModule {}
