import React, { useState, useCallback, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
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
import { LoginScreen } from '../../screens/auth/LoginScreen';
import { OnboardingScreen } from '../../screens/onboarding/OnboardingScreen';
import { MainScreen } from '../../screens/main/MainScreen';
import { MainTabNavigator } from './MainTabNavigator';
import type { RootStackParamList } from './types';

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
        const updatedUser = await userApi.updateSettings({
          planTime: settings.planTime,
          reviewTime: settings.reviewTime,
        });
        setUser(updatedUser);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '설정 저장에 실패했습니다';
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
  const { selectedDate } = useTodoStore();

  // WHY: 로그인 후 토큰 갱신(onTokenRefresh)·앱 재실행 시 서버에 FCM 토큰 재등록
  usePushNotification({
    onRegisterDevice: (params) => userApi.registerDevice(params),
  });
  const [data, setData] = useState<TodoListResponse | null>(null);
  const [modeOverride, setModeOverride] = useState<'PLAN' | 'REVIEW' | null>(
    null,
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
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [voiceProcessingError, setVoiceProcessingError] = useState<
    string | undefined
  >();

  const fetchTodos = useCallback(async (date: string, showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setError(undefined);
    try {
      const result = await todoApi.getTodos(date);
      setData(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '할 일을 불러오지 못했습니다';
      setError(message);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  const handleAddTodo = useCallback(
    async (content: string) => {
      setIsAdding(true);
      try {
        await todoApi.createTodo({ content, todoDate: selectedDate });
        await fetchTodos(selectedDate);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '할 일 추가에 실패했습니다';
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
          err instanceof Error ? err.message : '상태 변경에 실패했습니다';
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
          err instanceof Error ? err.message : '수정에 실패했습니다';
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
          err instanceof Error ? err.message : '상태 변경에 실패했습니다';
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
          err instanceof Error ? err.message : '삭제에 실패했습니다';
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
        err instanceof Error ? err.message : '일정 완료에 실패했습니다';
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
          err instanceof Error ? err.message : '메모 추가에 실패했습니다';
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
          err instanceof Error ? err.message : '메모 수정에 실패했습니다';
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
          err instanceof Error ? err.message : '메모 삭제에 실패했습니다';
        setError(message);
      }
    },
    [selectedDate, fetchTodos],
  );

  const handleVoiceTodo = useCallback(
    async (audioUri: string) => {
      setIsVoiceProcessing(true);
      setVoiceProcessingError(undefined);
      try {
        await todoApi.createVoiceTodo(audioUri, selectedDate);
        await fetchTodos(selectedDate);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : '음성 인식에 실패했습니다. 다시 시도해주세요.';
        setVoiceProcessingError(message);
      } finally {
        setIsVoiceProcessing(false);
      }
    },
    [selectedDate, fetchTodos],
  );

  const handleModeToggle = useCallback(() => {
    const currentMode = modeOverride ?? data?.mode ?? 'PLAN';
    setModeOverride(currentMode === 'PLAN' ? 'REVIEW' : 'PLAN');
  }, [modeOverride, data?.mode]);

  useEffect(() => {
    setModeOverride(null);
    setIsDayCompleted(false);
    setCompleteDayResult(null);
    setCompleteDayError(undefined);
    fetchTodos(selectedDate, true);
  }, [selectedDate, fetchTodos]);

  const currentMode = modeOverride ?? data?.mode ?? 'PLAN';

  return (
    <MainScreen
      mode={currentMode}
      todos={data?.todos ?? []}
      stats={data?.stats ?? defaultStats}
      date={selectedDate}
      onModeToggle={handleModeToggle}
      onAddTodo={handleAddTodo}
      onVoiceTodoCreated={handleVoiceTodo}
      isVoiceProcessing={isVoiceProcessing}
      voiceProcessingError={voiceProcessingError}
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
  const { isAuthenticated, user } = useAuthStore();

  // WHY: 신규 유저는 timezone이 null로 내려옴. undefined와 null 모두 체크해야 온보딩을 건너뛰지 않음
  const isOnboarded = user?.timezone != null;

  const getInitialRoute = (): keyof RootStackParamList => {
    if (!isAuthenticated) return 'Auth';
    if (!isOnboarded) return 'Onboarding';
    return 'Main';
  };

  return (
    <Stack.Navigator
      initialRouteName={getInitialRoute()}
      screenOptions={{ headerShown: false }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={LoginScreen} />
      ) : !isOnboarded ? (
        <Stack.Screen name="Onboarding" component={OnboardingWrapper} />
      ) : (
        <Stack.Screen name="Main" component={MainTabScreen} />
      )}
    </Stack.Navigator>
  );
};
