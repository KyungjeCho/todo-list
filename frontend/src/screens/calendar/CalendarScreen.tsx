import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

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

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export const CalendarScreen: React.FC<CalendarScreenProps> = ({
  monthlySummary,
  selectedDate,
  isLoading = false,
  error,
  onMonthChange,
  onDateSelect,
}) => {
  const { year, month, days } = monthlySummary;

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
      cells.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = formatDate(year, month, day);
      const summary = dayMap.get(date);
      const isSelected = selectedDate === date;

      cells.push(
        <TouchableOpacity
          key={date}
          testID={`calendar-day-${date}`}
          style={[styles.dayCell, isSelected && styles.selectedDay]}
          accessibilityLabel={`${month}월 ${day}일${summary ? `, 할 일 ${summary.totalCount}개` : ''}`}
          accessibilityState={{ selected: isSelected }}
          onPress={() => onDateSelect?.(date)}
        >
          <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>
            {day}
          </Text>
          {summary && (
            <View
              testID={`day-indicator-${date}`}
              style={[
                styles.indicator,
                summary.completedCount === summary.totalCount
                  ? styles.indicatorComplete
                  : styles.indicatorPartial,
              ]}
            />
          )}
        </TouchableOpacity>,
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
      {error && (
        <View testID="calendar-error-message" style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity
          testID="calendar-prev-month"
          onPress={handlePrevMonth}
          accessibilityLabel="이전 월"
        >
          <Text style={styles.navButton}>{'<'}</Text>
        </TouchableOpacity>

        <Text testID="calendar-year-month" style={styles.yearMonth}>
          {year}년 {month}월
        </Text>

        <TouchableOpacity
          testID="calendar-next-month"
          onPress={handleNextMonth}
          accessibilityLabel="다음 월"
        >
          <Text style={styles.navButton}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekdayText}>
            {label}
          </Text>
        ))}
      </View>

      <View testID="calendar-grid" style={styles.grid}>
        {renderDayCells()}
      </View>

      {days.length === 0 && (
        <View testID="calendar-empty-state" style={styles.emptyState}>
          <Text style={styles.emptyText}>
            이 달에는 등록된 할 일이 없습니다
          </Text>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  yearMonth: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  navButton: {
    fontSize: 24,
    color: '#4A90D9',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    color: '#888888',
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  selectedDay: {
    backgroundColor: '#E8F0FE',
    borderRadius: 8,
  },
  dayText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  selectedDayText: {
    color: '#4A90D9',
    fontWeight: '600',
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  indicatorComplete: {
    backgroundColor: '#4CAF50',
  },
  indicatorPartial: {
    backgroundColor: '#FF9800',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#888888',
  },
  errorContainer: {
    backgroundColor: '#FFF3F0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
});
