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

  async findByUserId(userId: string): Promise<UserDevice[]> {
    return this.deviceRepo.find({ where: { userId } });
  }

  async upsertDevice(data: {
    userId: string;
    fcmToken: string;
    deviceType: string;
    deviceName?: string;
  }): Promise<void> {
    const existing = await this.deviceRepo.findOne({
      where: { fcmToken: data.fcmToken },
    });

    if (existing) {
      existing.userId = data.userId;
      existing.deviceType = data.deviceType;
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
      });
      await this.deviceRepo.save(entity);
    }
  }

  async deleteByFcmToken(fcmToken: string): Promise<void> {
    await this.deviceRepo.softDelete({ fcmToken });
  }

  async deleteByFcmTokenForOwner(
    fcmToken: string,
    userAuthId: string,
  ): Promise<void> {
    const device = await this.deviceRepo
      .createQueryBuilder('device')
      .innerJoin('device.user', 'user')
      .where('device.fcmToken = :fcmToken', { fcmToken })
      .andWhere('user.userAuthId = :userAuthId', { userAuthId })
      .getOne();

    if (device) {
      await this.deviceRepo.softDelete(device.id);
    }
  }
}
