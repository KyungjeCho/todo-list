import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TodoMemo } from '../domain/todo-memo.entity';

@Injectable()
export class MemoRepository {
  constructor(
    @InjectRepository(TodoMemo)
    private readonly memoRepo: Repository<TodoMemo>,
  ) {}

  async findById(id: string): Promise<TodoMemo | null> {
    return this.memoRepo.findOne({ where: { id } });
  }

  async create(data: Partial<TodoMemo>): Promise<TodoMemo> {
    const entity = this.memoRepo.create(data);
    return this.memoRepo.save(entity);
  }

  async update(id: string, data: Partial<TodoMemo>): Promise<TodoMemo> {
    await this.memoRepo.save({ ...data, id });
    return this.memoRepo.findOne({ where: { id } }) as Promise<TodoMemo>;
  }

  async softDelete(id: string): Promise<{ id: string; deletedAt: Date }> {
    const now = new Date();
    await this.memoRepo.softRemove({ id } as TodoMemo);
    return { id, deletedAt: now };
  }
}
