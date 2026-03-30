import { SendNotificationUsecase } from 'src/notification/application/send-notification.usecase';

describe('SendNotificationUsecase', () => {
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
    usecase = new SendNotificationUsecase(
      mockFcmService as never,
      mockUserDeviceRepository as never,
      mockNotificationLogRepository as never,
    );
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    const userId = 'user-uuid-1';

    describe('FCM 호출', () => {
      it('사용자의 모든 디바이스에 FCM 알림을 발송한다', async () => {
        const devices = [
          { id: 'device-1', fcmToken: 'token-1', deviceType: 'IOS' },
          { id: 'device-2', fcmToken: 'token-2', deviceType: 'ANDROID' },
        ];
        mockUserDeviceRepository.findByUserId.mockResolvedValue(devices);
        mockFcmService.sendPushNotification.mockResolvedValue(undefined);
        mockNotificationLogRepository.create.mockImplementation(
          (data: Record<string, unknown>) => data,
        );
        mockNotificationLogRepository.save.mockResolvedValue({});

        await usecase.execute(userId, 'PLAN');

        expect(mockUserDeviceRepository.findByUserId).toHaveBeenCalledWith(
          userId,
        );
        expect(mockFcmService.sendPushNotification).toHaveBeenCalledTimes(2);
        expect(mockFcmService.sendPushNotification).toHaveBeenCalledWith(
          'token-1',
          expect.objectContaining({ type: 'PLAN' }),
        );
        expect(mockFcmService.sendPushNotification).toHaveBeenCalledWith(
          'token-2',
          expect.objectContaining({ type: 'PLAN' }),
        );
      });

      it('REVIEW 타입 알림을 발송한다', async () => {
        const devices = [
          { id: 'device-1', fcmToken: 'token-1', deviceType: 'IOS' },
        ];
        mockUserDeviceRepository.findByUserId.mockResolvedValue(devices);
        mockFcmService.sendPushNotification.mockResolvedValue(undefined);
        mockNotificationLogRepository.create.mockImplementation(
          (data: Record<string, unknown>) => data,
        );
        mockNotificationLogRepository.save.mockResolvedValue({});

        await usecase.execute(userId, 'REVIEW');

        expect(mockFcmService.sendPushNotification).toHaveBeenCalledWith(
          'token-1',
          expect.objectContaining({ type: 'REVIEW' }),
        );
      });

      it('디바이스가 없는 사용자는 알림을 발송하지 않는다', async () => {
        mockUserDeviceRepository.findByUserId.mockResolvedValue([]);

        await usecase.execute(userId, 'PLAN');

        expect(mockFcmService.sendPushNotification).not.toHaveBeenCalled();
      });
    });

    describe('로그 기록', () => {
      it('성공 시 SUCCESS 로그를 기록한다', async () => {
        const devices = [
          { id: 'device-1', fcmToken: 'token-1', deviceType: 'IOS' },
        ];
        mockUserDeviceRepository.findByUserId.mockResolvedValue(devices);
        mockFcmService.sendPushNotification.mockResolvedValue(undefined);
        mockNotificationLogRepository.create.mockImplementation(
          (data: Record<string, unknown>) => data,
        );
        mockNotificationLogRepository.save.mockResolvedValue({});

        await usecase.execute(userId, 'PLAN');

        expect(mockNotificationLogRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
            notificationType: 'PLAN',
            status: 'SUCCESS',
          }),
        );
      });

      it('실패 시 FAIL 로그와 에러 메시지를 기록한다', async () => {
        const devices = [
          { id: 'device-1', fcmToken: 'token-1', deviceType: 'IOS' },
        ];
        mockUserDeviceRepository.findByUserId.mockResolvedValue(devices);
        mockFcmService.sendPushNotification.mockRejectedValue(
          new Error('FCM token expired'),
        );
        mockNotificationLogRepository.create.mockImplementation(
          (data: Record<string, unknown>) => data,
        );
        mockNotificationLogRepository.save.mockResolvedValue({});

        await usecase.execute(userId, 'PLAN');

        expect(mockNotificationLogRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
            notificationType: 'PLAN',
            status: 'FAIL',
            errorMessage: expect.stringContaining('FCM token expired'),
          }),
        );
      });
    });

    describe('실패 재시도', () => {
      it('FCM 발송 실패 시 최대 재시도 횟수까지 재시도한다', async () => {
        const devices = [
          { id: 'device-1', fcmToken: 'token-1', deviceType: 'IOS' },
        ];
        mockUserDeviceRepository.findByUserId.mockResolvedValue(devices);
        // 첫 2회 실패, 3회째 성공
        mockFcmService.sendPushNotification
          .mockRejectedValueOnce(new Error('Temporary error'))
          .mockRejectedValueOnce(new Error('Temporary error'))
          .mockResolvedValueOnce(undefined);
        mockNotificationLogRepository.create.mockImplementation(
          (data: Record<string, unknown>) => data,
        );
        mockNotificationLogRepository.save.mockResolvedValue({});

        await usecase.execute(userId, 'PLAN');

        expect(mockFcmService.sendPushNotification).toHaveBeenCalledTimes(3);
        expect(mockNotificationLogRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'SUCCESS',
            retryCount: 2,
          }),
        );
      });

      it('영구 실패(registration-token-not-registered) 시 재시도 없이 토큰을 삭제한다', async () => {
        const devices = [
          { id: 'device-1', fcmToken: 'token-1', deviceType: 'IOS' },
        ];
        mockUserDeviceRepository.findByUserId.mockResolvedValue(devices);
        const permanentError = Object.assign(
          new Error('Token not registered'),
          { code: 'messaging/registration-token-not-registered' },
        );
        mockFcmService.sendPushNotification.mockRejectedValueOnce(
          permanentError,
        );
        mockNotificationLogRepository.create.mockImplementation(
          (data: Record<string, unknown>) => data,
        );
        mockNotificationLogRepository.save.mockResolvedValue({});
        mockUserDeviceRepository.deleteByFcmToken.mockResolvedValue(undefined);

        await usecase.execute(userId, 'PLAN');

        expect(mockFcmService.sendPushNotification).toHaveBeenCalledTimes(1);
        expect(mockUserDeviceRepository.deleteByFcmToken).toHaveBeenCalledWith(
          'token-1',
        );
        expect(mockNotificationLogRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'FAIL' }),
        );
      });

      it('영구 실패(invalid-registration-token) 시에도 토큰을 삭제한다', async () => {
        const devices = [
          { id: 'device-1', fcmToken: 'token-1', deviceType: 'ANDROID' },
        ];
        mockUserDeviceRepository.findByUserId.mockResolvedValue(devices);
        const permanentError = Object.assign(new Error('Invalid token'), {
          code: 'messaging/invalid-registration-token',
        });
        mockFcmService.sendPushNotification.mockRejectedValueOnce(
          permanentError,
        );
        mockNotificationLogRepository.create.mockImplementation(
          (data: Record<string, unknown>) => data,
        );
        mockNotificationLogRepository.save.mockResolvedValue({});
        mockUserDeviceRepository.deleteByFcmToken.mockResolvedValue(undefined);

        await usecase.execute(userId, 'PLAN');

        expect(mockFcmService.sendPushNotification).toHaveBeenCalledTimes(1);
        expect(mockUserDeviceRepository.deleteByFcmToken).toHaveBeenCalledWith(
          'token-1',
        );
      });

      it('모든 재시도가 실패하면 최종 FAIL 로그를 기록한다', async () => {
        const devices = [
          { id: 'device-1', fcmToken: 'token-1', deviceType: 'IOS' },
        ];
        mockUserDeviceRepository.findByUserId.mockResolvedValue(devices);
        mockFcmService.sendPushNotification.mockRejectedValue(
          new Error('Persistent error'),
        );
        mockNotificationLogRepository.create.mockImplementation(
          (data: Record<string, unknown>) => data,
        );
        mockNotificationLogRepository.save.mockResolvedValue({});

        await usecase.execute(userId, 'PLAN');

        expect(mockNotificationLogRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'FAIL',
            retryCount: expect.any(Number),
            errorMessage: expect.stringContaining('Persistent error'),
          }),
        );
      });
    });
  });
});
