import { useState, useCallback, useRef } from 'react';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { Todo } from '../../types/todo';
import { formatShareData } from './formatShareData';

const TOAST_DURATION_MS = 2000;

interface UseShareTodoReturn {
  shareTodos: (todos: Todo[], date: string) => Promise<void>;
  shareToSelf: (todos: Todo[], date: string) => Promise<void>;
  isSharing: boolean;
  copied: boolean;
  error: string | null;
}

export function useShareTodo(): UseShareTodoReturn {
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareTodos = useCallback(async (todos: Todo[], date: string) => {
    if (todos.length === 0) {
      return;
    }

    setIsSharing(true);
    setError(null);

    try {
      const message = formatShareData(todos, date);
      await Share.share({ message });
    } catch {
      setError('공유에 실패했습니다');
    } finally {
      setIsSharing(false);
    }
  }, []);

  const shareToSelf = useCallback(async (todos: Todo[], date: string) => {
    if (todos.length === 0) {
      return;
    }

    setIsSharing(true);
    setError(null);
    setCopied(false);

    try {
      const message = formatShareData(todos, date);
      await Clipboard.setStringAsync(message);
      setCopied(true);
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = setTimeout(() => {
        setCopied(false);
      }, TOAST_DURATION_MS);
    } catch {
      setError('클립보드 복사에 실패했습니다');
    } finally {
      setIsSharing(false);
    }
  }, []);

  return { shareTodos, shareToSelf, isSharing, copied, error };
}
