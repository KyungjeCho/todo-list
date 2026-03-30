import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

interface UseAppFocusRefreshOptions {
  onRefresh: () => void;
}

const MIDNIGHT_CHECK_INTERVAL = 60_000;

export function useAppFocusRefresh({
  onRefresh,
}: UseAppFocusRefreshOptions): void {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastDateRef = useRef<string>(getCurrentDate());

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        const previousState = appStateRef.current;
        appStateRef.current = nextAppState;

        if (
          (previousState === 'background' || previousState === 'inactive') &&
          nextAppState === 'active'
        ) {
          onRefresh();
          lastDateRef.current = getCurrentDate();
        }
      },
    );

    const interval = setInterval(() => {
      const currentDate = getCurrentDate();
      if (currentDate !== lastDateRef.current) {
        lastDateRef.current = currentDate;
        onRefresh();
      }
    }, MIDNIGHT_CHECK_INTERVAL);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [onRefresh]);
}

function getCurrentDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
