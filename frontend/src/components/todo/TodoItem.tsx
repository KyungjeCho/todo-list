import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Swipeable,
  LongPressGestureHandler,
  State,
} from 'react-native-gesture-handler';
import type { LongPressGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import type { Todo } from '../../types/todo';
import { MemoSection } from './MemoSection';

interface TodoItemProps {
  todo: Todo;
  onToggleComplete?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
  onDeactivate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddMemo?: (todoId: string, content: string) => void;
  onUpdateMemo?: (todoId: string, memoId: string, content: string) => void;
  onDeleteMemo?: (todoId: string, memoId: string) => void;
}

export const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  onToggleComplete,
  onEdit,
  onDeactivate,
  onDelete,
  onAddMemo,
  onUpdateMemo,
  onDeleteMemo,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showMemos, setShowMemos] = useState(false);
  const [editText, setEditText] = useState(todo.content);
  const isCompleted = todo.status === 'COMPLETED';
  const isInactive = todo.status === 'INACTIVE';
  const swipeableRef = useRef<Swipeable>(null);

  const handleContentPress = () => {
    if (isInactive) return;
    setEditText(todo.content);
    setIsEditing(true);
  };

  const handleSubmitEditing = () => {
    const trimmed = editText.trim();
    if (trimmed.length === 0 || trimmed === todo.content) {
      setIsEditing(false);
      return;
    }
    onEdit?.(todo.id, trimmed);
    setIsEditing(false);
  };

  const handleBlur = () => {
    setIsEditing(false);
    setEditText(todo.content);
  };

  const handleLongPress = useCallback(
    (event: LongPressGestureHandlerStateChangeEvent) => {
      if (event.nativeEvent.state === State.ACTIVE) {
        onDeactivate?.(todo.id);
      }
    },
    [onDeactivate, todo.id],
  );

  const handleDelete = useCallback(() => {
    Alert.alert('삭제', `"${todo.content}"를 삭제할까요?`, [
      {
        text: '취소',
        style: 'cancel',
        onPress: () => swipeableRef.current?.close(),
      },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => onDelete?.(todo.id),
      },
    ]);
  }, [onDelete, todo.id, todo.content]);

  const renderRightActions = useCallback(
    () => (
      <TouchableOpacity
        testID={`todo-delete-${todo.id}`}
        style={styles.deleteAction}
        onPress={handleDelete}
        accessibilityLabel="삭제"
        accessibilityRole="button"
      >
        <Text style={styles.deleteText}>삭제</Text>
      </TouchableOpacity>
    ),
    [todo.id, handleDelete],
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      <LongPressGestureHandler
        onHandlerStateChange={handleLongPress}
        minDurationMs={600}
      >
        <View
          testID={`todo-item-${todo.id}`}
          accessibilityLabel={`${todo.content}, ${todo.status}${todo.isCarriedOver ? ', 이월' : ''}`}
          style={[styles.container, isInactive && styles.inactive]}
        >
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
            {isEditing ? (
              <TextInput
                testID={`todo-edit-input-${todo.id}`}
                value={editText}
                onChangeText={setEditText}
                onSubmitEditing={handleSubmitEditing}
                onBlur={handleBlur}
                autoFocus
                style={styles.editInput}
              />
            ) : (
              <TouchableOpacity onPress={handleContentPress}>
                <Text
                  style={[
                    styles.contentText,
                    isCompleted && styles.completedText,
                    isInactive && styles.inactiveText,
                  ]}
                >
                  {todo.content}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            testID={`memo-toggle-${todo.id}`}
            onPress={() => setShowMemos(!showMemos)}
            style={styles.memoToggle}
            accessibilityLabel="메모"
            accessibilityRole="button"
          >
            <Text style={styles.memoToggleText}>
              {todo.memos.length > 0 ? `📝${todo.memos.length}` : '📝'}
            </Text>
          </TouchableOpacity>
        </View>
      </LongPressGestureHandler>

      {showMemos && (
        <MemoSection
          todoId={todo.id}
          memos={todo.memos}
          onAddMemo={(content) => onAddMemo?.(todo.id, content)}
          onUpdateMemo={(memoId, content) =>
            onUpdateMemo?.(todo.id, memoId, content)
          }
          onDeleteMemo={(memoId) => onDeleteMemo?.(todo.id, memoId)}
        />
      )}
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  inactive: { opacity: 0.5 },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  checkmark: { color: '#fff', fontSize: 14 },
  contentContainer: { flex: 1 },
  contentText: { fontSize: 16 },
  completedText: { textDecorationLine: 'line-through', color: '#888' },
  inactiveText: { color: '#aaa' },
  editInput: {
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2196F3',
    padding: 0,
  },
  carriedOverBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  carriedOverBadgeText: { fontSize: 10, color: '#FF9800', fontWeight: 'bold' },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  memoToggle: { padding: 4, marginLeft: 8 },
  memoToggleText: { fontSize: 14 },
});
