import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;

  @IsOptional()
  @IsString()
  fcmToken?: string;
}

export class LogoutResponseDto {
  message!: string;
}
