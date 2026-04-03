/**
 * TodoItem — 할 일 아이템
 * 완료/미완료/이월 상태 + 메모 카운트 + 탭 확장
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { colors, typography } from '../theme';

interface TodoItemProps {
  text: string;
  completed: boolean;
  memoCount?: number;
  isCarryOver?: boolean;
  isExpanded?: boolean;
  onPress?: () => void;
  onToggle?: () => void;
}

const NoteIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M14 3v4a1 1 0 001 1h4" />
    <Path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
    <Line x1={9} y1={12} x2={15} y2={12} />
    <Line x1={9} y1={16} x2={13} y2={16} />
  </Svg>
);

export const TodoItem: React.FC<TodoItemProps> = ({
  text, completed, memoCount, isCarryOver, isExpanded, onPress, onToggle,
}) => (
  <TouchableOpacity
    style={[styles.container, isExpanded && styles.expanded]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <TouchableOpacity onPress={onToggle} style={styles.checkbox}>
      {completed ? (
        <View style={styles.checkedBox}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
      ) : (
        <View style={styles.uncheckedBox} />
      )}
    </TouchableOpacity>

    <View style={styles.textContainer}>
      {isCarryOver && (
        <View style={styles.carryOverBadge}>
          <Text style={styles.carryOverText}>이월</Text>
        </View>
      )}
      <Text style={[
        styles.text,
        completed && styles.completedText,
        isCarryOver && styles.carryOverItemText,
      ]}>
        {text}
      </Text>
    </View>

    {memoCount != null && memoCount > 0 && (
      <View style={styles.memoIndicator}>
        <NoteIcon />
        <Text style={styles.memoCount}>{memoCount}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  expanded: {
    backgroundColor: colors.primaryLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  checkbox: {},
  checkedBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  uncheckedBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.muted,
  },
  textContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    ...typography.body,
    color: colors.onSurface,
  },
  completedText: {
    color: colors.disabled,
    textDecorationLine: 'line-through',
  },
  carryOverBadge: {
    backgroundColor: colors.warningLight,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  carryOverText: {
    ...typography.overline,
    color: colors.warningDark,
  },
  carryOverItemText: {
    color: colors.warningDark,
  },
  memoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  memoCount: {
    fontSize: 12,
    color: colors.primary,
  },
});
