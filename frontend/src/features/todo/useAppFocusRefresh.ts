import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { getCurrentDate } from './getCurrentDate';

interface UseAppFocusRefreshOptions {
  onRefresh: () => void;
}

const MIDNIGHT_CHECK_INTERVAL = 60_000;

export function useAppFocusRefresh({
  onRefresh,
}: UseAppFocusRefreshOptions): void {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastDateRef = useRef<string>(getCurrentDate());
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

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
          onRefreshRef.current();
          lastDateRef.current = getCurrentDate();
        }
      },
    );

    const interval = setInterval(() => {
      const currentDate = getCurrentDate();
      if (currentDate !== lastDateRef.current) {
        lastDateRef.current = currentDate;
        onRefreshRef.current();
      }
    }, MIDNIGHT_CHECK_INTERVAL);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);
}
