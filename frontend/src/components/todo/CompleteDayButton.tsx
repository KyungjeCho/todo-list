import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { colors, typography, spacing, radius } from '../../theme';

interface CarriedOverResult {
  carriedOverCount: number;
  carriedOverTodos: Array<{
    fromTodoId: string;
    toTodoId: string;
    content: string;
  }>;
}

interface CompleteDayButtonProps {
  onComplete: () => void;
  isLoading?: boolean;
  isCompleted?: boolean;
  carriedOverResult?: CarriedOverResult;
  error?: string;
}

export const CompleteDayButton: React.FC<CompleteDayButtonProps> = ({
  onComplete,
  isLoading,
  isCompleted,
  carriedOverResult,
  error,
}) => {
  const disabled = isLoading || isCompleted;

  const handlePress = () => {
    if (disabled) return;
    onComplete();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        testID="complete-day-button"
        onPress={handlePress}
        disabled={disabled}
        accessibilityLabel="오늘의 일정 완료"
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        style={[styles.button, disabled && styles.buttonDisabled]}
      >
        {isLoading ? (
          <ActivityIndicator
            testID="complete-day-loading"
            color={colors.surface}
            size="small"
          />
        ) : (
          <Text style={styles.buttonText}>일정 완료</Text>
        )}
      </TouchableOpacity>

      {isCompleted && (
        <Text testID="already-completed-text" style={styles.completedText}>
          오늘의 일정이 이미 완료되었습니다
        </Text>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {carriedOverResult && carriedOverResult.carriedOverCount > 0 && (
        <View testID="carried-over-result" style={styles.resultContainer}>
          <Text style={styles.resultTitle}>이월됨</Text>
          {carriedOverResult.carriedOverTodos.map((item) => (
            <Text key={item.fromTodoId} style={styles.resultItem}>
              {item.content}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  button: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: colors.disabled },
  buttonText: {
    color: colors.surface,
    fontSize: typography.body.fontSize,
    fontWeight: typography.h2.fontWeight,
  },
  completedText: {
    marginTop: spacing.sm,
    color: colors.success,
    ...typography.body,
    textAlign: 'center',
  },
  errorText: {
    marginTop: spacing.sm,
    color: colors.error,
    ...typography.body,
    textAlign: 'center',
  },
  resultContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
  },
  resultTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  resultItem: {
    ...typography.caption,
    color: colors.warningDark,
    paddingVertical: 2,
  },
});
