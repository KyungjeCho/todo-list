import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius } from '../../theme';
import { SoundPressable } from '../../components/common/SoundPressable';

interface DaySummary {
  date: string;
  totalCount: number;
  completedCount: number;
  activeCount: number;
  carriedOverCount: number;
}

interface MonthlySummary {
  year: number;
  month: number;
  days: DaySummary[];
}

interface CalendarScreenProps {
  monthlySummary: MonthlySummary;
  selectedDate?: string;
  isLoading?: boolean;
  error?: string;
  onMonthChange?: (year: number, month: number) => void;
  onDateSelect?: (date: string) => void;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const DAY_CELL_SIZE = 40;

function getWeekdayColor(index: number): string {
  if (index === 0) return colors.error;
  if (index === 6) return colors.primary;
  return colors.disabled;
}

function getDayTextColor(dayOfWeek: number, isSelected: boolean): string {
  if (isSelected) return colors.surface;
  if (dayOfWeek === 0) return colors.error;
  if (dayOfWeek === 6) return colors.primary;
  return colors.onSurface;
}

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({
  monthlySummary,
  selectedDate,
  isLoading = false,
  error,
  onMonthChange,
  onDateSelect,
}) => {
  const { t } = useTranslation();
  const { year, month, days } = monthlySummary;
  const todayDate = getTodayDate();

  const dayMap = new Map<string, DaySummary>();
  for (const day of days) {
    dayMap.set(day.date, day);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);

  const handlePrevMonth = () => {
    if (month === 1) {
      onMonthChange?.(year - 1, 12);
    } else {
      onMonthChange?.(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onMonthChange?.(year + 1, 1);
    } else {
      onMonthChange?.(year, month + 1);
    }
  };

  const renderDayCells = () => {
    const cells: React.ReactNode[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.dayCellWrapper} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = formatDate(year, month, day);
      const summary = dayMap.get(date);
      const isSelected = selectedDate === date;
      const isToday = date === todayDate;
      const dayOfWeek = (firstDayOfWeek + day - 1) % 7;

      cells.push(
        <View key={date} style={styles.dayCellWrapper}>
          <SoundPressable
            testID={`calendar-day-${date}`}
            style={[
              styles.dayCell,
              isToday && !isSelected && styles.todayDay,
              isSelected && styles.selectedDay,
            ]}
            accessibilityLabel={
              summary
                ? t('calendar.dateWithCount', {
                    month,
                    day,
                    count: summary.totalCount,
                  })
                : t('calendar.dateOnly', { month, day })
            }
            accessibilityState={{ selected: isSelected }}
            onPress={() => onDateSelect?.(date)}
          >
            <Text
              style={[
                styles.dayText,
                { color: getDayTextColor(dayOfWeek, isSelected) },
                isToday && !isSelected && styles.todayText,
              ]}
            >
              {day}
            </Text>
          </SoundPressable>
          {summary && (
            <View
              testID={`day-indicator-${date}`}
              style={[
                styles.indicator,
                summary.completedCount === summary.totalCount
                  ? styles.indicatorComplete
                  : summary.completedCount > 0
                    ? styles.indicatorPartial
                    : styles.indicatorIncomplete,
              ]}
            />
          )}
        </View>,
      );
    }

    return cells;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator testID="calendar-loading-indicator" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>{t('calendar.title')}</Text>

      {error && (
        <View testID="calendar-error-message" style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.header}>
        <SoundPressable
          testID="calendar-prev-month"
          onPress={handlePrevMonth}
          accessibilityLabel={t('calendar.prevMonth')}
        >
          <Text style={styles.navButton}>{'<'}</Text>
        </SoundPressable>

        <Text testID="calendar-year-month" style={styles.yearMonth}>
          {t('calendar.yearMonth', { year, month })}
        </Text>

        <SoundPressable
          testID="calendar-next-month"
          onPress={handleNextMonth}
          accessibilityLabel={t('calendar.nextMonth')}
        >
          <Text style={styles.navButton}>{'>'}</Text>
        </SoundPressable>
      </View>

      <View style={styles.weekdayRow}>
        {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day, index) => (
          <Text
            key={day}
            style={[styles.weekdayText, { color: getWeekdayColor(index) }]}
          >
            {t(`calendar.dayOfWeekShort.${day}`)}
          </Text>
        ))}
      </View>

      <View testID="calendar-grid" style={styles.grid}>
        {renderDayCells()}
      </View>

      {days.length === 0 && (
        <View testID="calendar-empty-state" style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('calendar.emptyMonth')}</Text>
        </View>
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
  screenTitle: {
    ...typography.h1,
    color: colors.onSurface,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  yearMonth: {
    ...typography.h2,
    color: colors.onSurface,
  },
  navButton: {
    fontSize: 24,
    color: colors.disabled,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    ...typography.overline,
    color: colors.secondaryText,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellWrapper: {
    width: '14.28%',
    height: DAY_CELL_SIZE + 14,
    alignItems: 'center',
  },
  dayCell: {
    width: DAY_CELL_SIZE,
    height: DAY_CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.lg,
  },
  selectedDay: {
    backgroundColor: colors.primary,
  },
  dayText: {
    ...typography.body,
    color: colors.onSurface,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  indicatorComplete: {
    backgroundColor: colors.success,
  },
  indicatorPartial: {
    backgroundColor: colors.warning,
  },
  indicatorIncomplete: {
    backgroundColor: colors.error,
  },
  todayDay: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.lg,
  },
  todayText: {
    color: colors.primary,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.secondaryText,
  },
  errorContainer: {
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    ...typography.body,
  },
});
