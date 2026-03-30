import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface NotificationPayload {
  type: 'PLAN' | 'REVIEW';
  title: string;
  body: string;
}

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);

  constructor(private readonly configService: ConfigService) {
    if (admin.apps.length === 0) {
      const projectId = this.configService.get<string>('firebase.projectId');
      const privateKey = this.configService.get<string>('firebase.privateKey');
      const clientEmail = this.configService.get<string>(
        'firebase.clientEmail',
      );

      admin.initializeApp({
        credential:
          projectId && privateKey && clientEmail
            ? admin.credential.cert({
                projectId,
                privateKey: privateKey.replace(/\\n/g, '\n'),
                clientEmail,
              })
            : admin.credential.applicationDefault(),
      });
    }
  }

  async sendPushNotification(
    fcmToken: string,
    payload: NotificationPayload,
  ): Promise<void> {
    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        type: payload.type,
      },
    };

    await admin.messaging().send(message);
    this.logger.log(
      `Push notification sent to token: ${fcmToken.substring(0, 8)}...`,
    );
  }
}
