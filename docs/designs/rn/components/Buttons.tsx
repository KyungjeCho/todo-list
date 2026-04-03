/**
 * DS Button 컴포넌트 — Primary / Secondary / Ghost / FAB
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Line, Rect } from 'react-native-svg';
import { colors, typography, radius } from '../theme';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}

export const PrimaryButton: React.FC<ButtonProps> = ({ label, onPress, disabled }) => (
  <TouchableOpacity
    style={[styles.primary, disabled && styles.primaryDisabled]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
  >
    <Text style={styles.primaryText}>{label}</Text>
  </TouchableOpacity>
);

export const SecondaryPill: React.FC<ButtonProps> = ({ label, onPress }) => (
  <TouchableOpacity style={styles.secondaryPill} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.secondaryPillText}>{label}</Text>
  </TouchableOpacity>
);

export const GhostButton: React.FC<ButtonProps> = ({ label, onPress }) => (
  <TouchableOpacity style={styles.ghost} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.ghostText}>{label}</Text>
  </TouchableOpacity>
);

interface FABProps {
  icon: 'plus' | 'mic';
  onPress?: () => void;
}

export const FAB: React.FC<FABProps> = ({ icon, onPress }) => (
  <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.8}>
    {icon === 'plus' ? (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Line x1={12} y1={5} x2={12} y2={19} />
        <Line x1={5} y1={12} x2={19} y2={12} />
      </Svg>
    ) : (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <Rect x={9} y={2} width={6} height={12} rx={3} />
        <Path d="M5 10a7 7 0 0014 0" />
        <Line x1={12} y1={17} x2={12} y2={21} />
        <Line x1={8} y1={21} x2={16} y2={21} />
      </Svg>
    )}
  </TouchableOpacity>
);

export const ToggleSwitch: React.FC<{ value: boolean; onToggle?: () => void }> = ({ value, onToggle }) => (
  <TouchableOpacity
    style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}
    onPress={onToggle}
    activeOpacity={0.8}
  >
    <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  primary: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: {
    opacity: 0.5,
  },
  primaryText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryPillText: {
    ...typography.caption,
    color: '#334155',
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    ...typography.caption,
    color: colors.primary,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: colors.primary,
  },
  toggleOff: {
    backgroundColor: colors.border,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
});
