import type { UserProfile } from '../../types/user';
import { isUserOnboarded } from './isUserOnboarded';

export type AuthRoute = 'auth' | 'loading' | 'main' | 'onboarding';

interface AuthRouteInput {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
}

/**
 * AuthNavigator 의 라우팅 결정을 순수 함수로 분리.
 *
 * WHY: 이전 구현은 `isLoading || isOnboarded` 임시방편 플래그를 섞어서
 * 로딩 중 Main → 이후 Onboarding → 다시 Main 으로 되튀는 플리커(Issue 1)와
 * 알림 OFF 후 재온보딩 유도(Issue 3/5) 를 유발했다. 이 함수는 상태 → 라우트
 * 결정을 단일 책임으로 가지며, 테스트·리뷰가 쉽다(FR-003, FR-007).
 */
export function selectAuthRoute(input: AuthRouteInput): AuthRoute {
  if (!input.isAuthenticated) {
    return 'auth';
  }

  if (input.isLoading) {
    return 'loading';
  }

  return isUserOnboarded(input.user) ? 'main' : 'onboarding';
}
