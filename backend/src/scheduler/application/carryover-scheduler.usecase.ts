import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserRepository } from '../../user/infrastructure/user.repository';
import { Todo, TodoStatus } from '../../todo/domain/todo.entity';
import { CarriedOverHistory } from '../../todo/domain/carried-over-history.entity';

@Injectable()
export class CarryoverSchedulerUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly dataSource: DataSource,
  ) {}

  async execute(now: Date): Promise<void> {
    const users = await this.userRepository.findAllWithTimezone();

    for (const user of users) {
      if (!this.isMidnight(now, user.timezone)) {
        continue;
      }

      const yesterday = this.getYesterdayDate(now, user.timezone);

      // WHY: todo 조회를 트랜잭션 내부에서 pessimistic lock과 함께 수행하여
      // 동시 실행 시 중복 이월(TOCTOU) 방지
      await this.dataSource.transaction(async (manager) => {
        const txTodoRepo = manager.getRepository(Todo);
        const txHistoryRepo = manager.getRepository(CarriedOverHistory);

        const todos = await txTodoRepo.find({
          where: { userId: user.id, todoDate: yesterday },
          lock: { mode: 'pessimistic_write' },
        });

        const activeTodos = todos.filter((t) => t.status === TodoStatus.ACTIVE);
        if (activeTodos.length === 0) {
          return;
        }

        for (const todo of activeTodos) {
          const existingHistory = await txHistoryRepo.findOne({
            where: { fromTodoId: todo.id },
          });
          if (existingHistory) {
            continue;
          }

          const nextDate = this.getNextDate(yesterday);

          todo.status = TodoStatus.CARRIED_OVER;
          await txTodoRepo.save(todo);

          const newTodo = txTodoRepo.create({
            userId: user.id,
            content: todo.content,
            status: TodoStatus.ACTIVE,
            todoDate: nextDate,
            createdBy: user.id,
            updatedBy: user.id,
          });
          const savedNewTodo = await txTodoRepo.save(newTodo);

          const history = txHistoryRepo.create({
            fromTodoId: todo.id,
            toTodoId: savedNewTodo.id,
            createdBy: user.id,
            updatedBy: user.id,
          });
          await txHistoryRepo.save(history);
        }
      });
    }
  }

  private isMidnight(now: Date, timezone: string): boolean {
    const localTime = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(now);
    return parseInt(localTime, 10) === 0;
  }

  /**
   * WHY: 자정 기준이므로 "어제" = 방금 끝난 날짜.
   * 타임존의 현재 날짜에서 하루를 빼서 계산.
   */
  private getYesterdayDate(now: Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);

    const year = parts.find((p) => p.type === 'year')!.value;
    const month = parts.find((p) => p.type === 'month')!.value;
    const day = parts.find((p) => p.type === 'day')!.value;
    const todayStr = `${year}-${month}-${day}`;

    // WHY: 자정 시점이므로 today가 곧 어제의 다음날 → 어제 날짜를 직접 반환
    const today = new Date(todayStr + 'T00:00:00Z');
    today.setUTCDate(today.getUTCDate() - 1);
    return today.toISOString().split('T')[0];
  }

  private getNextDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().split('T')[0];
  }
}
