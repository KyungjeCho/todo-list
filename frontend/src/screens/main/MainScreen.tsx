import React, { useState } from 'react';
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
import { TodoItem } from '../../components/todo/TodoItem';
import { ModeToggle } from '../../components/todo/ModeToggle';
import { ShareButton } from '../../components/todo/ShareButton';
import { ReviewModeView } from './ReviewModeView';
import { CompleteDayButton } from '../../components/todo/CompleteDayButton';
import { VoiceTodoButton } from '../../components/todo/VoiceTodoButton';
import { InputOverlay } from '../../components/todo/InputOverlay';
import { EmptyState } from '../../components/todo/EmptyState';
import { colors, typography, spacing, radius } from '../../theme';

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
  date: string;
  onModeToggle?: () => void;
  onAddTodo?: (content: string) => void;
  onToggleComplete?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
  onDeactivate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddMemo?: (todoId: string, content: string) => void;
  onUpdateMemo?: (todoId: string, memoId: string, content: string) => void;
  onDeleteMemo?: (todoId: string, memoId: string) => void;
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
  date,
  onModeToggle,
  onAddTodo,
  onToggleComplete,
  onEdit,
  onDeactivate,
  onDelete,
  onAddMemo,
  onUpdateMemo,
  onDeleteMemo,
  onCompleteDay,
  isLoading,
  isCompleting,
  isDayCompleted,
  completeDayResult,
  completeDayError,
  error,
  onRetry,
}) => {
  const [isInputOverlayVisible, setIsInputOverlayVisible] = useState(false);
  const [expandedTodoId, setExpandedTodoId] = useState<string | null>(null);
  const [inputOverlayMode, setInputOverlayMode] = useState<'todo' | 'memo'>(
    'todo',
  );
  const [memoTargetTodoId, setMemoTargetTodoId] = useState<string | null>(null);

  const handleFabAdd = () => {
    setInputOverlayMode('todo');
    setMemoTargetTodoId(null);
    setIsInputOverlayVisible(true);
  };

  const handleOverlaySubmit = (content: string) => {
    if (inputOverlayMode === 'memo' && memoTargetTodoId) {
      onAddMemo?.(memoTargetTodoId, content);
    } else {
      onAddTodo?.(content);
    }
    setIsInputOverlayVisible(false);
    setMemoTargetTodoId(null);
  };

  const handleOverlayClose = () => {
    setIsInputOverlayVisible(false);
    setMemoTargetTodoId(null);
  };

  const handleExpand = (id: string | null) => {
    setExpandedTodoId(id);
  };

  const handleAddMemoFromExpanded = (todoId: string) => {
    setMemoTargetTodoId(todoId);
    setInputOverlayMode('memo');
    setIsInputOverlayVisible(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator testID="main-loading-indicator" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.modeText}>
            {mode === 'PLAN' ? 'Plan' : 'Review'}
          </Text>
          <View style={styles.headerRight}>
            {onModeToggle && <ModeToggle mode={mode} onToggle={onModeToggle} />}
            <ShareButton todos={todos} date={date} />
          </View>
        </View>

        <View style={styles.statsContainer}>
          <Text testID="progress-rate" style={styles.statsText}>
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
            <ReviewModeView
              todos={todos}
              stats={stats}
              onToggleComplete={onToggleComplete}
            />
            {onCompleteDay && (
              <CompleteDayButton
                onComplete={onCompleteDay}
                isLoading={isCompleting}
                isCompleted={isDayCompleted}
                carriedOverResult={
                  completeDayResult
                    ? {
                        carriedOverCount: completeDayResult.carriedOverCount,
                        carriedOverTodos: completeDayResult.carriedOverTodos,
                      }
                    : undefined
                }
                error={completeDayError}
              />
            )}
          </>
        ) : (
          <>
            {todos.length === 0 && !error ? (
              <EmptyState />
            ) : (
              <FlatList
                data={todos}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TodoItem
                    todo={item}
                    isExpanded={expandedTodoId === item.id}
                    onExpand={handleExpand}
                    onToggleComplete={onToggleComplete}
                    onEdit={onEdit}
                    onDeactivate={onDeactivate}
                    onDelete={onDelete}
                    onAddMemo={onAddMemo}
                    onAddMemoOverlay={handleAddMemoFromExpanded}
                    onUpdateMemo={onUpdateMemo}
                    onDeleteMemo={onDeleteMemo}
                  />
                )}
                contentContainerStyle={styles.listContent}
              />
            )}

            {!isInputOverlayVisible && (
              <View style={styles.fabContainer}>
                {onAddTodo && (
                  <TouchableOpacity
                    testID="fab-add-button"
                    onPress={handleFabAdd}
                    activeOpacity={0.8}
                    style={styles.fabButton}
                    accessibilityLabel="할 일 추가"
                    accessibilityRole="button"
                  >
                    <Text style={styles.fabIcon}>+</Text>
                  </TouchableOpacity>
                )}
                <VoiceTodoButton todoDate={date} />
              </View>
            )}
          </>
        )}
      </SafeAreaView>

      {onAddTodo && (
        <InputOverlay
          visible={isInputOverlayVisible}
          mode={inputOverlayMode}
          placeholder={
            inputOverlayMode === 'memo'
              ? '메모를 입력하세요'
              : '할 일을 입력하세요'
          }
          onSubmit={handleOverlaySubmit}
          onClose={handleOverlayClose}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceDim,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.surfaceDim,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modeText: {
    ...typography.h1,
    color: colors.onSurface,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statsContainer: { marginBottom: spacing.lg },
  statsText: {
    ...typography.caption,
    color: colors.onSurface,
  },
  errorContainer: { padding: spacing.md, marginBottom: spacing.lg },
  errorText: { color: colors.error },
  listContent: { paddingBottom: 120 },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: {
    color: colors.surface,
    fontSize: 24,
    lineHeight: 26,
  },
  retryButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    alignSelf: 'center',
  },
  retryText: {
    color: colors.surface,
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
});
