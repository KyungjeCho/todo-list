import { SendNotificationUsecase } from 'src/notification/application/send-notification.usecase';

/**
 * US3 (012-apple-fcm-integration) — 다기기 발송 + APNs 만료 회귀(FR-005).
 * WHY: 한 사용자에 활성 iOS 기기가 여러 대(다른 deviceName)일 때 모두 수신해야 하고,
 *      특정 토큰이 영구 실패여도 다른 토큰은 계속 발송되며, 해당 토큰만 삭제돼야 한다.
 */
describe('SendNotificationUsecase — 다기기(iOS) 발송 & APNs 만료 처리', () => {
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

  it('(a) 한 userId 의 활성 iOS 기기 2대(서로 다른 deviceName)에 각각 발송된다', async () => {
    mockUserDeviceRepository.findByUserId.mockResolvedValue([
      {
        id: 'dev-iphone',
        fcmToken: 'ios-iphone-token',
        deviceType: 'IOS',
        deviceName: 'iPhone 15',
      },
      {
        id: 'dev-ipad',
        fcmToken: 'ios-ipad-token',
        deviceType: 'IOS',
        deviceName: 'iPad Pro',
      },
    ]);
    mockFcmService.sendPushNotification.mockResolvedValue(undefined);

    await usecase.execute('user-1', 'PLAN');

    expect(mockFcmService.sendPushNotification).toHaveBeenCalledTimes(2);
    expect(mockFcmService.sendPushNotification).toHaveBeenCalledWith(
      'ios-iphone-token',
      expect.objectContaining({ type: 'PLAN' }),
    );
    expect(mockFcmService.sendPushNotification).toHaveBeenCalledWith(
      'ios-ipad-token',
      expect.objectContaining({ type: 'PLAN' }),
    );
    expect(mockUserDeviceRepository.deleteByFcmToken).not.toHaveBeenCalled();
  });

  it('(b) iOS 토큰이 registration-token-not-registered 로 실패하면 해당 토큰만 삭제되고 다른 유효 토큰은 영향 없이 수신한다', async () => {
    mockUserDeviceRepository.findByUserId.mockResolvedValue([
      {
        id: 'dev-iphone',
        fcmToken: 'ios-stale-token',
        deviceType: 'IOS',
        deviceName: 'iPhone 15',
      },
      {
        id: 'dev-ipad',
        fcmToken: 'ios-valid-token',
        deviceType: 'IOS',
        deviceName: 'iPad Pro',
      },
    ]);

    const apnsStaleError = Object.assign(new Error('APNs expired'), {
      code: 'messaging/registration-token-not-registered',
    });

    mockFcmService.sendPushNotification.mockImplementation((token: string) => {
      if (token === 'ios-stale-token') {
        return Promise.reject(apnsStaleError);
      }
      return Promise.resolve(undefined);
    });

    await usecase.execute('user-1', 'PLAN');

    expect(mockUserDeviceRepository.deleteByFcmToken).toHaveBeenCalledTimes(1);
    expect(mockUserDeviceRepository.deleteByFcmToken).toHaveBeenCalledWith(
      'ios-stale-token',
    );

    // 유효 토큰 측 성공 로그 1건 기록되어야 한다.
    const successCalls = mockNotificationLogRepository.create.mock.calls.filter(
      (call) => (call[0] as { status?: string })?.status === 'SUCCESS',
    );
    expect(successCalls.length).toBe(1);
  });

  it('(c) 동일 사용자의 모든 iOS 토큰이 영구 실패이면 NotificationLog 는 FAIL 만 기록된다', async () => {
    mockUserDeviceRepository.findByUserId.mockResolvedValue([
      {
        id: 'dev-iphone',
        fcmToken: 'ios-dead-1',
        deviceType: 'IOS',
        deviceName: 'iPhone 15',
      },
      {
        id: 'dev-ipad',
        fcmToken: 'ios-dead-2',
        deviceType: 'IOS',
        deviceName: 'iPad Pro',
      },
    ]);
    const invalidError = Object.assign(new Error('Invalid token'), {
      code: 'messaging/invalid-registration-token',
    });
    mockFcmService.sendPushNotification.mockRejectedValue(invalidError);

    await usecase.execute('user-1', 'PLAN');

    const statuses = mockNotificationLogRepository.create.mock.calls.map(
      (call) => (call[0] as { status?: string })?.status,
    );
    expect(statuses.filter((s) => s === 'SUCCESS')).toHaveLength(0);
    expect(statuses.filter((s) => s === 'FAIL').length).toBeGreaterThanOrEqual(
      1,
    );
    expect(mockUserDeviceRepository.deleteByFcmToken).toHaveBeenCalledTimes(2);
  });
});
