import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  userName?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'planTime must be in HH:mm format',
  })
  planTime?: string | null;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'reviewTime must be in HH:mm format',
  })
  reviewTime?: string | null;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  language?: string;
}
