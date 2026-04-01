import React, { useState, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { userApi } from '../../services/api/userApi';
import { SettingsScreen } from '../../screens/settings/SettingsScreen';
import type { UpdateSettingsRequest } from '../../types/user';

export const SettingsWrapper: React.FC = () => {
  const { user, setUser } = useAuthStore();
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
          err instanceof Error ? err.message : '설정 변경에 실패했습니다';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setUser],
  );

  if (!user) return null;

  return (
    <SettingsScreen
      profile={user}
      onUpdateSettings={handleUpdateSettings}
      isLoading={isLoading}
      error={error}
    />
  );
};
