import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import i18n from '../../i18n';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { userApi } from '../../services/api/userApi';
import { todoApi } from '../../services/api/todoApi';
import type {
  TodoListResponse,
  CompleteDayResponse,
} from '../../services/api/todoApi';
import { memoApi } from '../../services/api/memoApi';
import { useTodoStore } from '../../store/todoStore';
import { usePushNotification } from '../../features/notification/usePushNotification';
import { useAppFocusRefresh } from '../../features/todo/useAppFocusRefresh';
import { getCurrentDate } from '../../features/todo/getCurrentDate';
import { LoginScreen } from '../../screens/auth/LoginScreen';
import { OnboardingScreen } from '../../screens/onboarding/OnboardingScreen';
import { MainScreen } from '../../screens/main/MainScreen';
import { VoiceInputScreen } from '../../screens/voice/VoiceInputScreen';
import { TimezoneSelectScreen } from '../../screens/settings/TimezoneSelectScreen';
import { MainTabNavigator } from './MainTabNavigator';
import type { RootStackParamList } from './types';
import { selectAuthRoute } from './selectAuthRoute';
import { LoadingSplash } from './LoadingSplash';
import { completeOnboardingApi } from '../../features/onboarding/completeOnboardingApi';

type TimezoneSelectProps = NativeStackScreenProps<
  RootStackParamList,
  'TimezoneSelect'
>;

const TimezoneSelectWrapper: React.FC<TimezoneSelectProps> = ({
  route,
  navigation,
}) => {
  const { user, setUser } = useAuthStore();
  const current = route.params?.current ?? user?.timezone ?? 'UTC';

  const handleSelect = useCallback(
    async (timezone: string) => {
      const updated = await userApi.updateSettings({ timezone });
      setUser(updated);
    },
    [setUser],
  );

  return (
    <TimezoneSelectScreen
      current={current}
      onSelect={handleSelect}
      onClose={() => navigation.goBack()}
    />
  );
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const OnboardingWrapper: React.FC = () => {
  const { setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleComplete = useCallback(
    async (settings: { planTime: string; reviewTime: string }) => {
      setIsLoading(true);
      setError(undefined);
      try {
        // WHY: 시간 설정 저장 성공 이후에 온보딩 완료 플래그 전이를 별도 호출로 분리.
        // 알림 시간과 완료 상태의 결합을 끊어 Issue 3/5 를 구조적으로 차단한다.
        await userApi.updateSettings({
          planTime: settings.planTime,
          reviewTime: settings.reviewTime,
        });
        const profile = await completeOnboardingApi();
        setUser(profile);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : i18n.t('settings.settingsSaveFailed');
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [setUser],
  );

  return (
    <OnboardingScreen
      onComplete={handleComplete}
      isLoading={isLoading}
      error={error}
    />
  );
};

const defaultStats = {
  total: 0,
  completed: 0,
  active: 0,
  inactive: 0,
  progressRate: 0,
};

const MainWrapper: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { selectedDate, setSelectedDate } = useTodoStore();

  // WHY: 로그인 후 토큰 갱신(onTokenRefresh)·앱 재실행 시 서버에 FCM 토큰 재등록
  usePushNotification({
    onRegisterDevice: (params) => userApi.registerDevice(params),
  });

  const [data, setData] = useState<TodoListResponse | null>(null);
  const [modeOverride, setModeOverride] = useState<'PLAN' | 'REVIEW' | null>(
    'PLAN',
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDayCompleted, setIsDayCompleted] = useState(false);
  const [completeDayResult, setCompleteDayResult] =
    useState<CompleteDayResponse | null>(null);
  const [completeDayError, setCompleteDayError] = useState<
    string | undefined
  >();
  const [error, setError] = useState<string | undefined>();

  const fetchTodos = useCallback(async (date: string, showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setError(undefined);
    try {
      const result = await todoApi.getTodos(date);
      setData(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : i18n.t('error.todoLoadFailed');
      setError(message);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  // WHY: 자정(00:00) 경과 또는 앱 포커스 복귀 시 오늘 날짜로 갱신하여 전날 완료된 todo 제거
  const fetchTodosRef = useRef(fetchTodos);
  fetchTodosRef.current = fetchTodos;

  const handleMidnightRefresh = useCallback(() => {
    const today = getCurrentDate();
    if (selectedDate !== today) {
      setSelectedDate(today);
    } else {
      fetchTodosRef.current(today);
    }
  }, [selectedDate, setSelectedDate]);

  useAppFocusRefresh({ onRefresh: handleMidnightRefresh });

  const handleAddTodo = useCallback(
    async (content: string) => {
      setIsAdding(true);
      try {
        await todoApi.createTodo({ content, todoDate: selectedDate });
        await fetchTodos(selectedDate);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : i18n.t('error.todoAddFailed');
        setError(message);
      } finally {
        setIsAdding(false);
      }
    },
    [selectedDate, fetchTodos],
  );

  const handleToggleComplete = useCallback(
    async (id: string) => {
      const todo = data?.todos.find((t) => t.id === id);
      if (!todo) return;
      if (todo.status === 'INACTIVE') return;
      const newStatus = todo.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED';
      try {
        await todoApi.changeTodoStatus(id, { status: newStatus });
        await fetchTodos(selectedDate);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : i18n.t('error.statusChangeFailed');
        setError(message);
      }
    },
    [data, selectedDate, fetchTodos],
  );

  const handleEdit = useCallback(
    async (id: string, content: string) => {
      try {
        await todoApi.updateTodo(id, { content });
        await fetchTodos(selectedDate);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : i18n.t('error.editFailed');
        setError(message);
      }
    },
    [selectedDate, fetchTodos],
  );

  const handleDeactivate = useCallback(
    async (id: string) => {
      const todo = data?.todos.find((t) => t.id === id);
      if (!todo) return;
      const newStatus = todo.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
      try {
        await todoApi.changeTodoStatus(id, { status: newStatus });
        await fetchTodos(selectedDate);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : i18n.t('error.statusChangeFailed');
        setError(message);
      }
    },
    [data, selectedDate, fetchTodos],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await todoApi.deleteTodo(id);
        await fetchTodos(selectedDate);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : i18n.t('error.deleteFailed');
        setError(message);
      }
    },
    [selectedDate, fetchTodos],
  );

  const handleCompleteDay = useCallback(async () => {
    setIsCompleting(true);
    setCompleteDayError(undefined);
    try {
      const result = await todoApi.completeDay(selectedDate);
      setCompleteDayResult(result);
      setIsDayCompleted(true);
      await fetchTodos(selectedDate);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : i18n.t('error.completeDayFailed');
      setCompleteDayError(message);
    } finally {
      setIsCompleting(false);
    }
  }, [selectedDate, fetchTodos]);

  const handleAddMemo = useCallback(
    async (todoId: string, content: string) => {
      try {
        await memoApi.createMemo(todoId, { content });
        await fetchTodos(selectedDate);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : i18n.t('error.memoAddFailed');
        setError(message);
      }
    },
    [selectedDate, fetchTodos],
  );

  const handleUpdateMemo = useCallback(
    async (todoId: string, memoId: string, content: string) => {
      try {
        await memoApi.updateMemo(todoId, memoId, { content });
        await fetchTodos(selectedDate);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : i18n.t('error.memoEditFailed');
        setError(message);
      }
    },
    [selectedDate, fetchTodos],
  );

  const handleDeleteMemo = useCallback(
    async (todoId: string, memoId: string) => {
      try {
        await memoApi.deleteMemo(todoId, memoId);
        await fetchTodos(selectedDate);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : i18n.t('error.memoDeleteFailed');
        setError(message);
      }
    },
    [selectedDate, fetchTodos],
  );

  const handleModeToggle = useCallback(() => {
    const currentMode = modeOverride ?? data?.mode ?? 'PLAN';
    setModeOverride(currentMode === 'PLAN' ? 'REVIEW' : 'PLAN');
  }, [modeOverride, data?.mode]);

  useEffect(() => {
    setModeOverride('PLAN');
    setIsDayCompleted(false);
    setCompleteDayResult(null);
    setCompleteDayError(undefined);
    fetchTodos(selectedDate, true);
  }, [selectedDate, fetchTodos]);

  // WHY: VoiceInputScreen에서 batch create 후 돌아올 때 todo 목록 갱신
  useFocusEffect(
    useCallback(() => {
      if (!isLoading) {
        fetchTodos(selectedDate);
      }
    }, [selectedDate, fetchTodos, isLoading]),
  );

  const currentMode = modeOverride ?? data?.mode ?? 'PLAN';

  return (
    <MainScreen
      mode={currentMode}
      todos={data?.todos ?? []}
      stats={data?.stats ?? defaultStats}
      date={selectedDate}
      onModeToggle={handleModeToggle}
      onAddTodo={handleAddTodo}
      onToggleComplete={handleToggleComplete}
      onEdit={handleEdit}
      onDeactivate={handleDeactivate}
      onDelete={handleDelete}
      onAddMemo={handleAddMemo}
      onUpdateMemo={handleUpdateMemo}
      onDeleteMemo={handleDeleteMemo}
      onCompleteDay={handleCompleteDay}
      onNavigateSettings={() => navigation.navigate('Settings')}
      isLoading={isLoading}
      isAdding={isAdding}
      isCompleting={isCompleting}
      isDayCompleted={isDayCompleted}
      completeDayResult={completeDayResult}
      completeDayError={completeDayError}
      error={error}
      onRetry={() => fetchTodos(selectedDate, true)}
    />
  );
};

const MainTabScreen: React.FC = () => {
  return <MainTabNavigator HomeComponent={MainWrapper} />;
};

export const AuthNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  // WHY: 서버에 저장된 사용자 언어 설정이 변경되면 앱 전체 UI 언어를 동기화한다.
  // 디바이스 언어보다 서버 저장값이 우선이므로, 로그인 후 서버 값으로 전환한다.
  useEffect(() => {
    if (user?.language && user.language !== i18n.language) {
      void i18n.changeLanguage(user.language);
    }
  }, [user?.language]);

  const route = selectAuthRoute({ isAuthenticated, isLoading, user });

  // WHY: 로딩 단락(FR-003). Stack 진입 전에 LoadingSplash 단독 렌더로
  // Onboarding 으로 찰나 리다이렉트되는 플리커를 원천 차단.
  if (route === 'loading') {
    return <LoadingSplash />;
  }

  const showMain = route === 'main';
  const showOnboarding = route === 'onboarding';

  const getInitialRoute = (): keyof RootStackParamList => {
    if (!isAuthenticated) return 'Auth';
    if (showMain) return 'Main';
    return 'Onboarding';
  };

  return (
    <Stack.Navigator
      initialRouteName={getInitialRoute()}
      screenOptions={{ headerShown: false }}
    >
      {!isAuthenticated && <Stack.Screen name="Auth" component={LoginScreen} />}
      {showOnboarding && (
        <Stack.Screen name="Onboarding" component={OnboardingWrapper} />
      )}
      {showMain && (
        <>
          <Stack.Screen name="Main" component={MainTabScreen} />
          <Stack.Screen
            name="VoiceInput"
            component={VoiceInputScreen}
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="TimezoneSelect"
            component={TimezoneSelectWrapper}
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};
