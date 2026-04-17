import { Injectable } from '@nestjs/common';
import { TodoRepository } from '../infrastructure/todo.repository';
import { CarriedOverHistoryRepository } from '../infrastructure/carried-over-history.repository';
import { UserValidationService } from '../../common/services/user-validation.service';
import { TodoItemMapper } from './mappers/todo-item.mapper';
import { TodoStatus } from '../domain/todo.entity';
import type { TodoListResponseDto, TodoItemDto } from './dto/todo-response.dto';

interface GetTodosInput {
  userAuthId: string;
  date: string;
}

@Injectable()
export class GetTodosUsecase {
  constructor(
    private readonly todoRepository: TodoRepository,
    private readonly carriedOverHistoryRepository: CarriedOverHistoryRepository,
    private readonly userValidationService: UserValidationService,
  ) {}

  async execute(input: GetTodosInput): Promise<TodoListResponseDto> {
    const user = await this.userValidationService.ensureUserExists(
      input.userAuthId,
    );

    const todos = await this.todoRepository.findByUserIdAndDate(
      user.id,
      input.date,
    );

    const sortedTodos = [...todos].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const total = sortedTodos.length;
    // WHY: 4회 filter() 순회를 1회 reduce()로 통합하여 O(4n) → O(n) 최적화
    const counts = sortedTodos.reduce(
      (acc, t) => {
        if (t.status === TodoStatus.COMPLETED) acc.completed++;
        else if (t.status === TodoStatus.ACTIVE) acc.active++;
        else if (t.status === TodoStatus.INACTIVE) acc.inactive++;
        if (t.status !== TodoStatus.CARRIED_OVER) acc.nonCarriedOver++;
        return acc;
      },
      { completed: 0, active: 0, inactive: 0, nonCarriedOver: 0 },
    );
    const { completed, active, inactive } = counts;

    // WHY(FR-001~004): 008 이후 이월 루틴은 원본 status를 CARRIED_OVER로 전이하지 않지만,
    // 과거 데이터에 남아 있는 CARRIED_OVER 레코드(레거시)는 진행률 분모에서 계속 제외한다.
    const nonCarriedOverCount = counts.nonCarriedOver;
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
      const dto = TodoItemMapper.toDto(todo);
      // WHY(FR-001~004): 어제 원본 status가 더 이상 CARRIED_OVER로 전이되지 않으므로
      // 이월 여부 판정은 CarriedOverHistory → to todo id 집합 기반 단일 판정으로 충분.
      dto.isCarriedOver = carriedOverToIds.has(todo.id);
      // Sort memos by createdAt
      dto.memos = dto.memos.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      return dto;
    });

    return {
      date: input.date,
      mode,
      stats: { total, completed, active, inactive, progressRate },
      todos: todoItems,
    };
  }

  // WHY: 사용자가 설정한 planTime/reviewTime을 기준으로 현재 시각에 따라 모드를 전환한다.
  // reviewTime 이후에는 하루를 돌아보는 REVIEW 모드, 그 전에는 할 일을 계획하는 PLAN 모드.
  // planTime/reviewTime 미설정 시 기본 PLAN 모드를 반환하여 신규 유저도 정상 동작.
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
