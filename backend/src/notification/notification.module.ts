import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationLog } from './domain/notification-log.entity';
import { UserDevice } from './domain/user-device.entity';
import { NotificationLogRepository } from './infrastructure/notification-log.repository';
import { UserDeviceRepository } from './infrastructure/user-device.repository';
import { FcmService } from './infrastructure/fcm.service';
import { SendNotificationUsecase } from './application/send-notification.usecase';
import { RegisterDeviceUsecase } from './application/register-device.usecase';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationLog, UserDevice])],
  providers: [
    NotificationLogRepository,
    UserDeviceRepository,
    FcmService,
    SendNotificationUsecase,
    RegisterDeviceUsecase,
  ],
  exports: [
    SendNotificationUsecase,
    UserDeviceRepository,
    RegisterDeviceUsecase,
  ],
})
export class NotificationModule {}
