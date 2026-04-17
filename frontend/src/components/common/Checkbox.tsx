import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SoundPressable } from './SoundPressable';
import { colors, spacing, radius } from '../../theme';

interface CheckboxProps {
  checked: boolean;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * Reusable 22x22 checkbox with checkmark indicator.
 * Wraps SoundPressable for consistent tap sound behaviour.
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onPress,
  testID,
  accessibilityLabel,
}) => (
  <SoundPressable
    testID={testID}
    onPress={onPress}
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
    accessibilityLabel={accessibilityLabel}
    style={[styles.checkbox, checked && styles.checkboxChecked]}
  >
    {checked && <Text style={styles.checkmark}>&#10003;</Text>}
  </SoundPressable>
);

const styles = StyleSheet.create({
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.muted,
    borderRadius: radius.sm,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.successLight,
    borderColor: colors.successLight,
  },
  checkmark: { color: colors.surface, fontSize: 14 },
});
