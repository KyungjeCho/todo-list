import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { SoundPressable } from '../../components/common/SoundPressable';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { colors, gradients, typography, spacing, radius } from '../../theme';

interface OnboardingSettings {
  planTime: string;
  reviewTime: string;
}

interface OnboardingScreenProps {
  onComplete?: (settings: OnboardingSettings) => void;
  isLoading?: boolean;
  error?: string;
}

function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function ClockIcon() {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={12}
        r={10}
        stroke={colors.primary}
        strokeWidth={1.5}
      />
      <Polyline
        points="12 6 12 12 16 14"
        stroke={colors.primary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SunIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} stroke={colors.warning} strokeWidth={1.5} />
      <Path
        d="M12 2v2"
        stroke={colors.warning}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M12 20v2"
        stroke={colors.warning}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M4.93 4.93l1.41 1.41"
        stroke={colors.warning}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M17.66 17.66l1.41 1.41"
        stroke={colors.warning}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M2 12h2"
        stroke={colors.warning}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M20 12h2"
        stroke={colors.warning}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M6.34 17.66l-1.41 1.41"
        stroke={colors.warning}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M19.07 4.93l-1.41 1.41"
        stroke={colors.warning}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function MoonIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
        stroke={colors.primary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
  isLoading = false,
  error,
}) => {
  const { t } = useTranslation();
  const [planTime, setPlanTime] = useState('08:00');
  const [reviewTime, setReviewTime] = useState('22:00');
  const [showPicker, setShowPicker] = useState<'plan' | 'review' | null>(null);

  const handleTimeChange = useCallback(
    (target: 'plan' | 'review') =>
      (_event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
          setShowPicker(null);
        }
        if (selectedDate) {
          const formatted = formatTime(selectedDate);
          if (target === 'plan') {
            setPlanTime(formatted);
          } else {
            setReviewTime(formatted);
          }
        }
      },
    [],
  );

  const handleComplete = useCallback(() => {
    onComplete?.({ planTime, reviewTime });
  }, [onComplete, planTime, reviewTime]);

  return (
    <LinearGradient
      colors={
        gradients.brandHero.colors as unknown as readonly [
          string,
          string,
          ...string[],
        ]
      }
      locations={
        gradients.brandHero.locations as unknown as readonly [
          number,
          number,
          ...number[],
        ]
      }
      start={gradients.brandHero.start}
      end={gradients.brandHero.end}
      style={styles.container}
    >
      <View style={styles.brandSection}>
        <ClockIcon />
        <Text style={styles.title}>{t('onboarding.routineSetup')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.routineSubtitle')}</Text>
      </View>

      {isLoading && (
        <ActivityIndicator testID="onboarding-loading-indicator" size="large" />
      )}

      {error && (
        <Text testID="onboarding-error-message" style={styles.error}>
          {error}
        </Text>
      )}

      <View style={styles.timeSections}>
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <SunIcon />
            <Text style={styles.label}>{t('onboarding.planTime')}</Text>
          </View>
          <SoundPressable
            testID="plan-time-picker"
            style={styles.timeButton}
            onPress={() => setShowPicker('plan')}
          >
            <Text style={styles.timeText}>{planTime}</Text>
          </SoundPressable>
          {showPicker === 'plan' && (
            <DateTimePicker
              testID="plan-time-native-picker"
              value={timeStringToDate(planTime)}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange('plan')}
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <MoonIcon />
            <Text style={styles.label}>{t('onboarding.reviewTime')}</Text>
          </View>
          <SoundPressable
            testID="review-time-picker"
            style={styles.timeButton}
            onPress={() => setShowPicker('review')}
          >
            <Text style={styles.timeText}>{reviewTime}</Text>
          </SoundPressable>
          {showPicker === 'review' && (
            <DateTimePicker
              testID="review-time-native-picker"
              value={timeStringToDate(reviewTime)}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange('review')}
            />
          )}
        </View>
      </View>

      <SoundPressable
        testID="onboarding-complete-button"
        accessibilityRole="button"
        accessibilityState={{ disabled: isLoading }}
        disabled={isLoading}
        style={[styles.completeButton, isLoading && styles.disabledButton]}
        onPress={handleComplete}
      >
        <Text style={styles.completeButtonText}>{t('common.complete')}</Text>
      </SoundPressable>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  brandSection: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.onSurface,
    lineHeight: 34,
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.secondaryText,
  },
  timeSections: {
    width: 310,
    gap: spacing.xl,
    marginBottom: spacing.xxl,
  },
  section: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    ...typography.overline,
    color: colors.secondaryText,
    fontWeight: '700',
  },
  timeButton: {
    backgroundColor: colors.surfaceDim,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 44,
  },
  completeButton: {
    backgroundColor: colors.primary,
    height: 52,
    width: 310,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  completeButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
});
