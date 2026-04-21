/* eslint-disable @typescript-eslint/no-require-imports */

// WHY: i18n을 테스트 환경에서 초기화해야 useTranslation() 훅이 번역된 텍스트를 반환한다.
import './src/i18n';

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn().mockReturnValue({}),
  requestPermission: jest.fn().mockResolvedValue(1),
  getToken: jest.fn().mockResolvedValue('mock-fcm-token'),
  onTokenRefresh: jest.fn().mockReturnValue(jest.fn()),
  onMessage: jest.fn().mockReturnValue(jest.fn()),
  getInitialNotification: jest.fn().mockResolvedValue(null),
  onNotificationOpenedApp: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('expo-device', () => ({
  modelName: 'iPhone 15',
  deviceName: 'Jest Device',
  osBuildId: 'JEST-BUILD',
}));

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn((key: string) =>
      Promise.resolve(store.get(key) ?? null),
    ),
    setItemAsync: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  const State = {
    UNDETERMINED: 0,
    FAILED: 1,
    BEGAN: 2,
    CANCELLED: 3,
    ACTIVE: 4,
    END: 5,
  };

  const LongPressGestureHandler = ({
    children,
    onHandlerStateChange,
  }: {
    children: React.ReactNode;
    onHandlerStateChange?: (event: { nativeEvent: { state: number } }) => void;
    minDurationMs?: number;
  }) =>
    React.createElement(
      View,
      {
        onLongPress: () =>
          onHandlerStateChange?.({ nativeEvent: { state: State.ACTIVE } }),
      },
      children,
    );

  const Swipeable = React.forwardRef(
    (
      {
        children,
        renderRightActions,
      }: {
        children: React.ReactNode;
        renderRightActions?: () => React.ReactNode;
        overshootRight?: boolean;
      },
      _ref: React.Ref<unknown>,
    ) =>
      React.createElement(View, null, children, renderRightActions?.()),
  );
  Swipeable.displayName = 'Swipeable';

  return {
    Swipeable,
    DrawerLayout: View,
    State,
    PanGestureHandler: View,
    TapGestureHandler: View,
    LongPressGestureHandler,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    RotationGestureHandler: View,
    PinchGestureHandler: View,
    GestureHandlerRootView: View,
    Directions: {},
  };
});
