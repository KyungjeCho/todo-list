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
    // WHY: fcm_token 유니크 인덱스가 soft-delete 무시(WHERE 절 없음)이므로
    // 로그아웃으로 soft-deleted된 행을 포함해 조회하고, 존재하면 복원(deletedAt=null)한다.
    // 이렇게 하지 않으면 재로그인 시 동일 토큰 INSERT에서 unique constraint 위반 발생.
    const existing = await this.deviceRepo.findOne({
      where: { fcmToken: data.fcmToken },
      withDeleted: true,
    });

    if (existing) {
      existing.userId = data.userId;
      existing.deviceType = data.deviceType;
      existing.deletedAt = null;
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

    // WHY: FCM 은 동일 기기의 토큰이 회전(onTokenRefresh)하거나 앱 재설치 시
    // 옛 토큰을 즉시 무효화한다. 같은 (userId, deviceType) 의 다른 활성 행은
    // 전부 죽은 토큰이므로, 스케줄러가 헛쏘지 않도록 즉시 soft-delete 한다.
    // WHY(R-004, 012-apple-fcm-integration): iPhone+iPad 등 같은 deviceType 을
    // 공유하는 다기기 공존을 허용하기 위해, deviceName 이 제공된 경우에만 범위를
    // (userId, deviceType, deviceName) 로 좁힌다. 미제공(Android 기존 경로)이면
    // 기존 (userId, deviceType) 범위를 그대로 유지해 회귀를 방지한다.
    const staleQuery = this.deviceRepo
      .createQueryBuilder()
      .softDelete()
      .where('user_id = :userId', { userId: data.userId })
      .andWhere('device_type = :deviceType', { deviceType: data.deviceType })
      .andWhere('fcm_token != :fcmToken', { fcmToken: data.fcmToken })
      .andWhere('deleted_at IS NULL');

    if (data.deviceName !== undefined && data.deviceName !== null) {
      staleQuery.andWhere('device_name = :deviceName', {
        deviceName: data.deviceName,
      });
    }

    await staleQuery.execute();
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
