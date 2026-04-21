import { renderHook, act } from '@testing-library/react-native';

jest.mock('expo-localization', () => ({
  getLocales: jest
    .fn()
    .mockReturnValue([{ languageCode: 'es', languageTag: 'es-AR' }]),
  getCalendars: jest
    .fn()
    .mockReturnValue([{ timeZone: 'America/Buenos_Aires' }]),
}));

jest.mock('src/services/api/authApi', () => ({
  authApi: {
    getOAuthUrl: jest.fn(
      (
        provider: string,
        fcmToken: string | null,
        deviceType: string,
        redirectUri: string,
        deviceName?: string,
        timezone?: string,
        language?: string,
      ) => {
        const params = new URLSearchParams({ deviceType, redirectUri });
        if (fcmToken) params.set('fcmToken', fcmToken);
        if (deviceName) params.set('deviceName', deviceName);
        if (timezone) params.set('timezone', timezone);
        if (language) params.set('language', language);
        return `https://api.example.com/auth/oauth/${provider}?${params.toString()}`;
      },
    ),
  },
}));

jest.mock('src/services/api/userApi', () => ({
  userApi: {
    getProfile: jest.fn().mockResolvedValue({
      id: 'u1',
      userName: 'User',
      planTime: null,
      reviewTime: null,
      timezone: null,
      language: 'en',
    }),
  },
}));

jest.mock('src/store/authStore', () => ({
  useAuthStore: () => ({
    setTokens: jest.fn(),
    setUser: jest.fn(),
    clearAuth: jest.fn(),
    setLoading: jest.fn(),
  }),
}));

import * as WebBrowser from 'expo-web-browser';
import { authApi } from 'src/services/api/authApi';
import { useAuth } from 'src/features/auth/useAuth';

describe('useAuth — OAuth URL에 timezone/language 전달', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'cancel',
    });
  });

  it('login 호출 시 디바이스에서 감지한 timezone/language가 OAuth URL에 포함된다', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('google');
    });

    expect(authApi.getOAuthUrl).toHaveBeenCalled();
    const callArgs = (authApi.getOAuthUrl as jest.Mock).mock.calls[0];
    // 6번째 인자 = timezone, 7번째 = language
    expect(callArgs[5]).toBe('America/Buenos_Aires');
    expect(callArgs[6]).toBe('es');
  });

  it('생성된 OAuth URL에 timezone/language 쿼리 파라미터가 존재한다', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('google');
    });

    const url = (authApi.getOAuthUrl as jest.Mock).mock.results[0]
      .value as string;
    expect(url).toContain('timezone=America%2FBuenos_Aires');
    expect(url).toContain('language=es');
  });
});

// T037 [US3] — Apple 로그인 에러/취소 메시지 매핑
describe('useAuth — Apple 로그인 실패 복구', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('사용자가 Apple 시트에서 취소하면 i18n 키 "auth.appleCancelled"가 error에 설정된다', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'cancel',
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('apple');
    });

    // WHY(FR-013, T037): 취소 플로우에서 사용자에게 로그인 화면 에러 배너로 표시되도록
    // `auth.appleCancelled` 번역 키를 error 상태로 매핑한다.
    expect(result.current.error).toBe('auth.appleCancelled');
  });

  it('WebBrowser 결과 type="dismiss"도 취소로 간주되어 "auth.appleCancelled" 로 매핑', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'dismiss',
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('apple');
    });

    expect(result.current.error).toBe('auth.appleCancelled');
  });

  it('WebBrowser가 예외를 던지면 "auth.appleLoginFailed"로 매핑', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockRejectedValue(
      new Error('Network request failed'),
    );

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('apple');
    });

    expect(result.current.error).toBe('auth.appleLoginFailed');
  });

  // WHY(P1): 서버가 Apple 취소 흐름을 fragment #error=user_cancelled_authorize로
  // 복귀시키면 WebBrowser 결과 type='success'이면서 URL 안에 error 파라미터가 존재한다.
  // 토큰 교환을 시도하지 말고 i18n 키로 매핑해 로그인 화면 배너를 띄워야 한다.
  it('서버가 #error=user_cancelled_authorize로 복귀하면 "auth.appleCancelled"로 매핑', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      url: 'todolist://auth/callback#error=user_cancelled_authorize',
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('apple');
    });

    expect(result.current.error).toBe('auth.appleCancelled');
  });

  // WHY(P2): Apple 서버 장애(server_error / temporarily_unavailable)는 일시적
  // 문제라는 점을 사용자가 인지해 재시도 가치를 판단할 수 있도록 전용 i18n 키로 분리.
  it('서버가 #error=server_error로 복귀하면 "auth.appleServerError"로 매핑', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      url: 'todolist://auth/callback#error=server_error',
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('apple');
    });

    expect(result.current.error).toBe('auth.appleServerError');
  });

  it('서버가 #error=temporarily_unavailable로 복귀하면 "auth.appleServerError"로 매핑', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      url: 'todolist://auth/callback#error=temporarily_unavailable',
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('apple');
    });

    expect(result.current.error).toBe('auth.appleServerError');
  });

  it('서버가 #error=기타로 복귀하면 "auth.appleLoginFailed"로 매핑', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      url: 'todolist://auth/callback#error=invalid_request',
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('apple');
    });

    expect(result.current.error).toBe('auth.appleLoginFailed');
  });

  it('Apple이 아닌 provider에서는 기존 에러 메시지 경로 유지', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockRejectedValue(
      new Error('network-fail'),
    );

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('google');
    });

    // Google은 Apple 전용 키가 아닌 err.message 또는 auth.authFailed로 폴백
    expect(result.current.error).not.toBe('auth.appleLoginFailed');
    expect(result.current.error).not.toBe('auth.appleCancelled');
  });
});
