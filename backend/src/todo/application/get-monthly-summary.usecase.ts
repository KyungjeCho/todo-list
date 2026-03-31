import { Injectable, NotFoundException } from '@nestjs/common';
import { TodoRepository } from '../infrastructure/todo.repository';
import { UserRepository } from '../../user/infrastructure/user.repository';
import { TodoStatus } from '../domain/todo.entity';
import type {
  DaySummaryDto,
  MonthlySummaryResponseDto,
} from './dto/monthly-summary.dto';

interface GetMonthlySummaryInput {
  userAuthId: string;
  year: number;
  month: number;
}

@Injectable()
export class GetMonthlySummaryUsecase {
  constructor(
    private readonly todoRepository: TodoRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    input: GetMonthlySummaryInput,
  ): Promise<MonthlySummaryResponseDto> {
    const user = await this.userRepository.findByUserAuthId(input.userAuthId);
    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const todos = await this.todoRepository.findByUserIdAndMonth(
      user.id,
      input.year,
      input.month,
    );

    const dayMap = new Map<
      string,
      { totalCount: number; completedCount: number; activeCount: number; carriedOverCount: number }
    >();

    for (const todo of todos) {
      const date = todo.todoDate;
      const existing = dayMap.get(date) ?? {
        totalCount: 0,
        completedCount: 0,
        activeCount: 0,
        carriedOverCount: 0,
      };
      // WHY: CARRIED_OVER는 이월된 항목이므로 해당 날짜의 완료 판정에서 제외
      if (todo.status === TodoStatus.CARRIED_OVER) {
        existing.carriedOverCount++;
      } else {
        existing.totalCount++;
        if (todo.status === TodoStatus.COMPLETED) {
          existing.completedCount++;
        }
        if (todo.status === TodoStatus.ACTIVE) {
          existing.activeCount++;
        }
      }
      dayMap.set(date, existing);
    }

    const days: DaySummaryDto[] = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date,
        ...counts,
      }));

    return {
      year: input.year,
      month: input.month,
      days,
    };
  }
}
