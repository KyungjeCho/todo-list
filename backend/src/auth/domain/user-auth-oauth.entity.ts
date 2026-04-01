import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserAuth } from './user-auth.entity';

@Entity('todolist_user_auth_oauth')
@Unique('ux_userAuthOauth_provider_providerUserId', [
  'provider',
  'providerUserId',
])
export class UserAuthOauth extends BaseEntity {
  @Column({ name: 'user_auth_id', type: 'uuid' })
  userAuthId!: string;

  @Column({ name: 'provider', type: 'varchar', length: 100 })
  provider!: string;

  @Column({
    name: 'provider_user_id',
    type: 'varchar',
    length: 255,
  })
  providerUserId!: string;

  @Column({ name: 'provider_user_email', type: 'varchar', length: 255 })
  providerUserEmail!: string;

  @ManyToOne(() => UserAuth, (auth) => auth.oauthAccounts)
  @JoinColumn({ name: 'user_auth_id' })
  userAuth!: UserAuth;
}
