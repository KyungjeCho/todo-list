import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import Svg, { Path, Circle, Line, Rect, Polyline } from 'react-native-svg';
import { colors, typography, spacing, radius } from '../../theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { UserProfile, UpdateSettingsRequest } from '../../types/user';

const DEFAULT_PLAN_TIME = '08:00';
const DEFAULT_REVIEW_TIME = '22:00';

const TIMEZONE_OPTIONS = [
  'Asia/Seoul',
  'Asia/Tokyo',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'UTC',
];

interface SettingsScreenProps {
  profile: UserProfile;
  onUpdateSettings: (data: UpdateSettingsRequest) => Promise<UserProfile>;
  onNavigateContact?: () => void;
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
  isLoading,
  error,
}) => {
  const [timePickerTarget, setTimePickerTarget] =
    useState<TimePickerTarget>(null);
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);

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

  const handleTogglePlanNotification = async () => {
    if (profile.planTime !== null) {
      await onUpdateSettings({ planTime: null });
    } else {
      await onUpdateSettings({ planTime: DEFAULT_PLAN_TIME });
    }
  };

  const handleToggleReviewNotification = async () => {
    if (profile.reviewTime !== null) {
      await onUpdateSettings({ reviewTime: null });
    } else {
      await onUpdateSettings({ reviewTime: DEFAULT_REVIEW_TIME });
    }
  };

  const handleTimezoneSelect = async (timezone: string) => {
    setShowTimezonePicker(false);
    await onUpdateSettings({ timezone });
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
      <Text style={styles.screenTitle}>설정</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>알림 설정</Text>

        <View style={styles.settingRow}>
          <View style={styles.iconContainer}>
            <BellIcon />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>계획 알림</Text>
            <TouchableOpacity
              testID="plan-time-button"
              onPress={() => setTimePickerTarget('plan')}
              disabled={profile.planTime === null}
            >
              <Text
                testID="plan-time-value"
                style={[
                  styles.settingValue,
                  profile.planTime === null && styles.settingValueDisabled,
                ]}
              >
                {profile.planTime ?? '해제됨'}
              </Text>
            </TouchableOpacity>
          </View>
          <Switch
            testID="plan-notification-toggle"
            value={profile.planTime !== null}
            onValueChange={handleTogglePlanNotification}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.iconContainer}>
            <BellIcon muted={profile.reviewTime === null} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>회고 알림</Text>
            <TouchableOpacity
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
                {profile.reviewTime ?? '해제됨'}
              </Text>
            </TouchableOpacity>
          </View>
          <Switch
            testID="review-notification-toggle"
            value={profile.reviewTime !== null}
            onValueChange={handleToggleReviewNotification}
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
        <Text style={styles.sectionTitle}>지역 설정</Text>

        <TouchableOpacity
          testID="timezone-button"
          style={styles.settingRow}
          onPress={() => setShowTimezonePicker(!showTimezonePicker)}
        >
          <View style={styles.iconContainer}>
            <GlobeIcon />
          </View>
          <Text style={[styles.settingLabel, styles.settingLabelFlex]}>
            타임존
          </Text>
          <Text testID="timezone-value" style={styles.settingValue}>
            {(profile.timezone ?? '').split('/').pop() ?? profile.timezone}
          </Text>
          <ChevronRightIcon />
        </TouchableOpacity>

        {showTimezonePicker && (
          <View testID="timezone-picker">
            {TIMEZONE_OPTIONS.map((tz) => (
              <TouchableOpacity
                key={tz}
                style={styles.timezoneOption}
                onPress={() => handleTimezoneSelect(tz)}
              >
                <Text
                  style={[
                    styles.timezoneText,
                    tz === profile.timezone && styles.timezoneSelected,
                  ]}
                >
                  {tz}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>정보</Text>

        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.iconContainer}>
            <DocumentIcon />
          </View>
          <Text style={[styles.settingLabel, styles.settingLabelFlex]}>
            오픈소스 라이센스
          </Text>
          <ChevronRightIcon />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.iconContainer}>
            <ShieldIcon />
          </View>
          <Text style={[styles.settingLabel, styles.settingLabelFlex]}>
            개인정보 처리방침
          </Text>
          <ChevronRightIcon />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.settingRow} onPress={onNavigateContact}>
        <View style={styles.iconContainer}>
          <MailIcon />
        </View>
        <Text style={[styles.settingLabel, styles.settingLabelFlex]}>
          연락처
        </Text>
        <ChevronRightIcon />
      </TouchableOpacity>

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
  versionText: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
});
