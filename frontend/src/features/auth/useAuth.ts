import { useCallback, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { authApi } from '../../services/api/authApi';
import { userApi } from '../../services/api/userApi';
import { useAuthStore } from '../../store/authStore';
import type { OAuthProvider } from '../../types/user';

export function useAuth() {
  const { setTokens, setUser, clearAuth, setLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (provider: OAuthProvider) => {
      setLoading(true);
      setError(null);

      try {
        const fcmToken = 'placeholder-fcm-token';
        const deviceType = 'IOS' as const;
        const redirectUri = Linking.createURL('auth/callback');
        const url = authApi.getOAuthUrl(provider, fcmToken, deviceType, redirectUri);
        const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);

        if (result.type === 'success') {
          const parsed = Linking.parse(result.url);
          const { accessToken, refreshToken, isNewUser } = parsed.queryParams as {
            accessToken: string;
            refreshToken: string;
            isNewUser: string;
          };
          await handleAuthCallback(accessToken, refreshToken, isNewUser === 'true');
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '인증에 실패했습니다';
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
              : '프로필 조회에 실패했습니다';
          setError(message);
        }
        return { isNewUser };
      } catch (err) {
        clearAuth();
        const message =
          err instanceof Error ? err.message : '인증에 실패했습니다';
        setError(message);
        return { isNewUser: false };
      } finally {
        setLoading(false);
      }
    },
    [setTokens, setUser, clearAuth, setLoading],
  );

  const logout = useCallback(
    async (refreshToken: string, fcmToken: string) => {
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
