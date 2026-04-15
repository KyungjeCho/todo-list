import { selectAuthRoute } from 'src/app/navigation/selectAuthRoute';
import type { UserProfile } from 'src/types/user';

const complete: UserProfile = {
  id: 'u1',
  userName: 'User',
  planTime: '08:00',
  reviewTime: '22:00',
  timezone: 'Asia/Seoul',
  language: 'ko',
  hasCompletedOnboarding: true,
};

const incomplete: UserProfile = { ...complete, hasCompletedOnboarding: false };

describe('selectAuthRoute — AuthNavigator 라우팅 결정', () => {
  it('미인증 → auth', () => {
    expect(
      selectAuthRoute({ isAuthenticated: false, isLoading: false, user: null }),
    ).toBe('auth');
  });

  it('인증 + 로딩 중 → loading (LoadingSplash 단독 렌더, FR-003 플리커 방지)', () => {
    expect(
      selectAuthRoute({ isAuthenticated: true, isLoading: true, user: null }),
    ).toBe('loading');
    expect(
      selectAuthRoute({
        isAuthenticated: true,
        isLoading: true,
        user: complete,
      }),
    ).toBe('loading');
  });

  it('로딩 종료 + 완료 플래그 true → main', () => {
    expect(
      selectAuthRoute({
        isAuthenticated: true,
        isLoading: false,
        user: complete,
      }),
    ).toBe('main');
  });

  it('로딩 종료 + 완료 플래그 false → onboarding', () => {
    expect(
      selectAuthRoute({
        isAuthenticated: true,
        isLoading: false,
        user: incomplete,
      }),
    ).toBe('onboarding');
  });

  it('알림 OFF (plan/reviewTime=null) 이어도 완료 플래그 true 면 main 유지 (Issue 3)', () => {
    expect(
      selectAuthRoute({
        isAuthenticated: true,
        isLoading: false,
        user: {
          ...complete,
          planTime: null,
          reviewTime: null,
        },
      }),
    ).toBe('main');
  });

  it('완료자 재로그인 시 어떤 상태에서도 onboarding 으로 빠지지 않음 (Issue 1 가드)', () => {
    expect(
      selectAuthRoute({
        isAuthenticated: true,
        isLoading: false,
        user: complete,
      }),
    ).not.toBe('onboarding');
  });

  it('user 가 아직 null 이지만 isLoading=false (엣지) → onboarding 안전 기본값', () => {
    expect(
      selectAuthRoute({ isAuthenticated: true, isLoading: false, user: null }),
    ).toBe('onboarding');
  });
});
