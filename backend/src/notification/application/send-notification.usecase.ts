import { Injectable, Logger } from '@nestjs/common';
import { FcmService } from '../infrastructure/fcm.service';
import { UserDeviceRepository } from '../infrastructure/user-device.repository';
import { NotificationLogRepository } from '../infrastructure/notification-log.repository';
import type { NotificationType } from '../domain/notification-log.entity';

const MAX_RETRY = 3;

/** WHY: FCM이 반환하는 영구 실패 코드. 재시도해도 복구 불가하므로 토큰 삭제 대상 */
const PERMANENT_FAILURE_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/mismatched-credential',
]);

const NOTIFICATION_MESSAGES: Record<
  NotificationType,
  { title: string; body: string }
> = {
  PLAN: { title: '계획 시간입니다', body: '오늘의 할 일을 계획해보세요' },
  REVIEW: { title: '회고 시간입니다', body: '오늘 하루를 돌아보세요' },
};

@Injectable()
export class SendNotificationUsecase {
  private readonly logger = new Logger(SendNotificationUsecase.name);

  constructor(
    private readonly fcmService: FcmService,
    private readonly userDeviceRepository: UserDeviceRepository,
    private readonly notificationLogRepository: NotificationLogRepository,
  ) {}

  async execute(
    userId: string,
    notificationType: NotificationType,
  ): Promise<void> {
    const devices = await this.userDeviceRepository.findByUserId(userId);

    if (devices.length === 0) {
      return;
    }

    for (const device of devices) {
      await this.sendWithRetry(userId, device.fcmToken, notificationType);
    }
  }

  private async sendWithRetry(
    userId: string,
    fcmToken: string,
    notificationType: NotificationType,
  ): Promise<void> {
    const message = NOTIFICATION_MESSAGES[notificationType];
    let retryCount = 0;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
      try {
        await this.fcmService.sendPushNotification(fcmToken, {
          type: notificationType,
          ...message,
        });

        const log = this.notificationLogRepository.create({
          userId,
          notificationType,
          status: 'SUCCESS',
          retryCount,
        });
        await this.notificationLogRepository.save(log);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount++;

        const errorCode = (error as { code?: string })?.code;
        if (errorCode && PERMANENT_FAILURE_CODES.has(errorCode)) {
          this.logger.warn(
            `Permanent FCM failure (${errorCode}) for ${fcmToken.substring(0, 8)}... — removing token`,
          );
          await this.userDeviceRepository.deleteByFcmToken(fcmToken);
          break;
        }

        this.logger.warn(
          `FCM send failed for ${fcmToken.substring(0, 8)}..., attempt ${attempt + 1}/${MAX_RETRY}`,
        );
      }
    }

    const log = this.notificationLogRepository.create({
      userId,
      notificationType,
      status: 'FAIL',
      retryCount,
      errorMessage: lastError?.message ?? 'Unknown error',
    });
    await this.notificationLogRepository.save(log);
  }
}
