import { render, fireEvent, screen } from '@testing-library/react-native';
import { MemoSection } from 'src/components/todo/MemoSection';
import type { TodoMemo } from 'src/types/todo';

const mockMemos: TodoMemo[] = [
  {
    id: 'memo-1',
    todoId: 'todo-1',
    content: '첫 번째 메모',
    createdAt: '2026-03-31T09:00:00.000Z',
    updatedAt: '2026-03-31T09:00:00.000Z',
  },
  {
    id: 'memo-2',
    todoId: 'todo-1',
    content: '두 번째 메모',
    createdAt: '2026-03-31T10:00:00.000Z',
    updatedAt: '2026-03-31T10:00:00.000Z',
  },
];

describe('MemoSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('렌더링', () => {
    it('메모 목록을 표시한다', () => {
      render(<MemoSection todoId="todo-1" memos={mockMemos} />);

      expect(screen.getByText('첫 번째 메모')).toBeTruthy();
      expect(screen.getByText('두 번째 메모')).toBeTruthy();
    });

    it('메모가 없을 때 빈 상태를 표시한다', () => {
      render(<MemoSection todoId="todo-1" memos={[]} />);

      expect(screen.queryByTestId('memo-item-memo-1')).toBeNull();
    });

    it('메모 입력 필드를 렌더링한다', () => {
      render(<MemoSection todoId="todo-1" memos={[]} />);

      expect(screen.getByTestId('memo-input')).toBeTruthy();
    });

    it('메모 추가 버튼을 렌더링한다', () => {
      render(<MemoSection todoId="todo-1" memos={[]} />);

      expect(screen.getByTestId('memo-add-button')).toBeTruthy();
    });

    it('각 메모 항목에 testID가 부여된다', () => {
      render(<MemoSection todoId="todo-1" memos={mockMemos} />);

      expect(screen.getByTestId('memo-item-memo-1')).toBeTruthy();
      expect(screen.getByTestId('memo-item-memo-2')).toBeTruthy();
    });
  });

  describe('메모 추가', () => {
    it('내용 입력 후 추가 버튼 탭 시 onAddMemo 콜백이 호출된다', () => {
      const mockOnAddMemo = jest.fn();
      render(
        <MemoSection todoId="todo-1" memos={[]} onAddMemo={mockOnAddMemo} />,
      );

      const input = screen.getByTestId('memo-input');
      fireEvent.changeText(input, '새 메모');
      fireEvent.press(screen.getByTestId('memo-add-button'));

      expect(mockOnAddMemo).toHaveBeenCalledWith('새 메모');
    });

    it('메모 추가 후 입력 필드가 초기화된다', () => {
      const mockOnAddMemo = jest.fn();
      render(
        <MemoSection todoId="todo-1" memos={[]} onAddMemo={mockOnAddMemo} />,
      );

      const input = screen.getByTestId('memo-input');
      fireEvent.changeText(input, '새 메모');
      fireEvent.press(screen.getByTestId('memo-add-button'));

      expect(input.props.value).toBe('');
    });

    it('빈 내용으로는 메모를 추가하지 않는다', () => {
      const mockOnAddMemo = jest.fn();
      render(
        <MemoSection todoId="todo-1" memos={[]} onAddMemo={mockOnAddMemo} />,
      );

      fireEvent.press(screen.getByTestId('memo-add-button'));

      expect(mockOnAddMemo).not.toHaveBeenCalled();
    });

    it('공백만 입력된 경우 메모를 추가하지 않는다', () => {
      const mockOnAddMemo = jest.fn();
      render(
        <MemoSection todoId="todo-1" memos={[]} onAddMemo={mockOnAddMemo} />,
      );

      const input = screen.getByTestId('memo-input');
      fireEvent.changeText(input, '   ');
      fireEvent.press(screen.getByTestId('memo-add-button'));

      expect(mockOnAddMemo).not.toHaveBeenCalled();
    });
  });

  describe('메모 수정', () => {
    it('메모 항목 탭 시 수정 모드로 전환된다', () => {
      render(<MemoSection todoId="todo-1" memos={mockMemos} />);

      fireEvent.press(screen.getByTestId('memo-item-memo-1'));

      expect(screen.getByTestId('memo-edit-input-memo-1')).toBeTruthy();
    });

    it('수정 완료 시 onUpdateMemo 콜백이 호출된다', () => {
      const mockOnUpdateMemo = jest.fn();
      render(
        <MemoSection
          todoId="todo-1"
          memos={mockMemos}
          onUpdateMemo={mockOnUpdateMemo}
        />,
      );

      fireEvent.press(screen.getByTestId('memo-item-memo-1'));
      const editInput = screen.getByTestId('memo-edit-input-memo-1');
      fireEvent.changeText(editInput, '수정된 메모');
      fireEvent.press(screen.getByTestId('memo-edit-confirm-memo-1'));

      expect(mockOnUpdateMemo).toHaveBeenCalledWith('memo-1', '수정된 메모');
    });
  });

  describe('메모 삭제', () => {
    it('삭제 버튼 탭 시 onDeleteMemo 콜백이 호출된다', () => {
      const mockOnDeleteMemo = jest.fn();
      render(
        <MemoSection
          todoId="todo-1"
          memos={mockMemos}
          onDeleteMemo={mockOnDeleteMemo}
        />,
      );

      fireEvent.press(screen.getByTestId('memo-delete-memo-1'));

      expect(mockOnDeleteMemo).toHaveBeenCalledWith('memo-1');
    });

    it('각 메모 항목에 삭제 버튼이 있다', () => {
      render(
        <MemoSection
          todoId="todo-1"
          memos={mockMemos}
          onDeleteMemo={jest.fn()}
        />,
      );

      expect(screen.getByTestId('memo-delete-memo-1')).toBeTruthy();
      expect(screen.getByTestId('memo-delete-memo-2')).toBeTruthy();
    });
  });
});
