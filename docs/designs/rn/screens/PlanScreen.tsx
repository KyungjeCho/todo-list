/**
 * 3. Main — Plan Mode
 * 헤더: Plan H1 + [Review][공유]
 * 할 일 리스트 + FAB (+/mic) + 탭 바
 */
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme';
import { TabBar } from '../components/TabBar';
import { TodoItem } from '../components/TodoItem';
import { SecondaryPill, GhostButton, FAB } from '../components/Buttons';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  memoCount?: number;
  isCarryOver?: boolean;
}

interface PlanScreenProps {
  todos: Todo[];
  onToggleTodo: (id: string) => void;
  onExpandTodo: (id: string) => void;
  onSwitchToReview: () => void;
  onShare: () => void;
  onAddTodo: () => void;
  onVoiceInput: () => void;
}

export const PlanScreen: React.FC<PlanScreenProps> = ({
  todos, onToggleTodo, onExpandTodo, onSwitchToReview, onShare, onAddTodo, onVoiceInput,
}) => {
  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Plan</Text>
        <View style={styles.headerButtons}>
          <SecondaryPill label="Review" onPress={onSwitchToReview} />
          <GhostButton label="공유" onPress={onShare} />
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progress}>
        <Text style={styles.progressCount}>{completedCount}/{totalCount}</Text>
        <Text style={styles.progressPercent}>({percentage}%)</Text>
      </View>

      <View style={styles.divider} />

      {/* Todo List */}
      <FlatList
        data={todos}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TodoItem
            text={item.text}
            completed={item.completed}
            memoCount={item.memoCount}
            isCarryOver={item.isCarryOver}
            onToggle={() => onToggleTodo(item.id)}
            onPress={() => onExpandTodo(item.id)}
          />
        )}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />

      {/* FABs */}
      <View style={styles.fabContainer}>
        <FAB icon="plus" onPress={onAddTodo} />
        <FAB icon="mic" onPress={onVoiceInput} />
      </View>

      {/* Tab Bar */}
      <TabBar activeTab="home" onTabPress={() => {}} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceDim,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    ...typography.h1,
    color: colors.onSurface,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingHorizontal: spacing.xl,
    paddingVertical: 4,
  },
  progressCount: {
    ...typography.caption,
    color: colors.onSurface,
  },
  progressPercent: {
    ...typography.caption,
    color: colors.disabled,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 93,
    gap: 12,
  },
});
