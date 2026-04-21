import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// WHY: 알림 탭 라우팅(notificationTapRouter)은 NavigationContainer 외부에서 호출되므로
// useNavigation 대신 전역 ref 를 사용해 Main 라우트 파라미터를 주입한다.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
