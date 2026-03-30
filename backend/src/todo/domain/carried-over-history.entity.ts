import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Todo } from './todo.entity';

@Entity('todolist_carried_over_history')
@Unique('UQ_carried_over_from_todo', ['fromTodoId'])
export class CarriedOverHistory extends BaseEntity {
  @Column({ name: 'from_todo_id', type: 'uuid' })
  fromTodoId!: string;

  @Column({ name: 'to_todo_id', type: 'uuid' })
  toTodoId!: string;

  @ManyToOne(() => Todo)
  @JoinColumn({ name: 'from_todo_id' })
  fromTodo!: Todo;

  @ManyToOne(() => Todo)
  @JoinColumn({ name: 'to_todo_id' })
  toTodo!: Todo;
}
