import { Logger } from '@nestjs/common';
import { SendNotificationUsecase } from 'src/notification/application/send-notification.usecase';

/**
 * US1 (012-apple-fcm-integration) — iOS 경로 검증.
 * WHY: deviceType='IOS' 토큰도 Android 와 동일하게 FcmService 경유로 발송되고,
 *      성공 로그는 토큰 프리픽스(8자) 형태만 노출되어야 한다.
 */
describe('SendNotificationUsecase — iOS 경로', () => {
  let usecase: SendNotificationUsecase;

  const mockUserDeviceRepository = {
    findByUserId: jest.fn(),
    deleteByFcmToken: jest.fn(),
  };
  const mockNotificationLogRepository = {
    save: jest.fn(),
    create: jest.fn(),
  };
  const mockFcmService = {
    sendPushNotification: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationLogRepository.create.mockImplementation(
      (data: Record<string, unknown>) => data,
    );
    mockNotificationLogRepository.save.mockResolvedValue({});
    usecase = new SendNotificationUsecase(
      mockFcmService as never,
      mockUserDeviceRepository as never,
      mockNotificationLogRepository as never,
    );
  });

  it('iOS 단일 기기에 PLAN payload { type, title, body } 형태로 발송한다', async () => {
    mockUserDeviceRepository.findByUserId.mockResolvedValue([
      {
        id: 'dev-ios-1',
        fcmToken: 'ios-aaaabbbb-remainder',
        deviceType: 'IOS',
      },
    ]);
    mockFcmService.sendPushNotification.mockResolvedValue(undefined);

    await usecase.execute('user-1', 'PLAN');

    expect(mockFcmService.sendPushNotification).toHaveBeenCalledTimes(1);
    expect(mockFcmService.sendPushNotification).toHaveBeenCalledWith(
      'ios-aaaabbbb-remainder',
      expect.objectContaining({
        type: 'PLAN',
        title: expect.any(String),
        body: expect.any(String),
      }),
    );
  });

  it('성공 로그는 토큰 프리픽스(8자) 만 포함한다', async () => {
    mockUserDeviceRepository.findByUserId.mockResolvedValue([
      {
        id: 'dev-ios-1',
        fcmToken: 'ios-aaaabbbb-remainder',
        deviceType: 'IOS',
      },
    ]);
    mockFcmService.sendPushNotification.mockResolvedValue(undefined);

    // WHY: SendNotificationUsecase 가 토큰 자체를 로그로 출력하지 않는지만 확인.
    // FcmService 로그는 별도 단위 테스트에서 프리픽스 규칙을 이미 검증.
    const logSpy = jest.spyOn(Logger.prototype, 'log');
    const warnSpy = jest.spyOn(Logger.prototype, 'warn');

    await usecase.execute('user-1', 'PLAN');

    for (const spy of [logSpy, warnSpy]) {
      for (const call of spy.mock.calls) {
        const message = String(call[0] ?? '');
        expect(message).not.toContain('ios-aaaabbbb-remainder');
      }
    }
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
