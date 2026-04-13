import { useCallback, useState } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import i18n, { SUPPORTED_LANGUAGES } from '../../i18n';
import type { SupportedLanguage } from '../../i18n';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { getLocales, getCalendars } from 'expo-localization';
import {
  getMessaging,
  getToken,
  requestPermission,
} from '@react-native-firebase/messaging';
import { authApi } from '../../services/api/authApi';
import { userApi } from '../../services/api/userApi';
import { useAuthStore } from '../../store/authStore';
import type { OAuthProvider, DeviceType } from '../../types/user';

/** WHY: 디바이스 로케일 감지값이 지원 언어에 없으면 'en'으로 fallback */
function detectSignupLanguage(): SupportedLanguage {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code)
    ? (code as SupportedLanguage)
    : 'en';
}

/** WHY: 캘린더 정보의 IANA timezone을 우선, 없으면 undefined를 반환하여 서버가 null로 저장 */
function detectSignupTimezone(): string | undefined {
  return getCalendars()[0]?.timeZone ?? undefined;
}

/** WHY: FCM 토큰 획득 실패가 로그인을 막으면 안 됨. 알림은 부가 기능 */
async function getOptionalFcmToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return null;
      }
    }

    const msg = getMessaging();
    const authStatus = await requestPermission(msg);
    if (authStatus === 0) {
      return null;
    }

    return await getToken(msg);
  } catch {
    return null;
  }
}

export function useAuth() {
  const { setTokens, setUser, clearAuth, setLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (provider: OAuthProvider) => {
      setLoading(true);
      setError(null);

      try {
        const fcmToken = await getOptionalFcmToken();
        const deviceType: DeviceType =
          Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
        const redirectUri = Linking.createURL('auth/callback');
        const url = authApi.getOAuthUrl(
          provider,
          fcmToken,
          deviceType,
          redirectUri,
          undefined,
          detectSignupTimezone(),
          detectSignupLanguage(),
        );
        const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);

        if (result.type === 'success') {
          // WHY: 서버가 토큰을 fragment(#)로 전달하므로 URL hash에서 파싱
          const hashIndex = result.url.indexOf('#');
          const fragment =
            hashIndex >= 0 ? result.url.slice(hashIndex + 1) : '';
          const fragmentParams = new URLSearchParams(fragment);
          const accessToken = fragmentParams.get('accessToken') ?? '';
          const refreshToken = fragmentParams.get('refreshToken') ?? '';
          const isNewUser = fragmentParams.get('isNewUser') ?? 'false';
          await handleAuthCallback(
            accessToken,
            refreshToken,
            isNewUser === 'true',
          );
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : i18n.t('auth.authFailed');
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [setLoading],
  );

  const handleAuthCallback = useCallback(
    async (accessToken: string, refreshToken: string, isNewUser: boolean) => {
      setLoading(true);
      setError(null);

      try {
        await setTokens(accessToken, refreshToken);
        try {
          const profile = await userApi.getProfile();
          setUser(profile);
        } catch (profileErr) {
          // WHY: 프로필 조회 실패가 인증 상태를 무효화하면 안 됨.
          // 토큰은 유효하므로 인증 유지, 에러만 표시.
          const message =
            profileErr instanceof Error
              ? profileErr.message
              : i18n.t('auth.profileFetchFailed');
          setError(message);
        }
        return { isNewUser };
      } catch (err) {
        clearAuth();
        const message =
          err instanceof Error ? err.message : i18n.t('auth.authFailed');
        setError(message);
        return { isNewUser: false };
      } finally {
        setLoading(false);
      }
    },
    [setTokens, setUser, clearAuth, setLoading],
  );

  const logout = useCallback(
    async (refreshToken: string, fcmToken: string | null = null) => {
      setLoading(true);
      try {
        await authApi.logout(refreshToken, fcmToken);
      } catch {
        // Ignore logout errors
      } finally {
        clearAuth();
        setLoading(false);
      }
    },
    [clearAuth, setLoading],
  );

  return {
    login,
    handleAuthCallback,
    logout,
    error,
  };
}
