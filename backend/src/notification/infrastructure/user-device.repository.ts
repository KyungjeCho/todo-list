import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDevice } from '../domain/user-device.entity';

@Injectable()
export class UserDeviceRepository {
  constructor(
    @InjectRepository(UserDevice)
    private readonly deviceRepo: Repository<UserDevice>,
  ) {}

  async upsertDevice(data: {
    userId: string;
    fcmToken: string;
    deviceType: string;
    deviceName?: string;
    createdBy: string;
    updatedBy: string;
  }): Promise<void> {
    const existing = await this.deviceRepo.findOne({
      where: { fcmToken: data.fcmToken },
    });

    if (existing) {
      existing.userId = data.userId;
      existing.deviceType = data.deviceType;
      existing.updatedBy = data.updatedBy;
      if (data.deviceName !== undefined) {
        existing.deviceName = data.deviceName ?? null;
      }
      await this.deviceRepo.save(existing);
    } else {
      const entity = this.deviceRepo.create({
        userId: data.userId,
        fcmToken: data.fcmToken,
        deviceType: data.deviceType,
        deviceName: data.deviceName ?? null,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
      });
      await this.deviceRepo.save(entity);
    }
  }

  async deleteByFcmToken(fcmToken: string): Promise<void> {
    await this.deviceRepo.softDelete({ fcmToken });
  }
}
