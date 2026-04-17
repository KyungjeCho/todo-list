import React, { useState, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMessaging, getToken } from '@react-native-firebase/messaging';
import {
  useAuthStore,
  selectUser,
  selectSetUser,
  selectRefreshToken,
  selectClearAuth,
} from '../../store/authStore';
import { userApi } from '../../services/api/userApi';
import { authApi } from '../../services/api/authApi';
import { SettingsScreen } from '../../screens/settings/SettingsScreen';
import i18n from '../../i18n';
import { colors } from '../../theme';
import type { UpdateSettingsRequest } from '../../types/user';

/** WHY: 로그아웃 시 서버의 FCM 등록 해제를 위해 현재 토큰을 시도 조회. 실패해도 로그아웃은 진행 */
async function getCurrentFcmToken(): Promise<string | null> {
  try {
    return await getToken(getMessaging());
  } catch {
    return null;
  }
}

export const SettingsWrapper: React.FC = () => {
  const user = useAuthStore(selectUser);
  const setUser = useAuthStore(selectSetUser);
  const refreshToken = useAuthStore(selectRefreshToken);
  const clearAuth = useAuthStore(selectClearAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleUpdateSettings = useCallback(
    async (data: UpdateSettingsRequest) => {
      setIsLoading(true);
      setError(undefined);
      try {
        const updated = await userApi.updateSettings(data);
        setUser(updated);
        return updated;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : i18n.t('settings.settingsChangeFailed');
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setUser],
  );

  const handleLogout = useCallback(async () => {
    const token = refreshToken;
    const fcmToken = await getCurrentFcmToken();
    try {
      if (token) {
        await authApi.logout(token, fcmToken);
      }
    } catch {
      // WHY: 서버 로그아웃 실패해도 로컬 세션은 반드시 정리하여 LoginScreen으로 복귀
    } finally {
      clearAuth();
    }
  }, [refreshToken, clearAuth]);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <SettingsScreen
        profile={user}
        onUpdateSettings={handleUpdateSettings}
        onLogout={handleLogout}
        isLoading={isLoading}
        error={error}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfaceDim,
  },
});
