import { Injectable } from '@nestjs/common';
import { UserDeviceRepository } from '../infrastructure/user-device.repository';

interface RegisterDeviceInput {
  userId: string;
  fcmToken: string;
  deviceType: 'IOS' | 'ANDROID';
  deviceName?: string;
}

@Injectable()
export class RegisterDeviceUsecase {
  constructor(private readonly userDeviceRepository: UserDeviceRepository) {}

  async execute(input: RegisterDeviceInput): Promise<void> {
    await this.userDeviceRepository.upsertDevice({
      userId: input.userId,
      fcmToken: input.fcmToken,
      deviceType: input.deviceType,
      deviceName: input.deviceName,
    });
  }
}
