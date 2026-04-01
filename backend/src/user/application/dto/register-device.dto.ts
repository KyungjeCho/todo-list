import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  fcmToken!: string;

  @IsIn(['IOS', 'ANDROID'])
  deviceType!: 'IOS' | 'ANDROID';

  @IsString()
  @IsOptional()
  deviceName?: string;
}
