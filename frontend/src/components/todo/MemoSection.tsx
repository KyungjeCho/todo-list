import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { TodoMemo } from '../../types/todo';

interface MemoSectionProps {
  todoId: string;
  memos: TodoMemo[];
  onAddMemo?: (content: string) => void;
  onUpdateMemo?: (memoId: string, content: string) => void;
  onDeleteMemo?: (memoId: string) => void;
}

export const MemoSection: React.FC<MemoSectionProps> = ({
  todoId,
  memos,
  onAddMemo,
  onUpdateMemo,
  onDeleteMemo,
}) => {
  const [inputText, setInputText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleAdd = () => {
    const trimmed = inputText.trim();
    if (trimmed.length === 0) return;
    onAddMemo?.(trimmed);
    setInputText('');
  };

  const handleStartEdit = (memo: TodoMemo) => {
    setEditingId(memo.id);
    setEditText(memo.content);
  };

  const handleConfirmEdit = (memoId: string) => {
    const trimmed = editText.trim();
    if (trimmed.length === 0 || trimmed === memos.find((m) => m.id === memoId)?.content) {
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
          style={styles.memoItem}
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
            <View style={styles.memoContent}>
              <Text style={styles.memoText}>{memo.content}</Text>
            </View>
          )}
          <TouchableOpacity
            testID={`memo-delete-${memo.id}`}
            onPress={() => onDeleteMemo?.(memo.id)}
            style={styles.deleteButton}
            accessibilityLabel="메모 삭제"
            accessibilityRole="button"
          >
            <Text style={styles.deleteText}>&#10005;</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      <View style={styles.inputRow}>
        <TextInput
          testID="memo-input"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleAdd}
          placeholder="메모 추가"
          accessibilityLabel="메모 입력"
          style={styles.input}
        />
        <TouchableOpacity
          testID="memo-add-button"
          onPress={handleAdd}
          accessibilityLabel="메모 추가"
          accessibilityRole="button"
          style={styles.addButton}
        >
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingLeft: 36,
    paddingRight: 12,
    paddingBottom: 8,
  },
  memoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  memoContent: { flex: 1 },
  memoText: { fontSize: 13, color: '#666' },
  editRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  editInput: {
    flex: 1,
    fontSize: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#2196F3',
    padding: 0,
  },
  confirmButton: { marginLeft: 8, padding: 4 },
  confirmText: { fontSize: 14, color: '#4CAF50' },
  deleteButton: { marginLeft: 8, padding: 4 },
  deleteText: { fontSize: 12, color: '#F44336' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  input: {
    flex: 1,
    fontSize: 13,
    padding: 4,
    color: '#888',
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addText: { fontSize: 14, color: '#2196F3' },
});
