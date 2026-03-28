import React from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { Todo } from '../../types/todo';
import { AddTodoInput } from '../../components/todo/AddTodoInput';
import { TodoItem } from '../../components/todo/TodoItem';
import { ModeToggle } from '../../components/todo/ModeToggle';

interface Stats {
  total: number;
  completed: number;
  active: number;
  inactive: number;
  progressRate: number;
}

interface MainScreenProps {
  mode: 'PLAN' | 'REVIEW';
  todos: Todo[];
  stats: Stats;
  onModeToggle?: () => void;
  onAddTodo?: (content: string) => void;
  onToggleComplete?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
  onDeactivate?: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
  isAdding?: boolean;
  error?: string;
  onRetry?: () => void;
}

export const MainScreen: React.FC<MainScreenProps> = ({
  mode,
  todos,
  stats,
  onModeToggle,
  onAddTodo,
  onToggleComplete,
  onEdit,
  onDeactivate,
  onDelete,
  isLoading,
  isAdding,
  error,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator testID="main-loading-indicator" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.modeText}>
          {mode === 'PLAN' ? 'Plan' : 'Review'}
        </Text>
        {onModeToggle && (
          <ModeToggle mode={mode} onToggle={onModeToggle} />
        )}
      </View>

      <View style={styles.statsContainer}>
        <Text testID="progress-rate">
          {stats.completed}/{stats.total} ({stats.progressRate}%)
        </Text>
      </View>

      {error && (
        <View testID="main-error-message" style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          {onRetry && (
            <TouchableOpacity
              testID="retry-button"
              onPress={onRetry}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>다시 시도</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {todos.length === 0 && !error ? (
        <View testID="empty-state" style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {mode === 'PLAN'
              ? '오늘의 할 일을 추가해보세요'
              : '오늘의 할 일이 없습니다'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={todos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TodoItem
              todo={item}
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              onDelete={onDelete}
            />
          )}
        />
      )}

      {onAddTodo && (
        <AddTodoInput onAdd={onAddTodo} isLoading={isAdding} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modeText: { fontSize: 24, fontWeight: 'bold' },
  statsContainer: { marginBottom: 16 },
  errorContainer: { padding: 12, marginBottom: 16 },
  errorText: { color: 'red' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888' },
  retryButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#2196F3',
    borderRadius: 4,
    alignSelf: 'center',
  },
  retryText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  todoItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
});
