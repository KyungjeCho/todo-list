import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../domain/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByUserAuthId(userAuthId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { userAuthId } });
  }

  async findAllWithTimezone(): Promise<
    (Pick<User, 'id' | 'planTime' | 'reviewTime'> & { timezone: string })[]
  > {
    // WHY: timezone 자동 감지 실패 시 null 저장이 허용되므로 필터링하지 않고
    // 'UTC'로 fallback한다. 그렇지 않으면 온보딩은 끝났는데(planTime/reviewTime 설정 완료)
    // timezone이 null인 사용자가 스케줄 대상에서 영구 제외됨.
    const users = await this.userRepo
      .createQueryBuilder('user')
      .select(['user.id', 'user.planTime', 'user.reviewTime', 'user.timezone'])
      .getMany();
    return users.map((user) => ({
      id: user.id,
      planTime: user.planTime,
      reviewTime: user.reviewTime,
      timezone: user.timezone ?? 'UTC',
    }));
  }

  async create(data: Partial<User>): Promise<User> {
    const entity = this.userRepo.create(data);
    return this.userRepo.save(entity);
  }

  async update(user: User): Promise<User> {
    return this.userRepo.save(user);
  }
}
