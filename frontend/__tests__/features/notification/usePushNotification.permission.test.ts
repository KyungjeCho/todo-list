import { renderHook, act } from '@testing-library/react-native';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { usePushNotification } from 'src/features/notification/usePushNotification';

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn().mockReturnValue({}),
  requestPermission: jest.fn().mockResolvedValue(1),
  getToken: jest.fn().mockResolvedValue('ios-token-v1'),
  onTokenRefresh: jest.fn().mockReturnValue(jest.fn()),
  onMessage: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('expo-device', () => ({
  modelName: 'iPhone 15',
  deviceName: 'Jane의 iPhone',
  osBuildId: 'TEST-BUILD',
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const messagingMock = require('@react-native-firebase/messaging') as {
  requestPermission: jest.Mock;
  getToken: jest.Mock;
  onTokenRefresh: jest.Mock;
  onMessage: jest.Mock;
};

describe('usePushNotification — 권한 거부 경로 및 AppState 재평가', () => {
  const mockRegisterDevice = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    messagingMock.requestPermission.mockResolvedValue(1);
    messagingMock.getToken.mockResolvedValue('ios-token-v1');
    messagingMock.onTokenRefresh.mockImplementation(
      (_msg: unknown, _cb: unknown) => jest.fn(),
    );
    messagingMock.onMessage.mockImplementation(
      (_msg: unknown, _cb: unknown) => jest.fn(),
    );
  });

  it('권한 거부 시 onRegisterDevice 도 onError 도 호출되지 않고 훅은 크래시 없이 반환된다', async () => {
    messagingMock.requestPermission.mockResolvedValueOnce(0); // DENIED

    const { result } = renderHook(() =>
      usePushNotification({
        onRegisterDevice: mockRegisterDevice,
        onError: mockOnError,
      }),
    );

    await act(async () => {});

    expect(messagingMock.getToken).not.toHaveBeenCalled();
    expect(mockRegisterDevice).not.toHaveBeenCalled();
    expect(mockOnError).not.toHaveBeenCalled();
    expect(result.current).toEqual(
      expect.objectContaining({ token: null }),
    );
  });

  it('AppState 가 background → active 로 바뀔 때 권한이 허용 상태로 전환되면 1회만 추가 등록한다', async () => {
    // 최초 초기화 시점에는 권한 거부 → 등록 미호출
    messagingMock.requestPermission
      .mockResolvedValueOnce(0) // 초기 마운트: 거부
      .mockResolvedValueOnce(1) // active 전환: 허용
      .mockResolvedValueOnce(1); // 추가 active 전환: 토큰 보유 상태이므로 재평가 skip

    const listeners: Array<(state: AppStateStatus) => void> = [];
    const addListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((type, cb) => {
        if (type === 'change') {
          listeners.push(cb as (state: AppStateStatus) => void);
        }
        return {
          remove: jest.fn(),
        } as unknown as ReturnType<typeof AppState.addEventListener>;
      });

    mockRegisterDevice.mockResolvedValue(undefined);

    renderHook(() =>
      usePushNotification({ onRegisterDevice: mockRegisterDevice }),
    );

    await act(async () => {});
    expect(mockRegisterDevice).not.toHaveBeenCalled();

    // active 전환 1회 — 권한이 허용되어 토큰 획득 + 등록 1회 발생해야 함
    await act(async () => {
      listeners.forEach((cb) => cb('active'));
    });
    await act(async () => {});

    expect(mockRegisterDevice).toHaveBeenCalledTimes(1);
    const registered = messagingMock.getToken.mock.calls.length;

    // active 전환이 한 번 더 발생해도 (토큰 이미 보유) 추가 등록은 없어야 한다.
    await act(async () => {
      listeners.forEach((cb) => cb('active'));
    });
    await act(async () => {});

    expect(mockRegisterDevice).toHaveBeenCalledTimes(1);
    expect(messagingMock.getToken.mock.calls.length).toBe(registered);

    addListenerSpy.mockRestore();
  });
});
