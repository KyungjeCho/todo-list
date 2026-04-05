import { useState, useCallback } from 'react';
import { todoApi } from '../../services/api/todoApi';
import { DraftTodoStatus } from './types';
import type { DraftTodo } from './types';

interface UseVoiceTodoSessionOptions {
  todoDate: string;
}

interface UseVoiceTodoSessionReturn {
  drafts: DraftTodo[];
  addDraft: (rawText: string) => void;
  removeDraft: (id: string) => void;
  confirmAll: () => Promise<void>;
}

export function useVoiceTodoSession({
  todoDate,
}: UseVoiceTodoSessionOptions): UseVoiceTodoSessionReturn {
  const [drafts, setDrafts] = useState<DraftTodo[]>([]);

  const addDraft = useCallback((rawText: string) => {
    const id = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const draft: DraftTodo = {
      id,
      rawText,
      refinedText: null,
      status: DraftTodoStatus.REFINING,
    };

    setDrafts((prev) => [...prev, draft]);

    todoApi
      .refineText({ text: rawText })
      .then((response) => {
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === id
              ? {
                  ...d,
                  refinedText: response.refinedText,
                  status: DraftTodoStatus.READY,
                }
              : d,
          ),
        );
      })
      .catch(() => {
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === id
              ? {
                  ...d,
                  refinedText: rawText,
                  status: DraftTodoStatus.ERROR,
                }
              : d,
          ),
        );
      });
  }, []);

  const removeDraft = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // WHY: REFINING 상태인 draft도 rawText로 폴백하여 포함 — 서버 응답 대기 없이 즉시 저장
  const confirmAll = useCallback(async () => {
    const todosToCreate = drafts.map((d) => ({
      content: d.refinedText ?? d.rawText,
      todoDate,
    }));

    if (todosToCreate.length === 0) return;

    await todoApi.batchCreateTodos({ todos: todosToCreate });
  }, [drafts, todoDate]);

  return { drafts, addDraft, removeDraft, confirmAll };
}
