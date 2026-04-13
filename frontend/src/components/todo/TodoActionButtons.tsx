import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <View testID="action-buttons-container" style={styles.container}>
      <TouchableOpacity
        testID="action-delete-button"
        onPress={onDelete}
        style={styles.button}
        accessibilityLabel={t('common.delete')}
        accessibilityRole="button"
      >
        <Text style={styles.deleteText}>{t('common.delete')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="action-deactivate-button"
        onPress={onDeactivate}
        style={styles.button}
        accessibilityLabel={t('common.deactivate')}
        accessibilityRole="button"
      >
        <Text style={styles.deactivateText}>{t('common.deactivate')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="action-add-memo-button"
        onPress={onAddMemo}
        style={styles.button}
        accessibilityLabel={t('todo.addMemo')}
        accessibilityRole="button"
      >
        <Text style={styles.memoText}>{t('todo.addMemoButton')}</Text>
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
