import { useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid, AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import {
  getMessaging,
  getToken,
  requestPermission,
  onTokenRefresh,
  onMessage,
} from '@react-native-firebase/messaging';
import * as Device from 'expo-device';
import type { DeviceType } from '../../types/user';
import { getOrCreateInstallId } from './deviceInstallId';

interface RegisterDeviceParams {
  fcmToken: string;
  deviceType: DeviceType;
  deviceName?: string;
}

interface UsePushNotificationOptions {
  onRegisterDevice: (params: RegisterDeviceParams) => Promise<void>;
  onUnregisterDevice?: (fcmToken: string) => Promise<void>;
  onTokenRegistered?: (token: string) => void;
  onError?: (error: Error) => void;
}

async function resolveDeviceName(): Promise<string | undefined> {
  // WHY(R-004): 다기기(iPhone+iPad, 또는 동일 모델 2 대) 공존 허용을 위해
  // 모델명 + per-install UUID 단축값을 결합해 스코핑 키를 고유화한다.
  // modelName 결측(시뮬레이터·초기화 직후) + SecureStore 실패 시 필드 생략 →
  // 백엔드는 기존 (userId, deviceType) 규칙으로 안전하게 fallback.
  const modelName =
    typeof Device.modelName === 'string' && Device.modelName.length > 0
      ? Device.modelName
      : undefined;
  let installShort: string | undefined;
  try {
    const installId = await getOrCreateInstallId();
    installShort = installId.slice(0, 8);
  } catch {
    installShort = undefined;
  }

  if (modelName && installShort) {
    return `${modelName} (${installShort})`;
  }
  return installShort ?? modelName;
}

export function usePushNotification(options: UsePushNotificationOptions) {
  const { onRegisterDevice, onTokenRegistered, onError } = options;
  const tokenRef = useRef<string | null>(null);

  const getDeviceType = useCallback((): DeviceType => {
    return Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
  }, []);

  const registerToken = useCallback(
    async (fcmToken: string) => {
      const deviceName = await resolveDeviceName();
      const payload: RegisterDeviceParams = {
        fcmToken,
        deviceType: getDeviceType(),
        ...(deviceName !== undefined ? { deviceName } : {}),
      };
      // WHY: 서버 등록 실패(네트워크/401/5xx) 시 훅이 "토큰 보유" 상태로 잠기면
      // AppState active 재시도 경로가 영구 스킵되고 Maestro 마커도 거짓 양성을
      // 띄운다. 반드시 서버 성공 이후에만 상태를 커밋하고 마커를 발화시킨다.
      await onRegisterDevice(payload);
      tokenRef.current = fcmToken;
      onTokenRegistered?.(fcmToken);
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

    // WHY(US2): 사용자가 초기 마운트 시점에 권한을 거부한 뒤 OS 설정에서 허용으로
    // 바꾸고 앱으로 돌아오는 흐름(background → active)을 1회 재평가한다.
    // 토큰을 이미 보유한 상태라면 재평가를 건너뛰어 중복 등록을 방지한다.
    const appStateSub = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState !== 'active') return;
        if (tokenRef.current !== null) return;
        void initialize();
      },
    );

    return () => {
      unsubscribeTokenRefresh?.();
      unsubscribeMessage?.();
      appStateSub.remove();
    };
  }, [registerToken, onError]);

  return {
    token: tokenRef.current,
  };
}
