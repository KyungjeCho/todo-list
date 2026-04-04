import { renderHook, act } from '@testing-library/react-native';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useShareTodo } from 'src/features/share/useShareTodo';
import type { Todo } from 'src/types/todo';

const ShareMock = {
  share: jest.fn().mockResolvedValue({ action: 'sharedAction' }),
};

jest.spyOn(Share, 'share').mockImplementation(ShareMock.share);
jest.spyOn(Clipboard, 'setStringAsync').mockResolvedValue(true);

const mockTodos: Todo[] = [
  {
    id: 'todo-1',
    todoDate: '2026-03-31',
    content: '운동하기',
    status: 'COMPLETED',
    isCarriedOver: false,
    memos: [],
    createdAt: '2026-03-31T09:00:00.000Z',
    updatedAt: '2026-03-31T09:00:00.000Z',
  },
  {
    id: 'todo-2',
    todoDate: '2026-03-31',
    content: '장보기',
    status: 'ACTIVE',
    isCarriedOver: false,
    memos: [],
    createdAt: '2026-03-31T10:00:00.000Z',
    updatedAt: '2026-03-31T10:00:00.000Z',
  },
];

describe('useShareTodo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('shareTodos', () => {
    it('할 일 목록으로 공유 데이터를 생성하고 OS 공유 시트를 호출한다', async () => {
      const { result } = renderHook(() => useShareTodo());

      await act(async () => {
        await result.current.shareTodos(mockTodos, '2026-03-31');
      });

      expect(ShareMock.share).toHaveBeenCalledTimes(1);
      expect(ShareMock.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('운동하기'),
        }),
      );
    });

    it('공유 메시지에 날짜가 포함된다', async () => {
      const { result } = renderHook(() => useShareTodo());

      await act(async () => {
        await result.current.shareTodos(mockTodos, '2026-03-31');
      });

      const shareCall = ShareMock.share.mock.calls[0][0] as { message: string };
      expect(shareCall.message).toContain('2026-03-31');
    });

    it('공유 메시지에 모든 할 일 항목이 포함된다', async () => {
      const { result } = renderHook(() => useShareTodo());

      await act(async () => {
        await result.current.shareTodos(mockTodos, '2026-03-31');
      });

      const shareCall = ShareMock.share.mock.calls[0][0] as { message: string };
      expect(shareCall.message).toContain('운동하기');
      expect(shareCall.message).toContain('장보기');
    });

    it('공유 중 isSharing 상태가 true가 된다', async () => {
      const { result } = renderHook(() => useShareTodo());

      expect(result.current.isSharing).toBe(false);

      let sharePromiseResolve: () => void;
      ShareMock.share.mockImplementationOnce(
        () =>
          new Promise<{ action: string }>((resolve) => {
            sharePromiseResolve = () => resolve({ action: 'sharedAction' });
          }),
      );

      let sharePromise: Promise<void>;
      act(() => {
        sharePromise = result.current.shareTodos(mockTodos, '2026-03-31');
      });

      expect(result.current.isSharing).toBe(true);

      await act(async () => {
        sharePromiseResolve!();
        await sharePromise!;
      });

      expect(result.current.isSharing).toBe(false);
    });

    it('공유 실패 시 에러를 반환한다', async () => {
      ShareMock.share.mockRejectedValueOnce(new Error('공유 실패'));

      const { result } = renderHook(() => useShareTodo());

      await act(async () => {
        await result.current.shareTodos(mockTodos, '2026-03-31');
      });

      expect(result.current.error).toBe('공유에 실패했습니다');
      expect(result.current.isSharing).toBe(false);
    });

    it('빈 할 일 목록은 공유하지 않는다', async () => {
      const { result } = renderHook(() => useShareTodo());

      await act(async () => {
        await result.current.shareTodos([], '2026-03-31');
      });

      expect(ShareMock.share).not.toHaveBeenCalled();
    });
  });

  describe('copyToClipboard', () => {
    it('클립보드에 복사한다', async () => {
      const { result } = renderHook(() => useShareTodo());

      await act(async () => {
        await result.current.copyToClipboard(mockTodos, '2026-03-31');
      });

      expect(Clipboard.setStringAsync).toHaveBeenCalledTimes(1);
      expect(ShareMock.share).not.toHaveBeenCalled();
    });

    it('클립보드에 복사된 내용에 할 일 항목이 포함된다', async () => {
      const { result } = renderHook(() => useShareTodo());

      await act(async () => {
        await result.current.copyToClipboard(mockTodos, '2026-03-31');
      });

      const copiedText = (Clipboard.setStringAsync as jest.Mock).mock
        .calls[0][0] as string;
      expect(copiedText).toContain('운동하기');
      expect(copiedText).toContain('장보기');
    });

    it('클립보드 복사 성공 시 copied 상태가 true가 된다', async () => {
      const { result } = renderHook(() => useShareTodo());

      await act(async () => {
        await result.current.copyToClipboard(mockTodos, '2026-03-31');
      });

      expect(result.current.copied).toBe(true);
    });

    it('클립보드 복사 실패 시 에러를 반환한다', async () => {
      (Clipboard.setStringAsync as jest.Mock).mockRejectedValueOnce(
        new Error('복사 실패'),
      );

      const { result } = renderHook(() => useShareTodo());

      await act(async () => {
        await result.current.copyToClipboard(mockTodos, '2026-03-31');
      });

      expect(result.current.error).toBe('클립보드 복사에 실패했습니다');
    });

    it('빈 할 일 목록은 복사하지 않는다', async () => {
      const { result } = renderHook(() => useShareTodo());

      await act(async () => {
        await result.current.copyToClipboard([], '2026-03-31');
      });

      expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
    });

    it('복사 성공 후 2초 뒤 copied 상태가 false로 돌아간다', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useShareTodo());

      await act(async () => {
        await result.current.copyToClipboard(mockTodos, '2026-03-31');
      });

      expect(result.current.copied).toBe(true);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.copied).toBe(false);

      jest.useRealTimers();
    });
  });
});
