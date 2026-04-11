import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { DraftTodoStatus } from '../../features/voice/types';
import type { DraftTodo } from '../../features/voice/types';
import { colors, typography, spacing, radius } from '../../theme';

interface DraftTodoItemProps {
  draft: DraftTodo;
  onRemove: (id: string) => void;
}

export const DraftTodoItem: React.FC<DraftTodoItemProps> = ({
  draft,
  onRemove,
}) => {
  const { t } = useTranslation();
  const displayText =
    draft.status === DraftTodoStatus.READY
      ? (draft.refinedText ?? draft.rawText)
      : draft.rawText;

  return (
    <View style={styles.container} testID={`draft-item-${draft.id}`}>
      <View style={styles.content}>
        {draft.status === DraftTodoStatus.REFINING && (
          <ActivityIndicator
            testID="draft-loading-spinner"
            size="small"
            color={colors.primary}
            style={styles.spinner}
          />
        )}
        {draft.status === DraftTodoStatus.READY && (
          <Text style={styles.checkIcon}>✓</Text>
        )}
        {draft.status === DraftTodoStatus.ERROR && (
          <Text style={styles.errorLabel}>{t('voice.refineFailed')}</Text>
        )}
        <Text
          style={[
            styles.text,
            draft.status === DraftTodoStatus.REFINING && styles.refiningText,
          ]}
          numberOfLines={2}
        >
          {displayText}
        </Text>
      </View>
      <TouchableOpacity
        testID={`draft-remove-${draft.id}`}
        onPress={() => onRemove(draft.id)}
        accessibilityLabel={t('common.delete')}
        style={styles.removeButton}
      >
        <Text style={styles.removeIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    marginRight: spacing.sm,
  },
  checkIcon: {
    color: colors.success,
    fontSize: 16,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  errorLabel: {
    ...typography.label,
    color: colors.error,
    marginRight: spacing.sm,
  },
  text: {
    ...typography.body,
    color: colors.onSurface,
    flex: 1,
  },
  refiningText: {
    color: colors.secondaryText,
    fontStyle: 'italic',
  },
  removeButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  removeIcon: {
    color: colors.disabled,
    fontSize: 16,
    fontWeight: '600',
  },
});
