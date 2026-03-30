import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CarryoverSchedulerUsecase } from './application/carryover-scheduler.usecase';
import { CarryoverSchedulerService } from './carryover-scheduler.service';
import { NotificationSchedulerUsecase } from './application/notification-scheduler.usecase';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { TodoModule } from '../todo/todo.module';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TodoModule,
    UserModule,
    NotificationModule,
  ],
  providers: [
    CarryoverSchedulerUsecase,
    CarryoverSchedulerService,
    NotificationSchedulerUsecase,
    NotificationSchedulerService,
  ],
  exports: [CarryoverSchedulerUsecase, NotificationSchedulerUsecase],
})
export class SchedulerModule {}
