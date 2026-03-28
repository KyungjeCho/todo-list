import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserAuth } from './user-auth.entity';

@Entity('todolist_user_session')
export class UserSession extends BaseEntity {
  @Column({ name: 'user_auth_id', type: 'uuid' })
  userAuthId!: string;

  @Column({ name: 'refresh_token', type: 'text', unique: true })
  refreshToken!: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'expired_at', type: 'timestamptz' })
  expiredAt!: Date;

  @ManyToOne(() => UserAuth, (auth) => auth.sessions)
  @JoinColumn({ name: 'user_auth_id' })
  userAuth!: UserAuth;
}
