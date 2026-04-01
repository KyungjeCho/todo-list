import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CarryoverSchedulerUsecase } from './application/carryover-scheduler.usecase';

@Injectable()
export class CarryoverSchedulerService {
  private readonly logger = new Logger(CarryoverSchedulerService.name);

  constructor(
    private readonly carryoverSchedulerUsecase: CarryoverSchedulerUsecase,
  ) {}

  /** WHY: 매 정시마다 실행하여 각 사용자의 타임존 자정에 이월 처리 */
  @Cron(CronExpression.EVERY_HOUR)
  async handleCarryover(): Promise<void> {
    this.logger.log('Carryover scheduler triggered');
    try {
      await this.carryoverSchedulerUsecase.execute(new Date());
      this.logger.log('Carryover scheduler completed');
    } catch (error) {
      this.logger.error('Carryover scheduler failed', error);
    }
  }
}
