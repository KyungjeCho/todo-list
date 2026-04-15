import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../infrastructure/user.repository';
import type { UserProfileDto } from './dto';
import { normalizeHmm } from './dto';

interface CompleteOnboardingInput {
  userAuthId: string;
}

/**
 * 현재 사용자의 온보딩 완료 상태를 TRUE 로 전이시키는 멱등 유스케이스.
 *
 * WHY: plan/reviewTime 기반 추론 제거(FR-002). 알림 OFF 등 독립적으로
 * 바뀔 수 있는 설정과 온보딩 완료 여부를 분리하여 Issue 3/5 를 구조적으로 차단한다.
 * 재호출 시 상태 변경 없이 현재 프로필을 반환하여 네트워크 재시도·중복 호출에 안전.
 */
@Injectable()
export class CompleteOnboardingUsecase {
  private readonly logger = new Logger(CompleteOnboardingUsecase.name);

  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: CompleteOnboardingInput): Promise<UserProfileDto> {
    const user = await this.userRepository.findByUserAuthId(input.userAuthId);

    if (!user) {
      throw new NotFoundException('NOT_FOUND');
    }

    if (user.hasCompletedOnboarding) {
      this.logger.log(
        `user.onboarding.completed userAuthId=${input.userAuthId} transitioned=false`,
      );
      return this.toProfileDto(user);
    }

    user.hasCompletedOnboarding = true;
    const updated = await this.userRepository.update(user);

    this.logger.log(
      `user.onboarding.completed userAuthId=${input.userAuthId} transitioned=true`,
    );

    return this.toProfileDto(updated);
  }

  private toProfileDto(user: {
    id: string;
    userName: string;
    planTime: string | null;
    reviewTime: string | null;
    timezone: string | null;
    language: string;
    hasCompletedOnboarding: boolean;
  }): UserProfileDto {
    return {
      id: user.id,
      userName: user.userName,
      planTime: normalizeHmm(user.planTime),
      reviewTime: normalizeHmm(user.reviewTime),
      timezone: user.timezone,
      language: user.language,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    };
  }
}
