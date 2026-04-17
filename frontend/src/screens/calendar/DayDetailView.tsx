import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import type { Todo } from '../../types/todo';
import { colors, typography, spacing, radius } from '../../theme';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

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
  const { t } = useTranslation();

  const formatDateWithI18n = (dateStr: string): string => {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekdayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const weekday = t(`calendar.dayOfWeekFull.${weekdayKeys[d.getDay()]}`);
    return t('calendar.dateDisplay', { month, day, weekday });
  };
  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner testID="day-detail-loading-indicator" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorBanner error={error} testID="day-detail-error-message" />
      </View>
    );
  }

  const renderTodoItem = ({ item }: { item: Todo }) => {
    const isCompleted = item.status === 'COMPLETED';

    return (
      <View
        testID={`day-todo-item-${item.id}`}
        style={styles.todoItem}
        accessibilityLabel={
          isCompleted
            ? t('todo.statusLabel', {
                content: item.content,
                status: t('review.completed'),
              })
            : item.isCarriedOver
              ? t('todo.statusLabelCarried', {
                  content: item.content,
                  status: t('common.incomplete'),
                })
              : t('todo.statusLabel', {
                  content: item.content,
                  status: t('common.incomplete'),
                })
        }
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
            {t('common.carriedOver')}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View testID="day-detail-stats" style={styles.headerRow}>
        <Text testID="day-detail-date" style={styles.dateHeader}>
          {formatDateWithI18n(date)}
        </Text>
        {stats.total > 0 && (
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{stats.progressRate}%</Text>
          </View>
        )}
      </View>

      {todos.length === 0 ? (
        <View testID="day-detail-empty-state" style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('calendar.emptyDay')}</Text>
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
});
