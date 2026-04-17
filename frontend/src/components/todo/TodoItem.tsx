import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import type { Todo } from '../../types/todo';
import { MemoSection } from './MemoSection';
import { TodoActionButtons } from './TodoActionButtons';
import { SoundPressable } from '../common/SoundPressable';
import { Checkbox } from '../common/Checkbox';
import { colors, spacing } from '../../theme';

interface TodoItemProps {
  todo: Todo;
  isExpanded?: boolean;
  onExpand?: (id: string | null) => void;
  onToggleComplete?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
  onDeactivate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddMemo?: (todoId: string, content: string) => void;
  onAddMemoOverlay?: (todoId: string) => void;
  onUpdateMemo?: (todoId: string, memoId: string, content: string) => void;
  onDeleteMemo?: (todoId: string, memoId: string) => void;
}

export const TodoItem = React.memo<TodoItemProps>(
  ({
    todo,
    isExpanded = false,
    onExpand,
    onToggleComplete,
    onEdit,
    onDeactivate,
    onDelete,
    onAddMemoOverlay,
    onUpdateMemo,
    onDeleteMemo,
  }) => {
    const { t } = useTranslation();
    const [editText, setEditText] = useState(todo.content);
    const isCompleted = todo.status === 'COMPLETED';
    const isInactive = todo.status === 'INACTIVE';

    useEffect(() => {
      if (isExpanded) {
        setEditText(todo.content);
      }
    }, [isExpanded, todo.content]);

    const handleItemPress = useCallback(() => {
      onExpand?.(isExpanded ? null : todo.id);
    }, [isExpanded, onExpand, todo.id]);

    const handleSubmitEditing = () => {
      const trimmed = editText.trim();
      if (trimmed.length === 0 || trimmed === todo.content) {
        setEditText(todo.content);
        return;
      }
      onEdit?.(todo.id, trimmed);
    };

    const handleBlur = () => {
      handleSubmitEditing();
    };

    const handleDelete = useCallback(() => {
      Alert.alert(
        t('todo.deleteTitle'),
        t('todo.deleteMessage', { content: todo.content }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => onDelete?.(todo.id),
          },
        ],
      );
    }, [onDelete, todo.id, todo.content, t]);

    const handleDeactivate = useCallback(() => {
      onDeactivate?.(todo.id);
    }, [onDeactivate, todo.id]);

    const handleAddMemo = useCallback(() => {
      onAddMemoOverlay?.(todo.id);
    }, [onAddMemoOverlay, todo.id]);

    const handleCollapse = useCallback(() => {
      onExpand?.(null);
    }, [onExpand]);

    return (
      <SoundPressable
        testID={`todo-item-${todo.id}`}
        accessibilityLabel={
          todo.isCarriedOver
            ? t('todo.statusLabelCarried', {
                content: todo.content,
                status: t(`todo.statusAccessibility.${todo.status}`),
              })
            : t('todo.statusLabel', {
                content: todo.content,
                status: t(`todo.statusAccessibility.${todo.status}`),
              })
        }
        activeOpacity={0.7}
        onPress={handleItemPress}
        style={[
          styles.container,
          isInactive && styles.inactive,
          isExpanded && styles.expanded,
        ]}
      >
        <View style={styles.row}>
          <Checkbox
            testID={`todo-checkbox-${todo.id}`}
            checked={isCompleted}
            onPress={() => onToggleComplete?.(todo.id)}
          />

          {todo.isCarriedOver && (
            <View
              testID={`carried-over-badge-${todo.id}`}
              accessibilityLabel={t('todo.carriedOverItem')}
              style={styles.carriedOverBadge}
            >
              <Text style={styles.carriedOverBadgeText}>
                {t('common.carriedOver')}
              </Text>
            </View>
          )}

          <View style={styles.contentContainer}>
            {isExpanded ? (
              <TextInput
                testID={`todo-edit-input-${todo.id}`}
                value={editText}
                onChangeText={setEditText}
                onSubmitEditing={handleSubmitEditing}
                onBlur={handleBlur}
                style={[
                  styles.contentInput,
                  isCompleted && styles.completedText,
                  isInactive && styles.inactiveText,
                ]}
                accessibilityLabel={t('todo.editTodo')}
              />
            ) : (
              <Text
                style={[
                  styles.contentText,
                  isCompleted && styles.completedText,
                  isInactive && styles.inactiveText,
                ]}
              >
                {todo.content}
              </Text>
            )}
          </View>

          {!isExpanded && todo.memos.length > 0 && (
            <View style={styles.memoCountContainer}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                  stroke={colors.primary}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M14 2v6h6"
                  stroke={colors.primary}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.memoCountText}>{todo.memos.length}</Text>
            </View>
          )}

          {isExpanded && (
            <SoundPressable
              testID={`chevron-up-${todo.id}`}
              onPress={handleCollapse}
              style={styles.chevronButton}
              accessibilityLabel={t('todo.collapse')}
              accessibilityRole="button"
            >
              <Text style={styles.chevronIcon}>▲</Text>
            </SoundPressable>
          )}
        </View>

        {isExpanded && (
          <>
            <TodoActionButtons
              onDelete={handleDelete}
              onDeactivate={handleDeactivate}
              onAddMemo={handleAddMemo}
            />

            <MemoSection
              todoId={todo.id}
              memos={todo.memos}
              onUpdateMemo={(memoId, content) =>
                onUpdateMemo?.(todo.id, memoId, content)
              }
              onDeleteMemo={(memoId) => onDeleteMemo?.(todo.id, memoId)}
            />
          </>
        )}
      </SoundPressable>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  inactive: { opacity: 0.5 },
  expanded: {
    backgroundColor: colors.primaryLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentContainer: { flex: 1 },
  contentText: {
    fontSize: 15,
    color: colors.onSurface,
  },
  contentInput: {
    fontSize: 15,
    color: colors.onSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: colors.disabled,
  },
  inactiveText: { color: colors.disabled },
  carriedOverBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  carriedOverBadgeText: {
    fontSize: 10,
    color: colors.warningDark,
    fontWeight: 'bold',
  },
  memoCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: spacing.sm,
  },
  memoCountText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  chevronButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  chevronIcon: {
    fontSize: 12,
    color: colors.secondaryText,
  },
});
