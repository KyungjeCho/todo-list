import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CarriedOverHistory } from '../domain/carried-over-history.entity';

@Injectable()
export class CarriedOverHistoryRepository {
  constructor(
    @InjectRepository(CarriedOverHistory)
    private readonly repo: Repository<CarriedOverHistory>,
  ) {}

  async create(data: Partial<CarriedOverHistory>): Promise<CarriedOverHistory> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findByFromTodoId(
    fromTodoId: string,
  ): Promise<CarriedOverHistory | null> {
    return this.repo.findOne({ where: { fromTodoId } });
  }

  async findToTodoIds(toTodoIds: string[]): Promise<Set<string>> {
    if (toTodoIds.length === 0) return new Set();
    const rows = await this.repo.find({
      where: toTodoIds.map((id) => ({ toTodoId: id })),
      select: ['toTodoId'],
    });
    return new Set(rows.map((r) => r.toTodoId));
  }
}
