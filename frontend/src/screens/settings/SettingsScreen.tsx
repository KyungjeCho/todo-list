import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import i18n from '../../i18n';
import type { SupportedLanguage } from '../../i18n';
import { colors, typography, spacing } from '../../theme';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { UserProfile, UpdateSettingsRequest } from '../../types/user';
import type { RootStackParamList } from '../../app/navigation/types';
import { togglePlanNotification } from '../../features/notification/planNotificationToggle';
import { NotificationSettings } from '../../components/settings/NotificationSettings';
import { LanguagePicker } from '../../components/settings/LanguagePicker';
import { AccountSettings } from '../../components/settings/AccountSettings';

const DEFAULT_PLAN_TIME = '08:00';
const DEFAULT_REVIEW_TIME = '22:00';

interface SettingsScreenProps {
  profile: UserProfile;
  onUpdateSettings: (data: UpdateSettingsRequest) => Promise<UserProfile>;
  onNavigateContact?: () => void;
  onLogout?: () => void | Promise<void>;
  isLoading?: boolean;
  error?: string;
}

type TimePickerTarget = 'plan' | 'review' | null;

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  profile,
  onUpdateSettings,
  onNavigateContact,
  onLogout,
  isLoading,
  error,
}) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [timePickerTarget, setTimePickerTarget] =
    useState<TimePickerTarget>(null);
  const [optimisticLanguage, setOptimisticLanguage] =
    useState<SupportedLanguage | null>(null);
  // WHY(FR-005, SC-003): 계획알림 토글은 저장 API 완료 전에도 즉시 아이콘/스위치가 반응해야
  // 하므로 optimistic override를 유지한다. props(profile.planTime)와 값이 일치하면 override를 해제한다.
  const [planOptimistic, setPlanOptimistic] = useState<boolean | null>(null);
  // WHY(fix-bug-01 ②): OFF 시 서버는 null로 저장되어 이전 시간이 유실되므로, 세션 동안
  // 마지막 활성 시간을 ref에 보존해 ON 재전환 시 동일 시간으로 복원한다.
  const lastPlanTimeRef = useRef<string | null>(profile.planTime);
  const lastReviewTimeRef = useRef<string | null>(profile.reviewTime);

  useEffect(() => {
    if (profile.planTime !== null) {
      lastPlanTimeRef.current = profile.planTime;
    }
  }, [profile.planTime]);

  useEffect(() => {
    if (profile.reviewTime !== null) {
      lastReviewTimeRef.current = profile.reviewTime;
    }
  }, [profile.reviewTime]);

  // WHY: profile.language가 외부에서 갱신되면 낙관적 오버라이드를 해제하여 props와 동기화
  useEffect(() => {
    setOptimisticLanguage(null);
  }, [profile.language]);

  const displayLanguage = optimisticLanguage ?? profile.language;
  const profilePlanEnabled = profile.planTime !== null;
  const planEnabled = planOptimistic ?? profilePlanEnabled;

  // WHY(FR-006): 저장 성공 후 authStore 갱신으로 profile이 optimistic 값과 일치하면 override 해제.
  useEffect(() => {
    if (planOptimistic !== null && planOptimistic === profilePlanEnabled) {
      setPlanOptimistic(null);
    }
  }, [profilePlanEnabled, planOptimistic]);

  const handleTimeChange = async (
    event: { type?: string },
    selectedDate?: Date,
  ) => {
    const target = timePickerTarget;
    setTimePickerTarget(null);
    if (event.type === 'dismissed' || !selectedDate || !target) return;
    const hours = String(selectedDate.getHours()).padStart(2, '0');
    const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    if (target === 'plan') {
      await onUpdateSettings({ planTime: timeStr });
    } else {
      await onUpdateSettings({ reviewTime: timeStr });
    }
  };

  const handleTogglePlanNotification = async (next: boolean) => {
    try {
      await togglePlanNotification({
        next,
        defaultPlanTime: lastPlanTimeRef.current ?? DEFAULT_PLAN_TIME,
        updateSettings: (data) => onUpdateSettings(data),
        onOptimistic: setPlanOptimistic,
        onRollback: setPlanOptimistic,
        onError: () => {
          Alert.alert(t('common.error'), t('settings.settingsChangeFailed'));
        },
      });
    } catch {
      // WHY: 에러는 togglePlanNotification 내부 onError/onRollback에서 이미 처리됨
    }
  };

  const handleToggleReviewNotification = async () => {
    if (profile.reviewTime !== null) {
      await onUpdateSettings({ reviewTime: null });
    } else {
      await onUpdateSettings({
        reviewTime: lastReviewTimeRef.current ?? DEFAULT_REVIEW_TIME,
      });
    }
  };

  const handleTimezonePress = () => {
    navigation.navigate('TimezoneSelect', {
      current: profile.timezone ?? 'UTC',
    });
  };

  const handleLogoutPress = () => {
    if (!onLogout) return;
    Alert.alert(
      t('settings.logoutConfirmTitle'),
      t('settings.logoutConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout'),
          style: 'destructive',
          onPress: () => {
            void onLogout();
          },
        },
      ],
    );
  };

  const handleLanguageSelect = async (language: SupportedLanguage) => {
    setOptimisticLanguage(language);
    await i18n.changeLanguage(language);
    try {
      await onUpdateSettings({ language });
    } catch {
      Alert.alert(t('common.error'), t('settings.languageSaveFailed'));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner testID="settings-loading" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} testID="settings-screen">
      <Text style={styles.screenTitle}>{t('settings.title')}</Text>

      <ErrorBanner error={error} />

      <NotificationSettings
        planEnabled={planEnabled}
        planTime={profile.planTime}
        defaultPlanTime={DEFAULT_PLAN_TIME}
        reviewTime={profile.reviewTime}
        timePickerTarget={timePickerTarget}
        onSetTimePickerTarget={setTimePickerTarget}
        onTogglePlanNotification={(next) => {
          void handleTogglePlanNotification(next);
        }}
        onToggleReviewNotification={() => {
          void handleToggleReviewNotification();
        }}
        onTimeChange={handleTimeChange}
      />

      <LanguagePicker
        timezone={profile.timezone}
        displayLanguage={displayLanguage}
        onTimezonePress={handleTimezonePress}
        onLanguageSelect={(lang) => {
          void handleLanguageSelect(lang);
        }}
      />

      <AccountSettings
        onNavigateContact={onNavigateContact}
        onLogout={onLogout}
        handleLogoutPress={handleLogoutPress}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.surfaceDim,
  },
  screenTitle: {
    ...typography.h1,
    color: colors.onSurface,
    marginBottom: spacing.xl,
  },
});
