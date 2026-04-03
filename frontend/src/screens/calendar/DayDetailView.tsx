import React from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import type { Todo } from '../../types/todo';
import { colors, typography, spacing, radius } from '../../theme';

const WEEKDAY_NAMES = [
  '일요일',
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
];

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = WEEKDAY_NAMES[d.getDay()];
  return `${month}월 ${day}일 ${weekday}`;
}

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

function CheckCircleIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx={12} cy={12} r={10} fill={colors.successLight} />
      <Path
        d="M8 12l3 3 5-5"
        stroke={colors.surface}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function EmptyCircleIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgCircle
        cx={12}
        cy={12}
        r={10}
        stroke={colors.muted}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

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
    const isCompleted = item.status === 'COMPLETED';

    return (
      <View
        testID={`day-todo-item-${item.id}`}
        style={styles.todoItem}
        accessibilityLabel={`${item.content}, ${isCompleted ? '완료' : item.isCarriedOver ? '이월' : '미완료'}`}
      >
        <View style={styles.checkboxContainer}>
          {isCompleted ? <CheckCircleIcon /> : <EmptyCircleIcon />}
        </View>
        <Text
          style={[styles.todoContent, isCompleted && styles.completedContent]}
        >
          {item.content}
        </Text>
        {item.isCarriedOver && (
          <Text
            testID={`carried-over-badge-${item.id}`}
            style={styles.carriedOverLabel}
          >
            이월
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View testID="day-detail-stats" style={styles.headerRow}>
        <Text testID="day-detail-date" style={styles.dateHeader}>
          {formatDateDisplay(date)}
        </Text>
        {stats.total > 0 && (
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{stats.progressRate}%</Text>
          </View>
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
    backgroundColor: colors.surfaceDim,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateHeader: {
    ...typography.h2,
    color: colors.onSurface,
  },
  progressBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: 10,
  },
  progressBadgeText: {
    ...typography.overline,
    fontWeight: '700',
    color: colors.primary,
    fontSize: 13,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  checkboxContainer: {
    marginRight: spacing.md,
  },
  todoContent: {
    flex: 1,
    ...typography.body,
    color: colors.onSurface,
  },
  completedContent: {
    textDecorationLine: 'line-through',
    color: colors.disabled,
  },
  carriedOverLabel: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.secondaryText,
  },
  errorContainer: {
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  errorText: {
    color: colors.error,
    ...typography.body,
  },
});
