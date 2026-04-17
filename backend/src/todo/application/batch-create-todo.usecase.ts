import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { UserValidationService } from '../../common/services/user-validation.service';
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
    private readonly userValidationService: UserValidationService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(input: BatchCreateTodoInput): Promise<BatchCreateTodoOutput> {
    const user = await this.userValidationService.ensureUserExists(
      input.userAuthId,
    );

    // WHY: 배치 생성을 단일 트랜잭션으로 감싸서 원자성을 보장한다.
    // 중간 항목에서 실패하면 전체 롤백되어 부분 생성(partial create)을 방지한다.
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

          // WHY: 새로 생성한 todo는 memos가 항상 빈 배열이므로 findOne 불필요
          results.push({
            id: saved.id,
            content: saved.content,
            status: saved.status,
            isCarriedOver: false,
            todoDate: saved.todoDate,
            memos: [],
            createdAt: new Date(saved.createdAt).toISOString(),
            updatedAt: new Date(saved.updatedAt).toISOString(),
          });
        }

        return results;
      },
    );

    return { created };
  }
}
