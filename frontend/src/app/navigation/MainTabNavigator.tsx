import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { colors, typography } from '../../theme';
import { soundService } from '../../features/sound/soundService';
import type { MainTabParamList } from './types';
import { CalendarScreen } from '../../screens/calendar/CalendarScreen';
import { DayDetailView } from '../../screens/calendar/DayDetailView';
import { SettingsWrapper } from './SettingsWrapper';
import { reportApi } from '../../services/api/reportApi';
import type { MonthlySummaryResponse } from '../../services/api/reportApi';
import { todoApi } from '../../services/api/todoApi';
import type { Todo } from '../../types/todo';

const Tab = createBottomTabNavigator<MainTabParamList>();

function CalendarTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [monthlySummary, setMonthlySummary] =
    useState<MonthlySummaryResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayTodos, setDayTodos] = useState<Todo[]>([]);
  const [dayStats, setDayStats] = useState({
    total: 0,
    completed: 0,
    active: 0,
    inactive: 0,
    progressRate: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDayLoading, setIsDayLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [dayError, setDayError] = useState<string | undefined>();

  // WHY: 빠른 월 변경/날짜 선택 시 이전 응답이 현재 화면을 덮어쓰는 경쟁 상태 방지
  const monthRequestIdRef = useRef(0);
  const dayRequestIdRef = useRef(0);

  const fetchMonthlySummary = useCallback(async (y: number, m: number) => {
    const requestId = ++monthRequestIdRef.current;
    setIsLoading(true);
    setError(undefined);
    try {
      const data = await reportApi.getMonthlySummary(y, m);
      if (requestId !== monthRequestIdRef.current) return;
      setMonthlySummary(data);
    } catch {
      if (requestId !== monthRequestIdRef.current) return;
      setError(i18n.t('navigation.calendarLoadFailed'));
    } finally {
      if (requestId === monthRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const fetchDayDetail = useCallback(async (date: string) => {
    const requestId = ++dayRequestIdRef.current;
    setIsDayLoading(true);
    setDayError(undefined);
    try {
      const data = await todoApi.getTodos(date);
      if (requestId !== dayRequestIdRef.current) return;
      setDayTodos(data.todos);
      setDayStats(data.stats);
    } catch {
      if (requestId !== dayRequestIdRef.current) return;
      setDayError(i18n.t('navigation.dataLoadFailed'));
    } finally {
      if (requestId === dayRequestIdRef.current) {
        setIsDayLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchMonthlySummary(year, month);
  }, [year, month, fetchMonthlySummary]);

  // WHY(fix-bug-01 ③): Home에서 todo 생성 후 Calendar 탭으로 이동해도 year/month가 동일하면
  // 기본 useEffect는 재실행되지 않아 점이 반영되지 않는다. 탭 포커스 시마다 현재 월을 재조회하고,
  // 선택된 날짜가 있으면 해당 일자 상세도 함께 갱신한다.
  useFocusEffect(
    useCallback(() => {
      void fetchMonthlySummary(year, month);
      if (selectedDate) {
        void fetchDayDetail(selectedDate);
      }
    }, [year, month, selectedDate, fetchMonthlySummary, fetchDayDetail]),
  );

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    setSelectedDate(null);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    void fetchDayDetail(date);
  };

  const summary = monthlySummary ?? { year, month, days: [] };

  return (
    <SafeAreaView style={safeAreaStyle} edges={['top']}>
      <ScrollView style={{ flex: 1 }}>
        <CalendarScreen
          monthlySummary={summary}
          selectedDate={selectedDate ?? undefined}
          isLoading={isLoading}
          error={error}
          onMonthChange={handleMonthChange}
          onDateSelect={handleDateSelect}
        />
        {selectedDate && (
          <DayDetailView
            date={selectedDate}
            todos={dayTodos}
            stats={dayStats}
            isLoading={isDayLoading}
            error={dayError}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface MainTabNavigatorProps {
  HomeComponent: React.ComponentType;
}

export const MainTabNavigator: React.FC<MainTabNavigatorProps> = ({
  HomeComponent,
}) => {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.disabled,
        tabBarStyle: tabStyles.tabBar,
        tabBarLabelStyle: tabStyles.tabBarLabel,
      }}
      screenListeners={{
        tabPress: () => {
          soundService.play();
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeComponent}
        options={{
          tabBarLabel: t('navigation.home'),
          tabBarIcon: ({ color }) => (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M9 22V12h6v10"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ),
          tabBarButtonTestID: 'tab-home',
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarTab}
        options={{
          tabBarLabel: t('navigation.calendar'),
          tabBarIcon: ({ color }) => (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Rect
                x={3}
                y={4}
                width={18}
                height={18}
                rx={2}
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Line
                x1={16}
                y1={2}
                x2={16}
                y2={6}
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <Line
                x1={8}
                y1={2}
                x2={8}
                y2={6}
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <Line
                x1={3}
                y1={10}
                x2={21}
                y2={10}
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </Svg>
          ),
          tabBarButtonTestID: 'tab-calendar',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsWrapper}
        options={{
          tabBarLabel: t('navigation.settings'),
          tabBarIcon: ({ color }) => (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Circle
                cx={12}
                cy={12}
                r={3}
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 8.82a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ),
          tabBarButtonTestID: 'tab-settings',
        }}
      />
    </Tab.Navigator>
  );
};

const safeAreaStyle = { flex: 1, backgroundColor: colors.surfaceDim } as const;

const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tabBarLabel: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
  },
});
