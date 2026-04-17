import { Injectable, BadRequestException } from '@nestjs/common';
import { UserRepository } from '../infrastructure/user.repository';
import { UserValidationService } from '../../common/services/user-validation.service';
import type { UserProfileDto } from './dto';
import { normalizeHmm } from './dto';

const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/;
const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'es'] as const;

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

interface UpdateSettingsInput {
  userAuthId: string;
  userName?: string;
  planTime?: string | null;
  reviewTime?: string | null;
  timezone?: string;
  language?: string;
}

@Injectable()
export class UpdateSettingsUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userValidationService: UserValidationService,
  ) {}

  async execute(input: UpdateSettingsInput): Promise<UserProfileDto> {
    const user = await this.userValidationService.ensureUserExists(
      input.userAuthId,
    );

    if (input.userName !== undefined) {
      if (input.userName.length === 0 || input.userName.length > 100) {
        throw new BadRequestException('BAD_REQUEST');
      }
      user.userName = input.userName;
    }

    if (input.planTime !== undefined) {
      if (input.planTime !== null && !TIME_FORMAT.test(input.planTime)) {
        throw new BadRequestException('INVALID_TIME_FORMAT');
      }
      user.planTime = input.planTime;
    }

    if (input.reviewTime !== undefined) {
      if (input.reviewTime !== null && !TIME_FORMAT.test(input.reviewTime)) {
        throw new BadRequestException('INVALID_TIME_FORMAT');
      }
      user.reviewTime = input.reviewTime;
    }

    if (input.timezone !== undefined) {
      if (!isValidTimezone(input.timezone)) {
        throw new BadRequestException('INVALID_TIMEZONE');
      }
      user.timezone = input.timezone;
    }

    if (input.language !== undefined) {
      if (
        !(SUPPORTED_LANGUAGES as readonly string[]).includes(input.language)
      ) {
        throw new BadRequestException('INVALID_LANGUAGE');
      }
      user.language = input.language;
    }

    const updated = await this.userRepository.update(user);

    return {
      id: updated.id,
      userName: updated.userName,
      planTime: normalizeHmm(updated.planTime),
      reviewTime: normalizeHmm(updated.reviewTime),
      timezone: updated.timezone,
      language: updated.language,
      hasCompletedOnboarding: updated.hasCompletedOnboarding,
    };
  }
}
