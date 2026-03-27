import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/domain/user.entity';

@Entity('TODOLIST_USER_DEVICE')
export class UserDevice extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'fcm_token', type: 'text', unique: true })
  fcmToken!: string;

  @Column({ name: 'device_type', type: 'varchar', length: 20 })
  deviceType!: string;

  @Column({ name: 'device_name', type: 'varchar', length: 100, nullable: true })
  deviceName!: string | null;

  @ManyToOne(() => User, (user) => user.devices)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
