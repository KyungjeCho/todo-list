import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../domain/todo.entity';

@Injectable()
export class TodoRepository {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepo: Repository<Todo>,
  ) {}

  async findById(id: string): Promise<Todo | null> {
    return this.todoRepo.findOne({
      where: { id },
      relations: ['memos'],
    });
  }

  async findByUserIdAndDate(userId: string, todoDate: string): Promise<Todo[]> {
    return this.todoRepo.find({
      where: { userId, todoDate },
      relations: ['memos'],
      order: { createdAt: 'ASC' },
    });
  }

  async findByUserIdAndMonth(
    userId: string,
    year: number,
    month: number,
  ): Promise<Todo[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return this.todoRepo
      .createQueryBuilder('todo')
      .where('todo.userId = :userId', { userId })
      .andWhere('todo.todoDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('todo.todoDate', 'ASC')
      .addOrderBy('todo.createdAt', 'ASC')
      .getMany();
  }

  async create(data: Partial<Todo>): Promise<Todo> {
    const entity = this.todoRepo.create(data);
    const saved = await this.todoRepo.save(entity);
    return this.todoRepo.findOne({
      where: { id: saved.id },
      relations: ['memos'],
    }) as Promise<Todo>;
  }

  async update(
    idOrTodo: string | (Partial<Todo> & { id: string }),
    data?: Partial<Todo>,
  ): Promise<Todo> {
    let id: string;
    let updateData: Partial<Todo>;

    if (typeof idOrTodo === 'string') {
      id = idOrTodo;
      updateData = { ...data, id };
    } else {
      id = idOrTodo.id;
      updateData = idOrTodo;
    }

    await this.todoRepo.save(updateData);
    return this.todoRepo.findOne({
      where: { id },
      relations: ['memos'],
    }) as Promise<Todo>;
  }

  async softDelete(id: string): Promise<{ id: string; deletedAt: Date }> {
    const now = new Date();
    await this.todoRepo.softRemove({ id } as Todo);
    return { id, deletedAt: now };
  }
}
