import { Entity, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserAuth } from '../../auth/domain/user-auth.entity';
import { UserDevice } from '../../notification/domain/user-device.entity';

@Entity('todolist_user')
export class User extends BaseEntity {
  @Column({ name: 'user_auth_id', type: 'uuid', unique: true })
  userAuthId!: string;

  @Column({ name: 'user_name', type: 'varchar', length: 100 })
  userName!: string;

  @Column({ name: 'plan_time', type: 'time', nullable: true })
  planTime!: string | null;

  @Column({ name: 'review_time', type: 'time', nullable: true })
  reviewTime!: string | null;

  @Column({ name: 'timezone', type: 'varchar', length: 64, nullable: true })
  timezone!: string | null;

  @Column({ name: 'language', type: 'varchar', length: 10 })
  language!: string;

  @OneToOne(() => UserAuth, (auth) => auth.user)
  @JoinColumn({ name: 'user_auth_id' })
  userAuth!: UserAuth;

  @OneToMany(() => UserDevice, (device) => device.user)
  devices!: UserDevice[];

  todos!: unknown[];
}
