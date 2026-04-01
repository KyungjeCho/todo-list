import React from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import type { Todo } from '../../types/todo';

interface DayStats {
  total: number;
  completed: number;
  active: number;
  inactive: number;
  progressRate: number;
}

interface DayDetailViewProps {
  date: string;
  todos: Todo[];
  stats: DayStats;
  isLoading?: boolean;
  error?: string;
}

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: '#4A90D9', label: '진행' },
  COMPLETED: { color: '#4CAF50', label: '완료' },
  INACTIVE: { color: '#9E9E9E', label: '미활성' },
  CARRIED_OVER: { color: '#FF9800', label: '이월' },
};

export const DayDetailView: React.FC<DayDetailViewProps> = ({
  date,
  todos,
  stats,
  isLoading = false,
  error,
}) => {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator testID="day-detail-loading-indicator" size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View testID="day-detail-error-message" style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  const renderTodoItem = ({ item }: { item: Todo }) => {
    const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.ACTIVE;
    const isCompleted = item.status === 'COMPLETED';

    return (
      <View
        testID={`day-todo-item-${item.id}`}
        style={styles.todoItem}
        accessibilityLabel={`${item.content}, ${statusStyle.label}`}
      >
        <View
          style={[styles.statusDot, { backgroundColor: statusStyle.color }]}
        />
        <Text
          style={[styles.todoContent, isCompleted && styles.completedContent]}
        >
          {item.content}
        </Text>
        {item.isCarriedOver && (
          <View
            testID={`carried-over-badge-${item.id}`}
            style={styles.carriedOverBadge}
          >
            <Text style={styles.carriedOverText}>이월</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text testID="day-detail-date" style={styles.dateHeader}>
        {date}
      </Text>

      <View testID="day-detail-stats" style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>완료 </Text>
          <Text style={styles.statsValue}>{stats.completed}</Text>
          <Text style={styles.statsLabel}> / 전체 </Text>
          <Text style={styles.statsValue}>{stats.total}</Text>
        </View>
        {stats.total > 0 && (
          <Text style={styles.progressText}>{stats.progressRate}%</Text>
        )}
      </View>

      {todos.length === 0 ? (
        <View testID="day-detail-empty-state" style={styles.emptyState}>
          <Text style={styles.emptyText}>
            이 날에는 등록된 할 일이 없습니다
          </Text>
        </View>
      ) : (
        <FlatList
          data={todos}
          keyExtractor={(item) => item.id}
          renderItem={renderTodoItem}
          scrollEnabled={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  statsLabel: {
    fontSize: 14,
    color: '#555555',
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1A1A1A',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90D9',
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  todoContent: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
  },
  completedContent: {
    textDecorationLine: 'line-through',
    color: '#9E9E9E',
  },
  carriedOverBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  carriedOverText: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#888888',
  },
  errorContainer: {
    backgroundColor: '#FFF3F0',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
});
