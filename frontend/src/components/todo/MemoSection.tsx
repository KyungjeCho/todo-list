import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { TodoMemo } from '../../types/todo';
import { colors, typography, spacing, radius } from '../../theme';

interface MemoSectionProps {
  todoId: string;
  memos: TodoMemo[];
  onUpdateMemo?: (memoId: string, content: string) => void;
  onDeleteMemo?: (memoId: string) => void;
}

export const MemoSection: React.FC<MemoSectionProps> = ({
  todoId,
  memos,
  onUpdateMemo,
  onDeleteMemo,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleStartEdit = (memo: TodoMemo) => {
    setEditingId(memo.id);
    setEditText(memo.content);
  };

  const handleConfirmEdit = (memoId: string) => {
    const trimmed = editText.trim();
    if (
      trimmed.length === 0 ||
      trimmed === memos.find((m) => m.id === memoId)?.content
    ) {
      setEditingId(null);
      return;
    }
    onUpdateMemo?.(memoId, trimmed);
    setEditingId(null);
  };

  return (
    <View style={styles.container} testID={`memo-section-${todoId}`}>
      {memos.map((memo) => (
        <TouchableOpacity
          key={memo.id}
          testID={`memo-item-${memo.id}`}
          onPress={() => handleStartEdit(memo)}
          activeOpacity={0.7}
          style={styles.memoCard}
        >
          {editingId === memo.id ? (
            <View style={styles.editRow}>
              <TextInput
                testID={`memo-edit-input-${memo.id}`}
                value={editText}
                onChangeText={setEditText}
                onSubmitEditing={() => handleConfirmEdit(memo.id)}
                autoFocus
                style={styles.editInput}
              />
              <TouchableOpacity
                testID={`memo-edit-confirm-${memo.id}`}
                onPress={() => handleConfirmEdit(memo.id)}
                style={styles.confirmButton}
              >
                <Text style={styles.confirmText}>&#10003;</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.memoContent}>
                <Text style={styles.noteIcon}>📄</Text>
                <Text style={styles.memoText}>{memo.content}</Text>
              </View>
              <TouchableOpacity
                testID={`memo-delete-${memo.id}`}
                onPress={() => onDeleteMemo?.(memo.id)}
                style={styles.deleteButton}
                accessibilityLabel="메모 삭제"
                accessibilityRole="button"
              >
                <Text style={styles.deleteText}>&#10005;</Text>
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingLeft: 55,
    paddingRight: spacing.md,
    paddingBottom: spacing.sm,
    gap: 6,
    marginTop: spacing.sm,
  },
  memoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  memoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noteIcon: {
    fontSize: 14,
  },
  memoText: {
    ...typography.caption,
    color: colors.onSurface,
  },
  editRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  editInput: {
    flex: 1,
    ...typography.caption,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    padding: 0,
    color: colors.onSurface,
  },
  confirmButton: { marginLeft: spacing.sm, padding: spacing.xs },
  confirmText: { fontSize: 14, color: colors.success },
  deleteButton: { marginLeft: spacing.sm, padding: spacing.xs },
  deleteText: { fontSize: 12, color: colors.error },
});
