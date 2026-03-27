import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

interface OnboardingSettings {
  planTime: string;
  reviewTime: string;
}

interface OnboardingScreenProps {
  onComplete?: (settings: OnboardingSettings) => void;
  isLoading?: boolean;
  error?: string;
}

interface TimePickerProps {
  testID: string;
  value: string;
  onChange: (time: string) => void;
}

const TimePicker: React.FC<TimePickerProps> = ({ testID, value, onChange }) => {
  return (
    <View
      testID={testID}
      // @ts-expect-error: onChange is used by react-native-testing-library fireEvent
      onChange={(time: string) => {
        onChange(time);
      }}
    >
      <Text>{value}</Text>
    </View>
  );
};

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
  isLoading = false,
  error,
}) => {
  const [planTime, setPlanTime] = useState('08:00');
  const [reviewTime, setReviewTime] = useState('22:00');

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
        <TimePicker
          testID="plan-time-picker"
          value={planTime}
          onChange={setPlanTime}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>회고 시간</Text>
        <TimePicker
          testID="review-time-picker"
          value={reviewTime}
          onChange={setReviewTime}
        />
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
