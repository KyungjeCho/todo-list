import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { UserRepository } from '../../user/infrastructure/user.repository';
import { Todo, TodoStatus } from '../domain/todo.entity';
import type { TodoItemDto } from './dto/todo-response.dto';

interface BatchCreateTodoItem {
  content: string;
  todoDate: string;
}

interface BatchCreateTodoInput {
  userAuthId: string;
  todos: BatchCreateTodoItem[];
}

export interface BatchCreateTodoOutput {
  created: TodoItemDto[];
}

@Injectable()
export class BatchCreateTodoUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly dataSource: DataSource,
  ) {}

  async execute(input: BatchCreateTodoInput): Promise<BatchCreateTodoOutput> {
    const user = await this.userRepository.findByUserAuthId(input.userAuthId);
    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const created = await this.dataSource.transaction(
      async (manager: EntityManager) => {
        const todoRepo = manager.getRepository(Todo);
        const results: TodoItemDto[] = [];

        for (const item of input.todos) {
          const entity = todoRepo.create({
            userId: user.id,
            content: item.content,
            todoDate: item.todoDate,
            status: TodoStatus.ACTIVE,
            createdBy: user.id,
            updatedBy: user.id,
          });

          const saved = await todoRepo.save(entity);
          const todo = await todoRepo.findOne({
            where: { id: saved.id },
            relations: ['memos'],
          });

          if (!todo) continue;

          const memos = (todo.memos ?? []).map((memo) => ({
            id: memo.id,
            todoId: memo.todoId,
            content: memo.content,
            createdAt: new Date(memo.createdAt).toISOString(),
            updatedAt: new Date(memo.updatedAt).toISOString(),
          }));

          results.push({
            id: todo.id,
            content: todo.content,
            status: todo.status,
            isCarriedOver: false,
            todoDate: todo.todoDate,
            memos,
            createdAt: new Date(todo.createdAt).toISOString(),
            updatedAt: new Date(todo.updatedAt).toISOString(),
          });
        }

        return results;
      },
    );

    return { created };
  }
}
