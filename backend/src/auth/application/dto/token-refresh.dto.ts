import { IsNotEmpty, IsString } from 'class-validator';

export class TokenRefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class TokenRefreshResponseDto {
  accessToken!: string;
  refreshToken!: string;
}
