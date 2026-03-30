import React from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Todo } from '../../types/todo';
import type { CompleteDayResponse } from '../../services/api/todoApi';
import { AddTodoInput } from '../../components/todo/AddTodoInput';
import { TodoItem } from '../../components/todo/TodoItem';
import { ModeToggle } from '../../components/todo/ModeToggle';
import { ReviewModeView } from './ReviewModeView';
import { CompleteDayButton } from '../../components/todo/CompleteDayButton';

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
  onCompleteDay?: () => void;
  onNavigateSettings?: () => void;
  isLoading?: boolean;
  isAdding?: boolean;
  isCompleting?: boolean;
  isDayCompleted?: boolean;
  completeDayResult?: CompleteDayResponse | null;
  completeDayError?: string;
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
  onCompleteDay,
  onNavigateSettings,
  isLoading,
  isAdding,
  isCompleting,
  isDayCompleted,
  completeDayResult,
  completeDayError,
  error,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator testID="main-loading-indicator" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.modeText}>
          {mode === 'PLAN' ? 'Plan' : 'Review'}
        </Text>
        <View style={styles.headerRight}>
          {onModeToggle && (
            <ModeToggle mode={mode} onToggle={onModeToggle} />
          )}
          {onNavigateSettings && (
            <TouchableOpacity
              testID="settings-button"
              onPress={onNavigateSettings}
              style={styles.settingsButton}
            >
              <Text style={styles.settingsIcon}>⚙</Text>
            </TouchableOpacity>
          )}
        </View>
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

      {mode === 'REVIEW' ? (
        <>
          <ReviewModeView todos={todos} stats={stats} onToggleComplete={onToggleComplete} />
          {onCompleteDay && (
            <CompleteDayButton
              onComplete={onCompleteDay}
              isLoading={isCompleting}
              isCompleted={isDayCompleted}
              carriedOverResult={completeDayResult ? {
                carriedOverCount: completeDayResult.carriedOverCount,
                carriedOverTodos: completeDayResult.carriedOverTodos,
              } : undefined}
              error={completeDayError}
            />
          )}
        </>
      ) : (
        <>
          {todos.length === 0 && !error ? (
            <View testID="empty-state" style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                오늘의 할 일을 추가해보세요
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
        </>
      )}
    </SafeAreaView>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsButton: { padding: 4 },
  settingsIcon: { fontSize: 22 },
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
