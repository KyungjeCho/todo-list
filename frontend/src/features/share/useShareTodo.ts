import { useState, useCallback } from 'react';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import i18n from '../../i18n';
import type { Todo } from '../../types/todo';
import { formatShareData } from './formatShareData';
import { useTimer } from '../common/useTimer';

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
  const toastTimer = useTimer();
  const errorTimer = useTimer();

  const shareTodos = useCallback(
    async (todos: Todo[], date: string) => {
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
        errorTimer.setTimeout(() => {
          setError(null);
        }, TOAST_DURATION_MS);
      } finally {
        setIsSharing(false);
      }
    },
    [errorTimer],
  );

  const copyToClipboard = useCallback(
    async (todos: Todo[], date: string) => {
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
        toastTimer.setTimeout(() => {
          setCopied(false);
        }, TOAST_DURATION_MS);
      } catch {
        setError(i18n.t('share.clipboardFailed'));
        errorTimer.setTimeout(() => {
          setError(null);
        }, TOAST_DURATION_MS);
      } finally {
        setIsSharing(false);
      }
    },
    [toastTimer, errorTimer],
  );

  return { shareTodos, copyToClipboard, isSharing, copied, error };
}
