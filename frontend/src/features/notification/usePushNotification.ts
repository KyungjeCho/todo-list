import { useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import {
  getMessaging,
  getToken,
  requestPermission,
  onTokenRefresh,
  onMessage,
} from '@react-native-firebase/messaging';
import type { DeviceType } from '../../types/user';

interface RegisterDeviceParams {
  fcmToken: string;
  deviceType: DeviceType;
}

interface UsePushNotificationOptions {
  onRegisterDevice: (params: RegisterDeviceParams) => Promise<void>;
  onUnregisterDevice?: (fcmToken: string) => Promise<void>;
  onTokenRegistered?: (token: string) => void;
  onError?: (error: Error) => void;
}

export function usePushNotification(options: UsePushNotificationOptions) {
  const { onRegisterDevice, onTokenRegistered, onError } = options;
  const tokenRef = useRef<string | null>(null);

  const getDeviceType = useCallback((): DeviceType => {
    return Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
  }, []);

  const registerToken = useCallback(
    async (fcmToken: string) => {
      tokenRef.current = fcmToken;
      onTokenRegistered?.(fcmToken);
      await onRegisterDevice({
        fcmToken,
        deviceType: getDeviceType(),
      });
    },
    [onRegisterDevice, onTokenRegistered, getDeviceType],
  );

  useEffect(() => {
    let unsubscribeTokenRefresh: (() => void) | undefined;
    let unsubscribeMessage: (() => void) | undefined;

    const initialize = async () => {
      try {
        // WHY: Android 13+(API 33)은 POST_NOTIFICATIONS 런타임 권한 필요
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            return;
          }
        }

        const msg = getMessaging();
        const authStatus = await requestPermission(msg);

        if (authStatus === 0) {
          return;
        }

        const token = await getToken(msg);
        await registerToken(token);

        unsubscribeTokenRefresh = onTokenRefresh(
          msg,
          async (newToken: string) => {
            await registerToken(newToken);
          },
        );

        unsubscribeMessage = onMessage(msg, async () => {
          // WHY: foreground 알림 수신 시 추후 인앱 알림 표시에 사용
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
      }
    };

    initialize();

    return () => {
      unsubscribeTokenRefresh?.();
      unsubscribeMessage?.();
    };
  }, [registerToken, onError]);

  return {
    token: tokenRef.current,
  };
}
