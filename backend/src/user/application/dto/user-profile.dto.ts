import { IsBoolean } from 'class-validator';

export class UserProfileDto {
  id!: string;
  userName!: string;
  planTime!: string | null;
  reviewTime!: string | null;
  timezone!: string | null;
  language!: string;

  @IsBoolean()
  hasCompletedOnboarding!: boolean;
}
