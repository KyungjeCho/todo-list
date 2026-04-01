import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TodoRepository } from '../infrastructure/todo.repository';
import { UserRepository } from '../../user/infrastructure/user.repository';
import { Todo, TodoStatus } from '../domain/todo.entity';
import { CarriedOverHistory } from '../domain/carried-over-history.entity';
import type {
  CompleteDayResponseDto,
  CarriedOverTodoDto,
} from './dto/complete-day.dto';

interface CompleteDayInput {
  userAuthId: string;
  date: string;
}

@Injectable()
export class CompleteDayUsecase {
  constructor(
    private readonly todoRepository: TodoRepository,
    private readonly userRepository: UserRepository,
    private readonly dataSource: DataSource,
  ) {}

  async execute(input: CompleteDayInput): Promise<CompleteDayResponseDto> {
    if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      throw new BadRequestException('VALIDATION_ERROR');
    }

    const user = await this.userRepository.findByUserAuthId(input.userAuthId);
    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const carriedOverTodos: CarriedOverTodoDto[] = [];

    // WHY: todo 조회를 트랜잭션 내부에서 pessimistic lock과 함께 수행하여
    // 동시 요청 시 중복 이월(TOCTOU) 방지
    const todos = await this.dataSource.transaction(async (manager) => {
      const txTodoRepo = manager.getRepository(Todo);
      const txHistoryRepo = manager.getRepository(CarriedOverHistory);

      const txTodos = await txTodoRepo.find({
        where: { userId: user.id, todoDate: input.date },
        lock: { mode: 'pessimistic_write' },
      });

      const activeTodos = txTodos.filter((t) => t.status === TodoStatus.ACTIVE);

      for (const todo of activeTodos) {
        const existingHistory = await txHistoryRepo.findOne({
          where: { fromTodoId: todo.id },
        });
        if (existingHistory) {
          continue;
        }

        const nextDate = this.getNextDate(input.date);

        // WHY: ACTIVE → CARRIED_OVER 전이는 canTransitionTo에 없음 (시스템 전용)
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

        carriedOverTodos.push({
          fromTodoId: todo.id,
          toTodoId: savedNewTodo.id,
          content: todo.content,
        });
      }

      return txTodos;
    });

    const completedCount = todos.filter(
      (t) => t.status === TodoStatus.COMPLETED,
    ).length;
    const activeCount = todos.filter(
      (t) => t.status === TodoStatus.ACTIVE,
    ).length;
    const inactiveCount = todos.filter(
      (t) => t.status === TodoStatus.INACTIVE,
    ).length;
    const total = todos.length;
    const nonCarriedOverCount = todos.filter(
      (t) => t.status !== TodoStatus.CARRIED_OVER,
    ).length;
    const progressRate =
      nonCarriedOverCount > 0
        ? Math.round((completedCount / nonCarriedOverCount) * 1000) / 10
        : 0;

    return {
      date: input.date,
      stats: {
        total,
        completed: completedCount,
        active: activeCount,
        inactive: inactiveCount,
        progressRate,
      },
      carriedOverCount: carriedOverTodos.length,
      carriedOverTodos,
    };
  }

  private getNextDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().split('T')[0];
  }
}
