import type { UserProfile } from '../../types/user';

/**
 * 온보딩 완료 여부 판정.
 * WHY: `hasCompletedOnboarding` 1급 도메인 속성만을 신뢰(FR-002). plan/reviewTime
 * 기반 추론은 알림 OFF 후 재온보딩 유도 같은 Issue 3/5 의 원인이었으므로 사용하지 않는다.
 */
export function isUserOnboarded(user: UserProfile | null | undefined): boolean {
  return user?.hasCompletedOnboarding === true;
}
