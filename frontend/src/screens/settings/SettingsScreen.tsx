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
  isLoading?: boolean;
  error?: string;
}

type TimePickerTarget = 'plan' | 'review' | null;

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  profile,
  onUpdateSettings,
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
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>알림 설정</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>계획 알림</Text>
            <TouchableOpacity
              testID="plan-time-button"
              onPress={() => setTimePickerTarget('plan')}
              disabled={profile.planTime === null}
            >
              <Text testID="plan-time-value" style={styles.settingValue}>
                {profile.planTime ?? '해제됨'}
              </Text>
            </TouchableOpacity>
          </View>
          <Switch
            testID="plan-notification-toggle"
            value={profile.planTime !== null}
            onValueChange={handleTogglePlanNotification}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>회고 알림</Text>
            <TouchableOpacity
              testID="review-time-button"
              onPress={() => setTimePickerTarget('review')}
              disabled={profile.reviewTime === null}
            >
              <Text testID="review-time-value" style={styles.settingValue}>
                {profile.reviewTime ?? '해제됨'}
              </Text>
            </TouchableOpacity>
          </View>
          <Switch
            testID="review-notification-toggle"
            value={profile.reviewTime !== null}
            onValueChange={handleToggleReviewNotification}
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
          <Text style={styles.settingLabel}>타임존</Text>
          <Text testID="timezone-value" style={styles.settingValue}>
            {profile.timezone}
          </Text>
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 16, color: '#333' },
  settingValue: { fontSize: 14, color: '#666', marginTop: 4 },
  errorContainer: {
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: { color: '#c62828' },
  confirmButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: '#2196F3',
    borderRadius: 4,
    marginTop: 8,
  },
  confirmText: { color: '#fff', fontWeight: 'bold' },
  timezoneOption: { paddingVertical: 10, paddingHorizontal: 16 },
  timezoneText: { fontSize: 14 },
  timezoneSelected: { fontWeight: 'bold', color: '#2196F3' },
});
