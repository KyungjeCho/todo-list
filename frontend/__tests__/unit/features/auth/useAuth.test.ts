import { renderHook, act } from '@testing-library/react-native';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn().mockReturnValue([
    { languageCode: 'es', languageTag: 'es-AR' },
  ]),
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
