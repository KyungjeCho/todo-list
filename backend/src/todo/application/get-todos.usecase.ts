import { Injectable, NotFoundException } from '@nestjs/common';
import { TodoRepository } from '../infrastructure/todo.repository';
import { CarriedOverHistoryRepository } from '../infrastructure/carried-over-history.repository';
import { UserRepository } from '../../user/infrastructure/user.repository';
import { TodoStatus } from '../domain/todo.entity';
import type { TodoListResponseDto, TodoItemDto } from './dto';

interface GetTodosInput {
  userAuthId: string;
  date: string;
}

@Injectable()
export class GetTodosUsecase {
  constructor(
    private readonly todoRepository: TodoRepository,
    private readonly carriedOverHistoryRepository: CarriedOverHistoryRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: GetTodosInput): Promise<TodoListResponseDto> {
    const user = await this.userRepository.findByUserAuthId(input.userAuthId);
    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const todos = await this.todoRepository.findByUserIdAndDate(
      user.id,
      input.date,
    );

    const sortedTodos = [...todos].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const total = sortedTodos.length;
    const completed = sortedTodos.filter(
      (t) => t.status === TodoStatus.COMPLETED,
    ).length;
    const active = sortedTodos.filter(
      (t) => t.status === TodoStatus.ACTIVE,
    ).length;
    const inactive = sortedTodos.filter(
      (t) => t.status === TodoStatus.INACTIVE,
    ).length;

    // WHY(FR-001~004): 008 이후 이월 루틴은 원본 status를 CARRIED_OVER로 전이하지 않지만,
    // 과거 데이터에 남아 있는 CARRIED_OVER 레코드(레거시)는 진행률 분모에서 계속 제외한다.
    const nonCarriedOverCount = sortedTodos.filter(
      (t) => t.status !== TodoStatus.CARRIED_OVER,
    ).length;
    const progressRate =
      nonCarriedOverCount > 0
        ? Math.round((completed / nonCarriedOverCount) * 1000) / 10
        : 0;

    const mode = this.determineMode(
      user.planTime,
      user.reviewTime,
      user.timezone ?? 'UTC',
    );

    const todoIds = sortedTodos.map((t) => t.id);
    const carriedOverToIds =
      await this.carriedOverHistoryRepository.findToTodoIds(todoIds);

    const todoItems: TodoItemDto[] = sortedTodos.map((todo) => {
      const memos = (
        (todo.memos as {
          id: string;
          todoId: string;
          content: string;
          createdAt: Date;
          updatedAt: Date;
        }[]) ?? []
      )
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
        .map((memo) => ({
          id: memo.id,
          todoId: memo.todoId,
          content: memo.content,
          createdAt: new Date(memo.createdAt).toISOString(),
          updatedAt: new Date(memo.updatedAt).toISOString(),
        }));

      return {
        id: todo.id,
        content: todo.content,
        status: todo.status,
        // WHY(FR-001~004): 어제 원본 status가 더 이상 CARRIED_OVER로 전이되지 않으므로
        // 이월 여부 판정은 CarriedOverHistory → to todo id 집합 기반 단일 판정으로 충분.
        isCarriedOver: carriedOverToIds.has(todo.id),
        todoDate: todo.todoDate,
        memos,
        createdAt: new Date(todo.createdAt).toISOString(),
        updatedAt: new Date(todo.updatedAt).toISOString(),
      };
    });

    return {
      date: input.date,
      mode,
      stats: { total, completed, active, inactive, progressRate },
      todos: todoItems,
    };
  }

  private determineMode(
    planTime: string | null,
    reviewTime: string | null,
    timezone: string,
  ): 'PLAN' | 'REVIEW' {
    if (!planTime || !reviewTime) {
      return 'PLAN';
    }

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const currentTime = formatter.format(now);
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const currentMinutes = currentHour * 60 + currentMinute;

    const [reviewHour, reviewMinute] = reviewTime.split(':').map(Number);
    const reviewMinutes = reviewHour * 60 + reviewMinute;

    return currentMinutes >= reviewMinutes ? 'REVIEW' : 'PLAN';
  }
}
