import { userApi } from '../../services/api/userApi';
import type { UserProfile } from '../../types/user';

/**
 * 온보딩 완료 전용 엔드포인트 호출.
 *
 * WHY: `hasCompletedOnboarding` 전이를 알림 시간 저장과 분리(FR-001/FR-002).
 * 호출자는 반환된 프로필로 `useAuthStore.setUser` 를 즉시 갱신해야 한다.
 * 실패 시 예외를 그대로 전파하여 상위 UI 에서 재시도 가능한 에러 상태로 제시한다.
 */
export async function completeOnboardingApi(): Promise<UserProfile> {
  return userApi.completeOnboarding();
}
