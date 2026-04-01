import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ScrollView, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
      setError('캘린더 데이터를 불러올 수 없습니다');
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
      setDayError('데이터를 불러올 수 없습니다');
    } finally {
      if (requestId === dayRequestIdRef.current) {
        setIsDayLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchMonthlySummary(year, month);
  }, [year, month, fetchMonthlySummary]);

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
  );
}

interface MainTabNavigatorProps {
  HomeComponent: React.ComponentType;
}

export const MainTabNavigator: React.FC<MainTabNavigatorProps> = ({
  HomeComponent,
}) => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4A90D9',
        tabBarInactiveTintColor: '#888888',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeComponent}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>🏠</Text>
          ),
          tabBarButtonTestID: 'tab-home',
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarTab}
        options={{
          tabBarLabel: '캘린더',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>📅</Text>
          ),
          tabBarButtonTestID: 'tab-calendar',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsWrapper}
        options={{
          tabBarLabel: '설정',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>⚙️</Text>
          ),
          tabBarButtonTestID: 'tab-settings',
        }}
      />
    </Tab.Navigator>
  );
};
