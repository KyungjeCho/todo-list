import { FcmService } from 'src/notification/infrastructure/fcm.service';

jest.mock('firebase-admin', () => {
  const mockSend = jest.fn();
  return {
    apps: [],
    initializeApp: jest.fn(),
    credential: {
      applicationDefault: jest.fn(),
      cert: jest.fn(),
    },
    messaging: jest.fn(() => ({
      send: mockSend,
    })),
    __mockSend: mockSend,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const firebaseAdmin = require('firebase-admin');
const mockSend = firebaseAdmin.__mockSend as jest.Mock;

const mockConfigService = {
  get: jest.fn().mockReturnValue(undefined),
};

describe('FcmService', () => {
  let service: FcmService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FcmService(mockConfigService as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendPushNotification', () => {
    it('firebase-admin SDK의 messaging().send()를 호출한다', async () => {
      mockSend.mockResolvedValue('projects/test/messages/123');

      await service.sendPushNotification('fcm-token-abc', {
        type: 'PLAN',
        title: '계획 시간입니다',
        body: '오늘의 할 일을 계획해보세요',
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'fcm-token-abc',
        }),
      );
    });

    it('PLAN 타입 알림 메시지를 올바르게 구성한다', async () => {
      mockSend.mockResolvedValue('projects/test/messages/123');

      await service.sendPushNotification('fcm-token-abc', {
        type: 'PLAN',
        title: '계획 시간입니다',
        body: '오늘의 할 일을 계획해보세요',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: expect.any(String),
            body: expect.any(String),
          }),
        }),
      );
    });

    it('REVIEW 타입 알림 메시지를 올바르게 구성한다', async () => {
      mockSend.mockResolvedValue('projects/test/messages/456');

      await service.sendPushNotification('fcm-token-xyz', {
        type: 'REVIEW',
        title: '회고 시간입니다',
        body: '오늘 하루를 돌아보세요',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'fcm-token-xyz',
        }),
      );
    });

    it('FCM 발송 실패 시 에러를 throw한다', async () => {
      mockSend.mockRejectedValue(
        new Error('messaging/registration-token-not-registered'),
      );

      await expect(
        service.sendPushNotification('invalid-token', {
          type: 'PLAN',
          title: '테스트',
          body: '테스트',
        }),
      ).rejects.toThrow('messaging/registration-token-not-registered');
    });

    it('data 페이로드에 notification type을 포함한다', async () => {
      mockSend.mockResolvedValue('projects/test/messages/789');

      await service.sendPushNotification('fcm-token-abc', {
        type: 'PLAN',
        title: '계획 시간입니다',
        body: '오늘의 할 일을 계획해보세요',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'PLAN',
          }),
        }),
      );
    });
  });
});
