/**
 * 5. Calendar — 월간 캘린더 + 일별 상세
 * 상단: 월 네비게이션 + 캘린더 그리드
 * 하단: 선택 날짜 할 일 목록
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { colors, typography, spacing, radius } from '../theme';
import { TabBar } from '../components/TabBar';
import { TodoItem } from '../components/TodoItem';

type CompletionStatus = 'complete' | 'partial' | 'none' | null;

interface CalendarDay {
  day: number;
  status: CompletionStatus;
  isToday?: boolean;
  isSelected?: boolean;
}

interface DayDetail {
  date: string;
  percentage: number;
  todos: { id: string; text: string; completed: boolean; isCarryOver?: boolean }[];
}

const statusColors: Record<string, string> = {
  complete: colors.success,
  partial: colors.warning,
  none: colors.error,
};

const dayOfWeekLabels = ['일', '월', '화', '수', '목', '금', '토'];
const dayOfWeekColors = [colors.error, ...Array(5).fill(colors.disabled), colors.primary];

const ChevronLeft = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.disabled} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="15 18 9 12 15 6" />
  </Svg>
);

const ChevronRight = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.disabled} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="9 18 15 12 9 6" />
  </Svg>
);

const CalendarDateCell: React.FC<{ day: CalendarDay; onPress: () => void }> = ({ day, onPress }) => (
  <TouchableOpacity
    style={[
      styles.dateCell,
      day.isSelected && styles.dateCellSelected,
      day.isToday && !day.isSelected && styles.dateCellToday,
    ]}
    onPress={onPress}
  >
    <Text style={[
      styles.dateText,
      day.isSelected && styles.dateTextSelected,
    ]}>
      {day.day}
    </Text>
    {day.status && (
      <View style={[styles.statusDot, { backgroundColor: statusColors[day.status] }]} />
    )}
  </TouchableOpacity>
);

export const CalendarScreen: React.FC<{
  monthLabel: string;
  days: CalendarDay[][];
  selectedDay: DayDetail | null;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (day: number) => void;
}> = ({ monthLabel, days, selectedDay, onPrevMonth, onNextMonth, onSelectDay }) => (
  <View style={styles.container}>
    {/* Title */}
    <Text style={styles.title}>캘린더</Text>

    {/* Month Nav */}
    <View style={styles.monthNav}>
      <TouchableOpacity onPress={onPrevMonth}><ChevronLeft /></TouchableOpacity>
      <Text style={styles.monthLabel}>{monthLabel}</Text>
      <TouchableOpacity onPress={onNextMonth}><ChevronRight /></TouchableOpacity>
    </View>

    {/* Day of Week Header */}
    <View style={styles.weekHeader}>
      {dayOfWeekLabels.map((label, i) => (
        <Text key={label} style={[styles.weekLabel, { color: dayOfWeekColors[i] }]}>{label}</Text>
      ))}
    </View>

    {/* Calendar Grid */}
    <View style={styles.grid}>
      {days.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => (
            day.day > 0
              ? <CalendarDateCell key={di} day={day} onPress={() => onSelectDay(day.day)} />
              : <View key={di} style={styles.dateCell} />
          ))}
        </View>
      ))}
    </View>

    {/* Divider */}
    <View style={styles.divider} />

    {/* Day Detail */}
    {selectedDay && (
      <ScrollView style={styles.detail} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailDate}>{selectedDay.date}</Text>
          <View style={styles.percentBadge}>
            <Text style={styles.percentText}>{selectedDay.percentage}%</Text>
          </View>
        </View>
        {selectedDay.todos.map(todo => (
          <TodoItem key={todo.id} text={todo.text} completed={todo.completed} isCarryOver={todo.isCarryOver} />
        ))}
      </ScrollView>
    )}

    <TabBar activeTab="calendar" onTabPress={() => {}} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceDim },
  title: { ...typography.h1, color: colors.onSurface, paddingHorizontal: spacing.xl, paddingTop: 8 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  monthLabel: { ...typography.h2, color: colors.onSurface },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingBottom: 4 },
  weekLabel: { ...typography.overline, width: 40, textAlign: 'center' },
  grid: { paddingHorizontal: 16, gap: 2 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around', height: 44 },
  dateCell: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dateCellSelected: { backgroundColor: colors.primary, borderRadius: radius.lg },
  dateCellToday: { borderWidth: 2, borderColor: colors.primary, borderRadius: radius.lg },
  dateText: { ...typography.body },
  dateTextSelected: { color: colors.surface, fontWeight: '600' },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16, marginTop: 12 },
  detail: { flex: 1 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: 12 },
  detailDate: { ...typography.h2, color: colors.onSurface },
  percentBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  percentText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
});
