import type { UserProfile } from '../../types/user';

/**
 * 온보딩 완료 여부 판정.
 * WHY: 회원가입 시 timezone/language가 자동 저장되므로 온보딩에서는 plan/review 시간만 설정한다.
 */
export function isUserOnboarded(user: UserProfile | null | undefined): boolean {
  return user?.planTime != null && user?.reviewTime != null;
}
