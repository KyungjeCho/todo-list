import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../user/infrastructure/user.repository';
import { User } from '../../user/domain/user.entity';
import { ERROR_CODES } from '../constants/error-codes';

@Injectable()
export class UserValidationService {
  constructor(private readonly userRepository: UserRepository) {}

  async ensureUserExists(userAuthId: string): Promise<User> {
    const user = await this.userRepository.findByUserAuthId(userAuthId);
    if (!user) {
      throw new NotFoundException(ERROR_CODES.USER_NOT_FOUND);
    }
    return user;
  }
}
