import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../theme';

interface TodoActionButtonsProps {
  onDelete: () => void;
  onDeactivate: () => void;
  onAddMemo: () => void;
}

export const TodoActionButtons: React.FC<TodoActionButtonsProps> = ({
  onDelete,
  onDeactivate,
  onAddMemo,
}) => {
  return (
    <View testID="action-buttons-container" style={styles.container}>
      <TouchableOpacity
        testID="action-delete-button"
        onPress={onDelete}
        style={styles.button}
        accessibilityLabel="삭제"
        accessibilityRole="button"
      >
        <Text style={styles.deleteText}>삭제</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="action-deactivate-button"
        onPress={onDeactivate}
        style={styles.button}
        accessibilityLabel="비활성화"
        accessibilityRole="button"
      >
        <Text style={styles.deactivateText}>비활성화</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="action-add-memo-button"
        onPress={onAddMemo}
        style={styles.button}
        accessibilityLabel="메모 추가"
        accessibilityRole="button"
      >
        <Text style={styles.memoText}>+ 메모</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingLeft: 55,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  deleteText: {
    fontSize: 12,
    color: colors.error,
  },
  deactivateText: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  memoText: {
    fontSize: 12,
    color: colors.primary,
  },
});
