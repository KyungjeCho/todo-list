import { Injectable, Logger } from '@nestjs/common';
import { UserRepository } from '../../user/infrastructure/user.repository';
import { SendNotificationUsecase } from '../../notification/application/send-notification.usecase';

@Injectable()
export class NotificationSchedulerUsecase {
  private readonly logger = new Logger(NotificationSchedulerUsecase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly sendNotificationUsecase: SendNotificationUsecase,
  ) {}

  async execute(now: Date): Promise<void> {
    const users = await this.userRepository.findAllWithTimezone();

    for (const user of users) {
      const localTime = this.getLocalHHmm(now, user.timezone);

      if (user.planTime !== null && localTime === user.planTime) {
        try {
          await this.sendNotificationUsecase.execute(user.id, 'PLAN');
        } catch (error) {
          this.logger.error(
            `Failed to send PLAN notification for user ${user.id}`,
            error,
          );
        }
      }

      if (user.reviewTime !== null && localTime === user.reviewTime) {
        try {
          await this.sendNotificationUsecase.execute(user.id, 'REVIEW');
        } catch (error) {
          this.logger.error(
            `Failed to send REVIEW notification for user ${user.id}`,
            error,
          );
        }
      }
    }
  }

  /** WHY: Intl.DateTimeFormat을 사용하여 사용자 타임존의 현재 시간(HH:mm)을 계산 */
  private getLocalHHmm(now: Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const hour = parts.find((p) => p.type === 'hour')!.value;
    const minute = parts.find((p) => p.type === 'minute')!.value;
    return `${hour}:${minute}`;
  }
}
