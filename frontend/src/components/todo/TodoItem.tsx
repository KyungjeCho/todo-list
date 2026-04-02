import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Todo } from '../../types/todo';
import { MemoSection } from './MemoSection';
import { TodoActionButtons } from './TodoActionButtons';
import { colors, spacing, radius } from '../../theme';

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

export const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  isExpanded = false,
  onExpand,
  onToggleComplete,
  onEdit,
  onDeactivate,
  onDelete,
  onAddMemo,
  onAddMemoOverlay,
  onUpdateMemo,
  onDeleteMemo,
}) => {
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
    Alert.alert('삭제', `"${todo.content}"를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => onDelete?.(todo.id),
      },
    ]);
  }, [onDelete, todo.id, todo.content]);

  const handleDeactivate = useCallback(() => {
    onDeactivate?.(todo.id);
  }, [onDeactivate, todo.id]);

  const handleAddMemo = useCallback(() => {
    if (onAddMemoOverlay) {
      onAddMemoOverlay(todo.id);
    } else {
      onAddMemo?.(todo.id, '');
    }
  }, [onAddMemoOverlay, onAddMemo, todo.id]);

  const handleCollapse = useCallback(() => {
    onExpand?.(null);
  }, [onExpand]);

  return (
    <TouchableOpacity
      testID={`todo-item-${todo.id}`}
      accessibilityLabel={`${todo.content}, ${todo.status}${todo.isCarriedOver ? ', 이월' : ''}`}
      activeOpacity={0.7}
      onPress={handleItemPress}
      style={[
        styles.container,
        isInactive && styles.inactive,
        isExpanded && styles.expanded,
      ]}
    >
      <View style={styles.row}>
        <TouchableOpacity
          testID={`todo-checkbox-${todo.id}`}
          onPress={() => onToggleComplete?.(todo.id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isCompleted }}
          style={[styles.checkbox, isCompleted && styles.checkboxChecked]}
        >
          {isCompleted && <Text style={styles.checkmark}>&#10003;</Text>}
        </TouchableOpacity>

        {todo.isCarriedOver && (
          <View
            testID={`carried-over-badge-${todo.id}`}
            accessibilityLabel="이월된 항목"
            style={styles.carriedOverBadge}
          >
            <Text style={styles.carriedOverBadgeText}>이월</Text>
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
              accessibilityLabel="할 일 수정"
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
          <TouchableOpacity
            testID={`chevron-up-${todo.id}`}
            onPress={handleCollapse}
            style={styles.chevronButton}
            accessibilityLabel="접기"
            accessibilityRole="button"
          >
            <Text style={styles.chevronIcon}>▲</Text>
          </TouchableOpacity>
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
    </TouchableOpacity>
  );
};

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
