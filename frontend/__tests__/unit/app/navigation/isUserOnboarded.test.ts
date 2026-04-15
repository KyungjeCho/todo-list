import { isUserOnboarded } from 'src/app/navigation/isUserOnboarded';
import type { UserProfile } from 'src/types/user';

describe('isUserOnboarded — hasCompletedOnboarding 기반', () => {
  const base: UserProfile = {
    id: 'u1',
    userName: 'User',
    planTime: '08:00',
    reviewTime: '22:00',
    timezone: 'Asia/Seoul',
    language: 'ko',
    hasCompletedOnboarding: false,
  };

  it('hasCompletedOnboarding === true 인 경우만 true', () => {
    expect(isUserOnboarded({ ...base, hasCompletedOnboarding: true })).toBe(
      true,
    );
  });

  it('hasCompletedOnboarding === false 이면 plan/review 시간이 있어도 false', () => {
    expect(isUserOnboarded({ ...base, hasCompletedOnboarding: false })).toBe(
      false,
    );
  });

  it('null/undefined 사용자는 false', () => {
    expect(isUserOnboarded(null)).toBe(false);
    expect(isUserOnboarded(undefined)).toBe(false);
  });

  it('알림 OFF (planTime=null, reviewTime=null) 여도 완료 플래그 true 이면 true', () => {
    expect(
      isUserOnboarded({
        ...base,
        planTime: null,
        reviewTime: null,
        hasCompletedOnboarding: true,
      }),
    ).toBe(true);
  });
});
