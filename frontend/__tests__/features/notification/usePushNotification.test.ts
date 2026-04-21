import { renderHook, act } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { usePushNotification } from 'src/features/notification/usePushNotification';

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn().mockReturnValue({}),
  requestPermission: jest.fn().mockResolvedValue(1),
  getToken: jest.fn().mockResolvedValue('ios-token-initial'),
  onTokenRefresh: jest.fn().mockReturnValue(jest.fn()),
  onMessage: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('expo-device', () => ({
  modelName: 'iPhone 15',
  deviceName: 'Jane의 iPhone',
  osBuildId: 'TEST-BUILD',
}));

jest.mock('src/features/notification/deviceInstallId', () => ({
  getOrCreateInstallId: jest
    .fn()
    .mockResolvedValue('abcd1234-ef56-4789-8abc-def012345678'),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const messagingMock = require('@react-native-firebase/messaging') as {
  requestPermission: jest.Mock;
  getToken: jest.Mock;
  onTokenRefresh: jest.Mock;
  onMessage: jest.Mock;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const deviceMock = require('expo-device') as {
  modelName: string | null;
};

describe('usePushNotification — deviceName 전달', () => {
  const mockRegisterDevice = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    messagingMock.requestPermission.mockResolvedValue(1);
    messagingMock.getToken.mockResolvedValue('ios-token-initial');
    messagingMock.onTokenRefresh.mockImplementation(
      (_msg: unknown, _cb: unknown) => jest.fn(),
    );
    messagingMock.onMessage.mockImplementation(
      (_msg: unknown, _cb: unknown) => jest.fn(),
    );
    deviceMock.modelName = 'iPhone 15';
  });

  it('(a) modelName + per-install UUID 단축값을 결합해 deviceName 으로 등록한다', async () => {
    mockRegisterDevice.mockResolvedValue(undefined);

    renderHook(() =>
      usePushNotification({ onRegisterDevice: mockRegisterDevice }),
    );

    await act(async () => {});

    expect(mockRegisterDevice).toHaveBeenCalledWith({
      fcmToken: 'ios-token-initial',
      deviceType: 'IOS',
      deviceName: 'iPhone 15 (abcd1234)',
    });
  });

  it('(b) modelName 이 null 이면 UUID 단축값 단독을 deviceName 으로 사용한다', async () => {
    deviceMock.modelName = null;
    mockRegisterDevice.mockResolvedValue(undefined);

    renderHook(() =>
      usePushNotification({ onRegisterDevice: mockRegisterDevice }),
    );

    await act(async () => {});

    expect(mockRegisterDevice).toHaveBeenCalledTimes(1);
    const [payload] = mockRegisterDevice.mock.calls[0];
    expect(payload).toEqual({
      fcmToken: 'ios-token-initial',
      deviceType: 'IOS',
      deviceName: 'abcd1234',
    });
  });

  it('(c) onTokenRefresh 발화 시 새 토큰 + 동일 deviceName 으로 재등록한다', async () => {
    let tokenRefreshCallback: ((token: string) => Promise<void>) | undefined;
    messagingMock.onTokenRefresh.mockImplementation(
      (_msg: unknown, cb: (token: string) => Promise<void>) => {
        tokenRefreshCallback = cb;
        return jest.fn();
      },
    );
    mockRegisterDevice.mockResolvedValue(undefined);

    renderHook(() =>
      usePushNotification({ onRegisterDevice: mockRegisterDevice }),
    );

    await act(async () => {});

    expect(mockRegisterDevice).toHaveBeenCalledTimes(1);

    await act(async () => {
      await tokenRefreshCallback?.('ios-token-rotated');
    });

    expect(mockRegisterDevice).toHaveBeenCalledTimes(2);
    expect(mockRegisterDevice).toHaveBeenLastCalledWith({
      fcmToken: 'ios-token-rotated',
      deviceType: 'IOS',
      deviceName: 'iPhone 15 (abcd1234)',
    });
  });
});
