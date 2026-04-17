import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, typography, spacing } from '../../theme';
import { SoundPressable } from '../common/SoundPressable';
import { PlanNotificationIcon } from './PlanNotificationIcon';
import { BellIcon, SpeakerIcon } from './SettingsIcons';
import { soundService } from '../../features/sound/soundService';
import { useSoundStore } from '../../store/soundStore';

type TimePickerTarget = 'plan' | 'review' | null;

interface NotificationSettingsProps {
  planEnabled: boolean;
  planTime: string | null;
  defaultPlanTime: string;
  reviewTime: string | null;
  timePickerTarget: TimePickerTarget;
  onSetTimePickerTarget: (target: TimePickerTarget) => void;
  onTogglePlanNotification: (next: boolean) => void;
  onToggleReviewNotification: () => void;
  onTimeChange: (event: { type?: string }, selectedDate?: Date) => void;
}

/** WHY: SettingsScreen에서 알림 + 사운드 설정 섹션을 분리하여 가독성과 유지보수성을 높인다. */
export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  planEnabled,
  planTime,
  defaultPlanTime,
  reviewTime,
  timePickerTarget,
  onSetTimePickerTarget,
  onTogglePlanNotification,
  onToggleReviewNotification,
  onTimeChange,
}) => {
  const { t } = useTranslation();
  const buttonSoundEnabled = useSoundStore((s) => s.enabled);

  const getDateFromTimeStr = (timeStr: string | null): Date => {
    const date = new Date();
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
    }
    return date;
  };

  return (
    <>
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
              onPress={() => onSetTimePickerTarget('plan')}
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
                  ? (planTime ?? defaultPlanTime)
                  : t('common.disabled')}
              </Text>
            </SoundPressable>
          </View>
          <Switch
            testID="plan-notification-toggle"
            value={planEnabled}
            onValueChange={(next) => {
              soundService.play();
              onTogglePlanNotification(next);
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.iconContainer}>
            <BellIcon muted={reviewTime === null} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>
              {t('settings.reviewNotification')}
            </Text>
            <SoundPressable
              testID="review-time-button"
              onPress={() => onSetTimePickerTarget('review')}
              disabled={reviewTime === null}
            >
              <Text
                testID="review-time-value"
                style={[
                  styles.settingValue,
                  reviewTime === null && styles.settingValueDisabled,
                ]}
              >
                {reviewTime ?? t('common.disabled')}
              </Text>
            </SoundPressable>
          </View>
          <Switch
            testID="review-notification-toggle"
            value={reviewTime !== null}
            onValueChange={() => {
              soundService.play();
              onToggleReviewNotification();
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
              // WHY: 상태를 먼저 반영해야 OFF->ON 전환에서도 play()가 새 enabled 값을
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
            timePickerTarget === 'plan' ? planTime : reviewTime,
          )}
          onChange={onTimeChange}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
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
});
