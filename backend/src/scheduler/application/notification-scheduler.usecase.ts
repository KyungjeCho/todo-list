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

      // WHY: PostgreSQL time 컬럼은 'HH:mm:ss' 로 직렬화되지만 로컬 시각 계산은
      // HH:mm 단위까지만 한다. 저장 포맷 차이로 비교가 영영 어긋나는 사고를 방지하기
      // 위해 선행 5글자(HH:mm)만 비교한다.
      const planHHmm = user.planTime?.substring(0, 5) ?? null;
      const reviewHHmm = user.reviewTime?.substring(0, 5) ?? null;

      if (planHHmm !== null && localTime === planHHmm) {
        try {
          await this.sendNotificationUsecase.execute(user.id, 'PLAN');
        } catch (error) {
          this.logger.error(
            `Failed to send PLAN notification for user ${user.id}`,
            error,
          );
        }
      }

      if (reviewHHmm !== null && localTime === reviewHHmm) {
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
