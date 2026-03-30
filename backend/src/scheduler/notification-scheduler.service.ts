import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationSchedulerUsecase } from './application/notification-scheduler.usecase';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly notificationSchedulerUsecase: NotificationSchedulerUsecase,
  ) {}

  /** WHY: 매분 실행하여 HH:mm 단위로 사용자별 알림 발송 여부를 판단. PRD 요구사항: ±1분 정확도 */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleNotifications(): Promise<void> {
    this.logger.log('Notification scheduler triggered');
    try {
      await this.notificationSchedulerUsecase.execute(new Date());
      this.logger.log('Notification scheduler completed');
    } catch (error) {
      this.logger.error('Notification scheduler failed', error);
    }
  }
}
