import { renderHook, act, waitFor } from '@testing-library/react-native';
import { todoApi } from 'src/services/api/todoApi';
import { DraftTodoStatus } from 'src/features/voice/types';

jest.mock('src/services/api/todoApi', () => ({
  todoApi: {
    refineText: jest.fn(),
    batchCreateTodos: jest.fn(),
  },
}));

import { useVoiceTodoSession } from 'src/features/voice/useVoiceTodoSession';

const mockedTodoApi = todoApi as jest.Mocked<typeof todoApi>;

describe('useVoiceTodoSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('addDraft 호출 시 refining 상태로 추가 후 refine 성공 시 ready로 전환된다', async () => {
    mockedTodoApi.refineText.mockResolvedValue({
      refinedText: '내일까지 장보기',
    });

    const { result } = renderHook(() =>
      useVoiceTodoSession({ todoDate: '2026-04-04' }),
    );

    act(() => {
      result.current.addDraft('장보기 가야 돼 내일까지');
    });

    expect(result.current.drafts[0].status).toBe(DraftTodoStatus.REFINING);
    expect(result.current.drafts[0].rawText).toBe('장보기 가야 돼 내일까지');

    await waitFor(() => {
      expect(result.current.drafts[0].status).toBe(DraftTodoStatus.READY);
    });

    expect(result.current.drafts[0].refinedText).toBe('내일까지 장보기');
  });

  it('addDraft 후 refine 실패 시 error 상태로 전환되고 원본 텍스트가 refinedText로 설정된다', async () => {
    mockedTodoApi.refineText.mockRejectedValue(new Error('AI Error'));

    const { result } = renderHook(() =>
      useVoiceTodoSession({ todoDate: '2026-04-04' }),
    );

    act(() => {
      result.current.addDraft('장보기');
    });

    await waitFor(() => {
      expect(result.current.drafts[0].status).toBe(DraftTodoStatus.ERROR);
    });

    expect(result.current.drafts[0].refinedText).toBe('장보기');
  });

  it('removeDraft 호출 시 해당 draft를 제거한다', async () => {
    mockedTodoApi.refineText.mockResolvedValue({ refinedText: '장보기' });

    const { result } = renderHook(() =>
      useVoiceTodoSession({ todoDate: '2026-04-04' }),
    );

    act(() => {
      result.current.addDraft('장보기');
    });

    await waitFor(() => {
      expect(result.current.drafts).toHaveLength(1);
    });

    act(() => {
      result.current.removeDraft(result.current.drafts[0].id);
    });

    expect(result.current.drafts).toHaveLength(0);
  });

  it('confirmAll 호출 시 batchCreateTodos를 호출한다', async () => {
    mockedTodoApi.refineText.mockResolvedValue({
      refinedText: '내일까지 장보기',
    });
    mockedTodoApi.batchCreateTodos.mockResolvedValue({
      created: [
        {
          id: 'todo-1',
          content: '내일까지 장보기',
          todoDate: '2026-04-04',
          status: 'ACTIVE' as const,
          isCarriedOver: false,
          memos: [],
          createdAt: '2026-04-04T10:00:00.000Z',
          updatedAt: '2026-04-04T10:00:00.000Z',
        },
      ],
    });

    const { result } = renderHook(() =>
      useVoiceTodoSession({ todoDate: '2026-04-04' }),
    );

    act(() => {
      result.current.addDraft('장보기 가야 돼 내일까지');
    });

    await waitFor(() => {
      expect(result.current.drafts[0].status).toBe(DraftTodoStatus.READY);
    });

    await act(async () => {
      await result.current.confirmAll();
    });

    expect(mockedTodoApi.batchCreateTodos).toHaveBeenCalledWith({
      todos: [{ content: '내일까지 장보기', todoDate: '2026-04-04' }],
    });
  });

  it('confirmAll 실패 시 에러를 throw한다', async () => {
    mockedTodoApi.refineText.mockResolvedValue({ refinedText: '장보기' });
    mockedTodoApi.batchCreateTodos.mockRejectedValue(new Error('Batch Error'));

    const { result } = renderHook(() =>
      useVoiceTodoSession({ todoDate: '2026-04-04' }),
    );

    act(() => {
      result.current.addDraft('장보기');
    });

    await waitFor(() => {
      expect(result.current.drafts[0].status).toBe(DraftTodoStatus.READY);
    });

    await expect(
      act(async () => {
        await result.current.confirmAll();
      }),
    ).rejects.toThrow('Batch Error');
  });

  it('confirmAll 호출 시 REFINING 상태인 draft는 rawText로 폴백하여 포함한다', async () => {
    mockedTodoApi.refineText.mockReturnValue(new Promise(() => {}));
    mockedTodoApi.batchCreateTodos.mockResolvedValue({ created: [] });

    const { result } = renderHook(() =>
      useVoiceTodoSession({ todoDate: '2026-04-04' }),
    );

    act(() => {
      result.current.addDraft('장보기');
    });

    expect(result.current.drafts[0].status).toBe(DraftTodoStatus.REFINING);

    await act(async () => {
      await result.current.confirmAll();
    });

    expect(mockedTodoApi.batchCreateTodos).toHaveBeenCalledWith({
      todos: [{ content: '장보기', todoDate: '2026-04-04' }],
    });
  });
});
