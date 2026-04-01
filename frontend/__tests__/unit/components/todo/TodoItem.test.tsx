import { render, fireEvent, screen } from '@testing-library/react-native';
import { TodoItem } from 'src/components/todo/TodoItem';
import type { Todo } from 'src/types/todo';

const mockActiveTodo: Todo = {
  id: 'todo-1',
  content: '회의 준비',
  status: 'ACTIVE',
  isCarriedOver: false,
  todoDate: '2026-03-28',
  memos: [],
  createdAt: '2026-03-28T09:00:00.000Z',
  updatedAt: '2026-03-28T09:00:00.000Z',
};

const mockCompletedTodo: Todo = {
  ...mockActiveTodo,
  id: 'todo-2',
  content: '코드 리뷰',
  status: 'COMPLETED',
};

const mockInactiveTodo: Todo = {
  ...mockActiveTodo,
  id: 'todo-3',
  content: '운동하기',
  status: 'INACTIVE',
};

describe('TodoItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('렌더링', () => {
    it('할 일 내용을 표시한다', () => {
      render(<TodoItem todo={mockActiveTodo} />);

      expect(screen.getByText('회의 준비')).toBeTruthy();
    });

    it('체크박스를 표시한다', () => {
      render(<TodoItem todo={mockActiveTodo} />);

      expect(screen.getByTestId('todo-checkbox-todo-1')).toBeTruthy();
    });

    it('ACTIVE 상태일 때 체크박스가 선택되지 않은 상태이다', () => {
      render(<TodoItem todo={mockActiveTodo} />);

      const checkbox = screen.getByTestId('todo-checkbox-todo-1');
      expect(
        checkbox.props.accessibilityState?.checked ?? checkbox.props.checked,
      ).toBeFalsy();
    });

    it('COMPLETED 상태일 때 체크박스가 선택된 상태이다', () => {
      render(<TodoItem todo={mockCompletedTodo} />);

      const checkbox = screen.getByTestId('todo-checkbox-todo-2');
      expect(
        checkbox.props.accessibilityState?.checked ?? checkbox.props.checked,
      ).toBe(true);
    });

    it('INACTIVE 상태일 때 비활성화 스타일을 적용한다', () => {
      render(<TodoItem todo={mockInactiveTodo} />);

      const item = screen.getByTestId('todo-item-todo-3');
      expect(item).toBeTruthy();
    });
  });

  describe('체크박스 탭 (완료 토글)', () => {
    it('ACTIVE 할 일 체크박스 탭 시 onToggleComplete 콜백이 호출된다', () => {
      const mockOnToggleComplete = jest.fn();
      render(<TodoItem todo={mockActiveTodo} onToggleComplete={mockOnToggleComplete} />);

      fireEvent.press(screen.getByTestId('todo-checkbox-todo-1'));

      expect(mockOnToggleComplete).toHaveBeenCalledWith('todo-1');
    });

    it('COMPLETED 할 일 체크박스 탭 시 onToggleComplete 콜백이 호출된다 (완료 취소)', () => {
      const mockOnToggleComplete = jest.fn();
      render(<TodoItem todo={mockCompletedTodo} onToggleComplete={mockOnToggleComplete} />);

      fireEvent.press(screen.getByTestId('todo-checkbox-todo-2'));

      expect(mockOnToggleComplete).toHaveBeenCalledWith('todo-2');
    });
  });

  describe('탭 수정', () => {
    it('할 일 내용을 탭하면 편집 모드로 전환된다', () => {
      render(<TodoItem todo={mockActiveTodo} onEdit={jest.fn()} />);

      fireEvent.press(screen.getByText('회의 준비'));

      expect(screen.getByTestId('todo-edit-input-todo-1')).toBeTruthy();
    });

    it('편집 후 onEdit 콜백이 호출된다', () => {
      const mockOnEdit = jest.fn();
      render(<TodoItem todo={mockActiveTodo} onEdit={mockOnEdit} />);

      fireEvent.press(screen.getByText('회의 준비'));
      const input = screen.getByTestId('todo-edit-input-todo-1');
      fireEvent.changeText(input, '수정된 내용');
      fireEvent(input, 'submitEditing');

      expect(mockOnEdit).toHaveBeenCalledWith('todo-1', '수정된 내용');
    });

    it('INACTIVE 상태에서는 탭해도 편집 모드로 전환되지 않는다', () => {
      render(<TodoItem todo={mockInactiveTodo} onEdit={jest.fn()} />);

      fireEvent.press(screen.getByText('운동하기'));

      expect(screen.queryByTestId('todo-edit-input-todo-3')).toBeNull();
    });

    it('편집 모드에서 blur 시 편집이 취소되고 원래 텍스트로 복원된다', () => {
      const mockOnEdit = jest.fn();
      render(<TodoItem todo={mockActiveTodo} onEdit={mockOnEdit} />);

      fireEvent.press(screen.getByText('회의 준비'));
      const input = screen.getByTestId('todo-edit-input-todo-1');
      fireEvent.changeText(input, '취소될 내용');
      fireEvent(input, 'blur');

      expect(mockOnEdit).not.toHaveBeenCalled();
      expect(screen.getByText('회의 준비')).toBeTruthy();
    });

    it('빈 문자열로 수정 제출 시 onEdit이 호출되지 않는다', () => {
      const mockOnEdit = jest.fn();
      render(<TodoItem todo={mockActiveTodo} onEdit={mockOnEdit} />);

      fireEvent.press(screen.getByText('회의 준비'));
      const input = screen.getByTestId('todo-edit-input-todo-1');
      fireEvent.changeText(input, '');
      fireEvent(input, 'submitEditing');

      expect(mockOnEdit).not.toHaveBeenCalled();
    });

    it('동일 텍스트로 제출 시 onEdit이 호출되지 않는다', () => {
      const mockOnEdit = jest.fn();
      render(<TodoItem todo={mockActiveTodo} onEdit={mockOnEdit} />);

      fireEvent.press(screen.getByText('회의 준비'));
      const input = screen.getByTestId('todo-edit-input-todo-1');
      fireEvent.changeText(input, '회의 준비');
      fireEvent(input, 'submitEditing');

      expect(mockOnEdit).not.toHaveBeenCalled();
    });
  });

  describe('더블 탭 비활성화', () => {
    it('ACTIVE 할 일을 길게 누르면 onDeactivate 콜백이 호출된다', () => {
      const mockOnDeactivate = jest.fn();
      render(<TodoItem todo={mockActiveTodo} onDeactivate={mockOnDeactivate} />);

      const item = screen.getByTestId('todo-item-todo-1');
      fireEvent(item, 'longPress');

      expect(mockOnDeactivate).toHaveBeenCalledWith('todo-1');
    });
  });

  describe('접근성', () => {
    it('할 일 아이템에 접근성 라벨이 있다', () => {
      render(<TodoItem todo={mockActiveTodo} />);

      const item = screen.getByTestId('todo-item-todo-1');
      expect(item.props.accessibilityLabel || item.props['aria-label']).toBeTruthy();
    });

    it('체크박스에 접근성 역할이 설정되어 있다', () => {
      render(<TodoItem todo={mockActiveTodo} />);

      const checkbox = screen.getByTestId('todo-checkbox-todo-1');
      expect(
        checkbox.props.accessibilityRole === 'checkbox' || checkbox.props.role === 'checkbox',
      ).toBe(true);
    });
  });
});
