import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SoundPressable } from '../common/SoundPressable';
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
      <SoundPressable
        testID="action-delete-button"
        onPress={onDelete}
        style={styles.button}
        accessibilityLabel={t('common.delete')}
        accessibilityRole="button"
      >
        <Text style={styles.deleteText}>{t('common.delete')}</Text>
      </SoundPressable>

      <SoundPressable
        testID="action-deactivate-button"
        onPress={onDeactivate}
        style={styles.button}
        accessibilityLabel={t('common.deactivate')}
        accessibilityRole="button"
      >
        <Text style={styles.deactivateText}>{t('common.deactivate')}</Text>
      </SoundPressable>

      <SoundPressable
        testID="action-add-memo-button"
        onPress={onAddMemo}
        style={styles.button}
        accessibilityLabel={t('todo.addMemo')}
        accessibilityRole="button"
      >
        <Text style={styles.memoText}>{t('todo.addMemoButton')}</Text>
      </SoundPressable>
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
