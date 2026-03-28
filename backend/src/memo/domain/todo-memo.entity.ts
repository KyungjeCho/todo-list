import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Todo } from '../../todo/domain/todo.entity';

@Entity('todolist_todo_memo')
export class TodoMemo extends BaseEntity {
  @Column({ name: 'todo_id', type: 'uuid' })
  todoId!: string;

  @Column({ name: 'content', type: 'text' })
  content!: string;

  @ManyToOne(() => Todo, (todo) => todo.memos)
  @JoinColumn({ name: 'todo_id' })
  todo!: Todo;
}
