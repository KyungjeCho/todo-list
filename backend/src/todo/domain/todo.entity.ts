import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/domain/user.entity';
import { TodoMemo } from '../../memo/domain/todo-memo.entity';

export enum TodoStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  COMPLETED = 'COMPLETED',
  CARRIED_OVER = 'CARRIED_OVER',
}

const VALID_TRANSITIONS: Record<TodoStatus, TodoStatus[]> = {
  [TodoStatus.ACTIVE]: [TodoStatus.COMPLETED, TodoStatus.INACTIVE],
  [TodoStatus.INACTIVE]: [TodoStatus.ACTIVE],
  [TodoStatus.COMPLETED]: [TodoStatus.ACTIVE],
  [TodoStatus.CARRIED_OVER]: [],
};

@Entity('todolist_todo')
export class Todo extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'todo_date', type: 'date' })
  todoDate!: string;

  @Column({ name: 'content', type: 'varchar', length: 255 })
  content!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: TodoStatus,
    default: TodoStatus.ACTIVE,
  })
  status!: TodoStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => TodoMemo, (memo) => memo.todo)
  memos!: TodoMemo[];

  canTransitionTo(newStatus: TodoStatus): boolean {
    return VALID_TRANSITIONS[this.status]?.includes(newStatus) ?? false;
  }

  changeStatus(newStatus: TodoStatus): void {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(
        `Invalid status transition from ${this.status} to ${newStatus}`,
      );
    }
    this.status = newStatus;
  }
}
