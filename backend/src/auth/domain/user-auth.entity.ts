import { Entity, Column, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserAuthOauth } from './user-auth-oauth.entity';
import { UserSession } from './user-session.entity';
import { User } from '../../user/domain/user.entity';

@Entity('todolist_user_auth')
export class UserAuth extends BaseEntity {
  @Column({
    name: 'login_id',
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: true,
  })
  loginId!: string | null;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordHash!: string | null;

  @OneToMany(() => UserAuthOauth, (oauth) => oauth.userAuth)
  oauthAccounts!: UserAuthOauth[];

  @OneToMany(() => UserSession, (session) => session.userAuth)
  sessions!: UserSession[];

  @OneToOne(() => User, (user) => user.userAuth)
  user!: User;
}
