import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CarryoverSchedulerUsecase } from './application/carryover-scheduler.usecase';
import { CarryoverSchedulerService } from './carryover-scheduler.service';
import { TodoModule } from '../todo/todo.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [ScheduleModule.forRoot(), TodoModule, UserModule],
  providers: [CarryoverSchedulerUsecase, CarryoverSchedulerService],
  exports: [CarryoverSchedulerUsecase],
})
export class SchedulerModule {}
