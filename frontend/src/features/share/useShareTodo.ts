import { useState, useCallback, useRef, useEffect } from 'react';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import i18n from '../../i18n';
import type { Todo } from '../../types/todo';
import { formatShareData } from './formatShareData';

const TOAST_DURATION_MS = 2000;

interface UseShareTodoReturn {
  shareTodos: (todos: Todo[], date: string) => Promise<void>;
  copyToClipboard: (todos: Todo[], date: string) => Promise<void>;
  isSharing: boolean;
  copied: boolean;
  error: string | null;
}

export function useShareTodo(): UseShareTodoReturn {
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
      if (errorTimerRef.current !== null) {
        clearTimeout(errorTimerRef.current);
      }
    };
  }, []);

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
      setError(i18n.t('share.shareFailed'));
      if (errorTimerRef.current !== null) {
        clearTimeout(errorTimerRef.current);
      }
      errorTimerRef.current = setTimeout(() => {
        setError(null);
      }, TOAST_DURATION_MS);
    } finally {
      setIsSharing(false);
    }
  }, []);

  const copyToClipboard = useCallback(async (todos: Todo[], date: string) => {
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
      setError(i18n.t('share.clipboardFailed'));
      if (errorTimerRef.current !== null) {
        clearTimeout(errorTimerRef.current);
      }
      errorTimerRef.current = setTimeout(() => {
        setError(null);
      }, TOAST_DURATION_MS);
    } finally {
      setIsSharing(false);
    }
  }, []);

  return { shareTodos, copyToClipboard, isSharing, copied, error };
}
