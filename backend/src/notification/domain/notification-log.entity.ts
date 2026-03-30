import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/domain/user.entity';

export type NotificationType = 'PLAN' | 'REVIEW';
export type NotificationStatus = 'SUCCESS' | 'FAIL';

@Entity('todolist_notification_log')
export class NotificationLog extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'notification_type', type: 'enum', enum: ['PLAN', 'REVIEW'] })
  notificationType!: NotificationType;

  @Column({ name: 'status', type: 'enum', enum: ['SUCCESS', 'FAIL'] })
  status!: NotificationStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
