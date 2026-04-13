import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing } from '../../theme';

interface ModeToggleProps {
  mode: 'PLAN' | 'REVIEW';
  onToggle: () => void;
}

export const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onToggle }) => {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      testID="mode-toggle-button"
      onPress={onToggle}
      accessibilityLabel={
        mode === 'PLAN' ? t('mode.switchToReview') : t('mode.switchToPlan')
      }
      accessibilityRole="button"
      style={styles.container}
    >
      <Text style={styles.text}>{mode === 'PLAN' ? 'Review' : 'Plan'}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.lg,
    backgroundColor: colors.borderLight,
  },
  text: {
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    color: colors.onSurface,
  },
});
