import { useRef, useCallback, useEffect } from 'react';

interface UseTimerReturn {
  setTimeout: (callback: () => void, delay: number) => void;
  setInterval: (callback: () => void, delay: number) => void;
  clear: () => void;
}

export function useTimer(): UseTimerReturn {
  const timerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(
    null,
  );
  const isIntervalRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      if (isIntervalRef.current) {
        globalThis.clearInterval(timerRef.current);
      } else {
        globalThis.clearTimeout(timerRef.current);
      }
      timerRef.current = null;
    }
  }, []);

  const setTimeoutFn = useCallback(
    (callback: () => void, delay: number) => {
      clear();
      isIntervalRef.current = false;
      timerRef.current = globalThis.setTimeout(callback, delay);
    },
    [clear],
  );

  const setIntervalFn = useCallback(
    (callback: () => void, delay: number) => {
      clear();
      isIntervalRef.current = true;
      timerRef.current = globalThis.setInterval(callback, delay);
    },
    [clear],
  );

  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  return {
    setTimeout: setTimeoutFn,
    setInterval: setIntervalFn,
    clear,
  };
}
