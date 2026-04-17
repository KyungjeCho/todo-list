import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SoundPressable } from './SoundPressable';
import { colors, typography, spacing, radius } from '../../theme';

interface ErrorBannerProps {
  error?: string | null;
  testID?: string;
  onRetry?: () => void;
}

/**
 * Renders an error message banner. Returns null when there is no error.
 * Optionally shows a retry button when `onRetry` is provided.
 */
export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  error,
  testID,
  onRetry,
}) => {
  const { t } = useTranslation();

  if (!error) return null;

  return (
    <View testID={testID} style={styles.container}>
      <Text style={styles.errorText}>{error}</Text>
      {onRetry && (
        <SoundPressable
          testID={testID ? `${testID}-retry` : 'error-retry-button'}
          onPress={onRetry}
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </SoundPressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    ...typography.body,
  },
  retryButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    alignSelf: 'center',
  },
  retryText: {
    color: colors.surface,
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
});
