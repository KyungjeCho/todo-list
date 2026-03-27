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

  async create(data: Partial<User>): Promise<User> {
    const entity = this.userRepo.create(data);
    return this.userRepo.save(entity);
  }

  async update(user: User): Promise<User> {
    return this.userRepo.save(user);
  }
}
