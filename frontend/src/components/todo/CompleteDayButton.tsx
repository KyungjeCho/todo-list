import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        accessibilityLabel={t('todo.completeDayAccessibility')}
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
          <Text style={styles.buttonText}>{t('todo.completeDay')}</Text>
        )}
      </TouchableOpacity>

      {isCompleted && (
        <Text testID="already-completed-text" style={styles.completedText}>
          {t('todo.completeDayAlreadyDone')}
        </Text>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {carriedOverResult && carriedOverResult.carriedOverCount > 0 && (
        <View testID="carried-over-result" style={styles.resultContainer}>
          <Text style={styles.resultTitle}>{t('todo.completeDayResult')}</Text>
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
