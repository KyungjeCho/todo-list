import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../infrastructure/user.repository';
import type { UserProfileDto } from './dto';

interface GetProfileInput {
  userAuthId: string;
}

@Injectable()
export class GetProfileUsecase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: GetProfileInput): Promise<UserProfileDto> {
    const user = await this.userRepository.findByUserAuthId(input.userAuthId);

    if (!user) {
      throw new NotFoundException('NOT_FOUND');
    }

    return {
      id: user.id,
      userName: user.userName,
      planTime: user.planTime,
      reviewTime: user.reviewTime,
      timezone: user.timezone,
      language: user.language,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    };
  }
}
