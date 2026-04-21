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

  // WHY(FR-001/T025): Apple 로그인은 프론트 관점에서 Google/Naver/Kakao와 동일한
  // WebBrowser.openAuthSessionAsync 경로를 사용한다. Apple이 요구하는
  // `response_mode=form_post`와 POST 콜백 처리(서버 → fragment redirect)는
  // 서버의 `GET /auth/oauth/apple` 및 `POST /auth/oauth/apple/callback`에서 처리하므로
  // 클라이언트 분기는 불필요하다. 오류/취소 분기만 T041에서 보강.
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
          // WHY(P1): Apple 취소/에러 흐름에서 서버가 `#error=...` 으로 복귀시킨다.
          // 토큰이 아닌 error 파라미터가 들어있으면 i18n 키로 매핑해 로그인 화면에
          // 메시지를 표시하고 WebBrowser 세션을 종료한다.
          const providerError = fragmentParams.get('error');
          if (providerError) {
            if (provider === 'apple') {
              setError(
                providerError === 'user_cancelled_authorize'
                  ? 'auth.appleCancelled'
                  : 'auth.appleLoginFailed',
              );
            } else {
              setError(i18n.t('auth.authFailed'));
            }
            return;
          }
          const accessToken = fragmentParams.get('accessToken') ?? '';
          const refreshToken = fragmentParams.get('refreshToken') ?? '';
          const isNewUser = fragmentParams.get('isNewUser') ?? 'false';
          await handleAuthCallback(
            accessToken,
            refreshToken,
            isNewUser === 'true',
          );
        } else if (provider === 'apple') {
          // WHY(FR-013, T041): Apple 시트에서 사용자가 취소하거나
          // dismiss된 경우에 전용 i18n 키를 에러 상태로 설정해
          // 로그인 화면에서 안내 메시지를 표시하고 버튼을 재활성화한다.
          // WHY(lint): result.type은 WebBrowserResultType enum이므로
          // 문자열 리터럴 비교는 no-unsafe-enum-comparison에 걸린다.
          if (
            result.type === WebBrowser.WebBrowserResultType.CANCEL ||
            result.type === WebBrowser.WebBrowserResultType.DISMISS
          ) {
            setError('auth.appleCancelled');
          } else {
            setError('auth.appleLoginFailed');
          }
        }
      } catch (err) {
        // WHY(FR-013, T041): Apple의 네트워크/서버 오류는 원본 Error 메시지 대신
        // 다국어 리소스 키로 치환하여 LoginScreen에서 번역 후 표시되도록 한다.
        if (provider === 'apple') {
          setError('auth.appleLoginFailed');
        } else {
          const message =
            err instanceof Error ? err.message : i18n.t('auth.authFailed');
          setError(message);
        }
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
