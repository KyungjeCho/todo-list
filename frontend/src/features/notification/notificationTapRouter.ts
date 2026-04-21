import {
  getMessaging,
  getInitialNotification,
  onNotificationOpenedApp,
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';

type Mode = 'PLAN' | 'REVIEW';

export type NavigateToMode = (mode: Mode) => void;

function parseMode(
  message: FirebaseMessagingTypes.RemoteMessage | null | undefined,
): Mode | null {
  const raw = message?.data?.type;
  if (raw === 'PLAN' || raw === 'REVIEW') {
    return raw;
  }
  return null;
}

/**
 * 알림 탭(종료 상태: getInitialNotification / 백그라운드: onNotificationOpenedApp)을
 * 구독해 data.type 을 Plan/Review 모드로 해석한 뒤 주입된 navigate 콜백을 호출한다.
 * 미인식 타입은 no-op.
 *
 * @returns 구독 해제 함수
 */
export function subscribeNotificationTapRouter(
  navigate: NavigateToMode,
): () => void {
  const msg = getMessaging();

  // 종료 상태에서 탭으로 실행된 경우 — 최초 1회만 처리
  void getInitialNotification(msg).then((initial) => {
    const mode = parseMode(initial);
    if (mode) {
      navigate(mode);
    }
  });

  const unsubscribe = onNotificationOpenedApp(msg, (opened) => {
    const mode = parseMode(opened);
    if (mode) {
      navigate(mode);
    }
  });

  return unsubscribe;
}
