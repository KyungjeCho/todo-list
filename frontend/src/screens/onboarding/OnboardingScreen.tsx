import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

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

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
  isLoading = false,
  error,
}) => {
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
    <View style={styles.container}>
      <Text style={styles.title}>루틴 설정</Text>

      {isLoading && (
        <ActivityIndicator
          testID="onboarding-loading-indicator"
          size="large"
        />
      )}

      {error && (
        <Text testID="onboarding-error-message" style={styles.error}>
          {error}
        </Text>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>계획 시간</Text>
        <TouchableOpacity
          testID="plan-time-picker"
          style={styles.timeButton}
          onPress={() => setShowPicker('plan')}
        >
          <Text style={styles.timeText}>{planTime}</Text>
        </TouchableOpacity>
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
        <Text style={styles.label}>회고 시간</Text>
        <TouchableOpacity
          testID="review-time-picker"
          style={styles.timeButton}
          onPress={() => setShowPicker('review')}
        >
          <Text style={styles.timeText}>{reviewTime}</Text>
        </TouchableOpacity>
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

      <TouchableOpacity
        testID="onboarding-complete-button"
        accessibilityRole="button"
        accessibilityState={{ disabled: isLoading }}
        disabled={isLoading}
        style={[styles.completeButton, isLoading && styles.disabledButton]}
        onPress={handleComplete}
      >
        <Text style={styles.completeButtonText}>완료</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  timeButton: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#007AFF',
  },
  completeButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    opacity: 0.5,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
});
