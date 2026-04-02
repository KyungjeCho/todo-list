import { renderHook, act } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { usePushNotification } from 'src/features/notification/usePushNotification';

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn().mockReturnValue({}),
  requestPermission: jest.fn().mockResolvedValue(1),
  getToken: jest.fn().mockResolvedValue('mock-fcm-token-abc123'),
  onTokenRefresh: jest.fn().mockReturnValue(jest.fn()),
  onMessage: jest.fn().mockReturnValue(jest.fn()),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const messagingMock = require('@react-native-firebase/messaging') as {
  requestPermission: jest.Mock;
  getToken: jest.Mock;
  onTokenRefresh: jest.Mock;
  onMessage: jest.Mock;
};
const mockRequestPermissions = messagingMock.requestPermission;
const mockGetToken = messagingMock.getToken;
const mockOnTokenRefresh = messagingMock.onTokenRefresh;
const mockOnMessage = messagingMock.onMessage;
const mockRemoveTokenRefreshListener = jest.fn();
const mockRemoveMessageListener = jest.fn();

const mockRegisterDevice = jest.fn();
const mockUnregisterDevice = jest.fn();

jest.mock('src/services/api/client', () => ({
  apiClient: {
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('usePushNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestPermissions.mockResolvedValue(1); // AUTHORIZED
    mockGetToken.mockResolvedValue('mock-fcm-token-abc123');
    mockOnTokenRefresh.mockImplementation(
      (_msg: unknown, _cb: unknown) => mockRemoveTokenRefreshListener,
    );
    mockOnMessage.mockImplementation(
      (_msg: unknown, _cb: unknown) => mockRemoveMessageListener,
    );
  });

  describe('FCM 토큰 등록', () => {
    it('마운트 시 FCM 토큰을 요청하고 등록 콜백을 호출한다', async () => {
      const onTokenRegistered = jest.fn();

      renderHook(() =>
        usePushNotification({
          onTokenRegistered,
          onRegisterDevice: mockRegisterDevice,
          onUnregisterDevice: mockUnregisterDevice,
        }),
      );

      await act(async () => {
        // 비동기 초기화 완료 대기
      });

      expect(mockGetToken).toHaveBeenCalled();
      expect(onTokenRegistered).toHaveBeenCalledWith('mock-fcm-token-abc123');
    });

    it('토큰 등록 시 서버에 디바이스를 등록한다', async () => {
      mockRegisterDevice.mockResolvedValue(undefined);

      renderHook(() =>
        usePushNotification({
          onRegisterDevice: mockRegisterDevice,
          onUnregisterDevice: mockUnregisterDevice,
        }),
      );

      await act(async () => {});

      expect(mockRegisterDevice).toHaveBeenCalledWith(
        expect.objectContaining({
          fcmToken: 'mock-fcm-token-abc123',
          deviceType: expect.stringMatching(/^(IOS|ANDROID)$/),
        }),
      );
    });

    it('토큰이 갱신되면 새 토큰으로 재등록한다', async () => {
      let tokenRefreshCallback: ((token: string) => void) | undefined;
      mockOnTokenRefresh.mockImplementation(
        (_msg: unknown, cb: (token: string) => void) => {
          tokenRefreshCallback = cb;
          return mockRemoveTokenRefreshListener;
        },
      );
      mockRegisterDevice.mockResolvedValue(undefined);

      renderHook(() =>
        usePushNotification({
          onRegisterDevice: mockRegisterDevice,
          onUnregisterDevice: mockUnregisterDevice,
        }),
      );

      await act(async () => {});

      // 토큰 갱신 시뮬레이션
      await act(async () => {
        tokenRefreshCallback?.('new-fcm-token-xyz789');
      });

      expect(mockRegisterDevice).toHaveBeenCalledWith(
        expect.objectContaining({
          fcmToken: 'new-fcm-token-xyz789',
        }),
      );
    });
  });

  describe('알림 권한 요청', () => {
    it('iOS에서 알림 권한을 요청한다', async () => {
      Platform.OS = 'ios';

      renderHook(() =>
        usePushNotification({
          onRegisterDevice: mockRegisterDevice,
          onUnregisterDevice: mockUnregisterDevice,
        }),
      );

      await act(async () => {});

      expect(mockRequestPermissions).toHaveBeenCalled();
    });

    it('Android에서도 알림 권한을 요청한다', async () => {
      Platform.OS = 'android';

      renderHook(() =>
        usePushNotification({
          onRegisterDevice: mockRegisterDevice,
          onUnregisterDevice: mockUnregisterDevice,
        }),
      );

      await act(async () => {});

      expect(mockRequestPermissions).toHaveBeenCalled();
    });

    it('권한이 거부되면 토큰을 요청하지 않는다', async () => {
      mockRequestPermissions.mockResolvedValue(0); // DENIED

      renderHook(() =>
        usePushNotification({
          onRegisterDevice: mockRegisterDevice,
          onUnregisterDevice: mockUnregisterDevice,
        }),
      );

      await act(async () => {});

      expect(mockGetToken).not.toHaveBeenCalled();
    });

    it('권한 요청 실패 시 에러를 처리한다', async () => {
      mockRequestPermissions.mockRejectedValue(
        new Error('Permission request failed'),
      );

      const onError = jest.fn();

      renderHook(() =>
        usePushNotification({
          onRegisterDevice: mockRegisterDevice,
          onUnregisterDevice: mockUnregisterDevice,
          onError,
        }),
      );

      await act(async () => {});

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Permission request failed'),
        }),
      );
    });
  });

  describe('언마운트 시 정리', () => {
    it('언마운트 시 토큰 갱신 리스너를 제거한다', async () => {
      const { unmount } = renderHook(() =>
        usePushNotification({
          onRegisterDevice: mockRegisterDevice,
          onUnregisterDevice: mockUnregisterDevice,
        }),
      );

      await act(async () => {});

      unmount();

      expect(mockRemoveTokenRefreshListener).toHaveBeenCalled();
    });

    it('언마운트 시 메시지 리스너를 제거한다', async () => {
      const { unmount } = renderHook(() =>
        usePushNotification({
          onRegisterDevice: mockRegisterDevice,
          onUnregisterDevice: mockUnregisterDevice,
        }),
      );

      await act(async () => {});

      unmount();

      expect(mockRemoveMessageListener).toHaveBeenCalled();
    });
  });
});
