import { IsIn, IsOptional, IsString } from 'class-validator';

const VALID_PROVIDERS = ['google', 'naver', 'kakao', 'apple'] as const;
const VALID_DEVICE_TYPES = ['IOS', 'ANDROID'] as const;

export type OAuthProvider = (typeof VALID_PROVIDERS)[number];
export type DeviceType = (typeof VALID_DEVICE_TYPES)[number];

export class OAuthLoginDto {
  @IsIn(VALID_PROVIDERS)
  provider!: OAuthProvider;

  @IsString()
  @IsOptional()
  fcmToken?: string;

  @IsIn(VALID_DEVICE_TYPES)
  deviceType!: DeviceType;

  @IsString()
  @IsOptional()
  deviceName?: string;
}

export class OAuthLoginResponseDto {
  redirectUrl!: string;
}
