import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import i18n from '../../i18n';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  type SupportedLanguage,
} from '../../i18n';
import Svg, { Path, Circle, Line, Rect, Polyline } from 'react-native-svg';
import { colors, typography, spacing, radius } from '../../theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { UserProfile, UpdateSettingsRequest } from '../../types/user';
import type { RootStackParamList } from '../../app/navigation/types';
import { SoundPressable } from '../../components/common/SoundPressable';
import { PlanNotificationIcon } from '../../components/settings/PlanNotificationIcon';
import { useSoundStore } from '../../store/soundStore';
import { soundService } from '../../features/sound/soundService';
import { togglePlanNotification } from '../../features/notification/planNotificationToggle';

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

function BellIcon({ muted }: { muted?: boolean }) {
  if (muted) {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M13.73 21a2 2 0 01-3.46 0"
          stroke={colors.disabled}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M18.63 13A17.89 17.89 0 0118 8"
          stroke={colors.disabled}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14"
          stroke={colors.disabled}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M18 8a6 6 0 00-9.33-5"
          stroke={colors.disabled}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Line
          x1={1}
          y1={1}
          x2={23}
          y2={23}
          stroke={colors.disabled}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21a2 2 0 01-3.46 0"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function GlobeIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={12}
        r={10}
        stroke={colors.onSurface}
        strokeWidth={1.5}
      />
      <Path
        d="M2 12h20"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DocumentIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="14 2 14 8 20 8"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShieldIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MailIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect
        x={2}
        y={4}
        width={20}
        height={16}
        rx={2}
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="22 7 12 13 2 7"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SpeakerIcon({ muted }: { muted?: boolean }) {
  const stroke = muted ? colors.disabled : colors.onSurface;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 5L6 9H2v6h4l5 4V5z"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {muted ? (
        <>
          <Line
            x1={23}
            y1={9}
            x2={17}
            y2={15}
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <Line
            x1={17}
            y1={9}
            x2={23}
            y2={15}
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </>
      ) : (
        <Path
          d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

function LanguageIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 8l6 6"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 14l6-6 2-3"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2 5h12"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M7 2v3"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M22 22l-5-10-5 10"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 18h6"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ChevronRightIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={colors.disabled}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

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
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [optimisticLanguage, setOptimisticLanguage] =
    useState<SupportedLanguage | null>(null);
  // WHY(FR-005, SC-003): 계획알림 토글은 저장 API 완료 전에도 즉시 아이콘/스위치가 반응해야
  // 하므로 optimistic override를 유지한다. props(profile.planTime)와 값이 일치하면 override를 해제한다.
  const [planOptimistic, setPlanOptimistic] = useState<boolean | null>(null);
  const buttonSoundEnabled = useSoundStore((s) => s.enabled);

  // WHY: profile.language가 외부에서 갱신되면 낙관적 오버라이드를 해제하여 props와 동기화
  useEffect(() => {
    setOptimisticLanguage(null);
  }, [profile.language]);

  // WHY: props(profile.language)가 source of truth, 사용자 선택 직후에만 낙관적 값으로 오버라이드
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
    // WHY(FR-007): 저장 실패 시 이전 상태로 즉시 롤백되어야 한다.
    try {
      await togglePlanNotification({
        next,
        defaultPlanTime: DEFAULT_PLAN_TIME,
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
      await onUpdateSettings({ reviewTime: DEFAULT_REVIEW_TIME });
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
    setShowLanguagePicker(false);
    setOptimisticLanguage(language);
    await i18n.changeLanguage(language);
    try {
      await onUpdateSettings({ language });
    } catch {
      Alert.alert(t('common.error'), t('settings.languageSaveFailed'));
    }
  };

  const getDateFromTimeStr = (timeStr: string | null): Date => {
    const date = new Date();
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
    }
    return date;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator testID="settings-loading" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} testID="settings-screen">
      <Text style={styles.screenTitle}>{t('settings.title')}</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('settings.notificationSettings')}
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.iconContainer}>
            <PlanNotificationIcon enabled={planEnabled} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>
              {t('settings.planNotification')}
            </Text>
            <SoundPressable
              testID="plan-time-button"
              onPress={() => setTimePickerTarget('plan')}
              disabled={!planEnabled}
            >
              <Text
                testID="plan-time-value"
                style={[
                  styles.settingValue,
                  !planEnabled && styles.settingValueDisabled,
                ]}
              >
                {planEnabled
                  ? (profile.planTime ?? DEFAULT_PLAN_TIME)
                  : t('common.disabled')}
              </Text>
            </SoundPressable>
          </View>
          <Switch
            testID="plan-notification-toggle"
            value={planEnabled}
            onValueChange={(next) => {
              soundService.play();
              void handleTogglePlanNotification(next);
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.iconContainer}>
            <BellIcon muted={profile.reviewTime === null} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>
              {t('settings.reviewNotification')}
            </Text>
            <SoundPressable
              testID="review-time-button"
              onPress={() => setTimePickerTarget('review')}
              disabled={profile.reviewTime === null}
            >
              <Text
                testID="review-time-value"
                style={[
                  styles.settingValue,
                  profile.reviewTime === null && styles.settingValueDisabled,
                ]}
              >
                {profile.reviewTime ?? t('common.disabled')}
              </Text>
            </SoundPressable>
          </View>
          <Switch
            testID="review-notification-toggle"
            value={profile.reviewTime !== null}
            onValueChange={() => {
              soundService.play();
              void handleToggleReviewNotification();
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.soundFeedback')}</Text>

        <View style={styles.settingRow}>
          <View style={styles.iconContainer}>
            <SpeakerIcon muted={!buttonSoundEnabled} />
          </View>
          <Text style={[styles.settingLabel, styles.settingLabelFlex]}>
            {t('settings.buttonClickSound')}
          </Text>
          <Switch
            testID="button-sound-toggle"
            value={buttonSoundEnabled}
            onValueChange={(next) => {
              // WHY: 상태를 먼저 반영해야 OFF→ON 전환에서도 play()가 새 enabled 값을
              //      읽어 사용자가 기대하는 즉각적인 클릭음 피드백을 들을 수 있다.
              void useSoundStore.getState().setEnabled(next);
              soundService.play();
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>
      </View>

      {timePickerTarget && (
        <DateTimePicker
          testID="time-picker"
          mode="time"
          display="spinner"
          value={getDateFromTimeStr(
            timePickerTarget === 'plan' ? profile.planTime : profile.reviewTime,
          )}
          onChange={handleTimeChange}
        />
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.regionSettings')}</Text>

        <SoundPressable
          testID="timezone-button"
          style={styles.settingRow}
          onPress={handleTimezonePress}
        >
          <View style={styles.iconContainer}>
            <GlobeIcon />
          </View>
          <Text style={[styles.settingLabel, styles.settingLabelFlex]}>
            {t('settings.timezone')}
          </Text>
          <Text testID="timezone-value" style={styles.settingValue}>
            {(profile.timezone ?? '').split('/').pop() ?? profile.timezone}
          </Text>
          <ChevronRightIcon />
        </SoundPressable>

        <SoundPressable
          testID="language-button"
          style={styles.settingRow}
          onPress={() => setShowLanguagePicker(!showLanguagePicker)}
        >
          <View style={styles.iconContainer}>
            <LanguageIcon />
          </View>
          <Text style={[styles.settingLabel, styles.settingLabelFlex]}>
            {t('settings.language')}
          </Text>
          <Text testID="language-value" style={styles.settingValue}>
            {LANGUAGE_LABELS[displayLanguage]}
          </Text>
          <ChevronRightIcon />
        </SoundPressable>

        {showLanguagePicker && (
          <View testID="language-picker">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <SoundPressable
                key={lang}
                style={styles.timezoneOption}
                onPress={() => handleLanguageSelect(lang)}
              >
                <Text
                  style={[
                    styles.timezoneText,
                    lang === displayLanguage && styles.timezoneSelected,
                  ]}
                >
                  {LANGUAGE_LABELS[lang]}
                </Text>
              </SoundPressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.info')}</Text>

        <SoundPressable style={styles.settingRow}>
          <View style={styles.iconContainer}>
            <DocumentIcon />
          </View>
          <Text style={[styles.settingLabel, styles.settingLabelFlex]}>
            {t('settings.openSourceLicense')}
          </Text>
          <ChevronRightIcon />
        </SoundPressable>

        <SoundPressable style={styles.settingRow}>
          <View style={styles.iconContainer}>
            <ShieldIcon />
          </View>
          <Text style={[styles.settingLabel, styles.settingLabelFlex]}>
            {t('settings.privacyPolicy')}
          </Text>
          <ChevronRightIcon />
        </SoundPressable>
      </View>

      <SoundPressable style={styles.settingRow} onPress={onNavigateContact}>
        <View style={styles.iconContainer}>
          <MailIcon />
        </View>
        <Text style={[styles.settingLabel, styles.settingLabelFlex]}>
          {t('settings.contact')}
        </Text>
        <ChevronRightIcon />
      </SoundPressable>

      {onLogout && (
        <SoundPressable
          testID="logout-button"
          style={styles.logoutButton}
          onPress={handleLogoutPress}
        >
          <Text style={styles.logoutText}>{t('settings.logout')}</Text>
        </SoundPressable>
      )}

      <Text style={styles.versionText}>TodoList v1.0.0</Text>
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
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    ...typography.overline,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  iconContainer: {
    marginRight: spacing.md,
  },
  settingInfo: { flex: 1 },
  settingLabel: {
    ...typography.body,
    color: colors.onSurface,
  },
  settingLabelFlex: { flex: 1 },
  settingValue: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 2,
  },
  settingValueDisabled: {
    color: colors.disabled,
  },
  errorContainer: {
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  errorText: { color: colors.error },
  timezoneOption: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
  },
  timezoneText: { ...typography.body, color: colors.onSurface },
  timezoneSelected: { fontWeight: '700', color: colors.primary },
  logoutButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  versionText: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
});
