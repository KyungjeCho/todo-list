import { isUserOnboarded } from 'src/app/navigation/isUserOnboarded';
import type { UserProfile } from 'src/types/user';

describe('AuthNavigator — 온보딩 조건', () => {
  const base: UserProfile = {
    id: 'u1',
    userName: 'User',
    planTime: null,
    reviewTime: null,
    timezone: 'Asia/Seoul',
    language: 'ko',
  };

  it('planTime과 reviewTime이 모두 null이면 온보딩 필요(false)', () => {
    expect(isUserOnboarded(base)).toBe(false);
  });

  it('planTime만 설정되어 있으면 온보딩 필요(false)', () => {
    expect(isUserOnboarded({ ...base, planTime: '08:00' })).toBe(false);
  });

  it('reviewTime만 설정되어 있으면 온보딩 필요(false)', () => {
    expect(isUserOnboarded({ ...base, reviewTime: '22:00' })).toBe(false);
  });

  it('planTime과 reviewTime이 모두 설정되면 온보딩 완료(true)', () => {
    expect(
      isUserOnboarded({
        ...base,
        planTime: '08:00',
        reviewTime: '22:00',
      }),
    ).toBe(true);
  });

  it('user가 null/undefined면 온보딩 필요(false)', () => {
    expect(isUserOnboarded(null)).toBe(false);
    expect(isUserOnboarded(undefined)).toBe(false);
  });

  it('timezone이 null이어도 plan/review 시간이 있으면 온보딩 완료(true)', () => {
    // WHY: 온보딩 조건은 plan/review 시간 기반. timezone은 OAuth 가입 시 자동 설정됨
    expect(
      isUserOnboarded({
        ...base,
        timezone: null,
        planTime: '08:00',
        reviewTime: '22:00',
      }),
    ).toBe(true);
  });
});
