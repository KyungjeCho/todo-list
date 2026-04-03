import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { TodoItem } from 'src/components/todo/TodoItem';
import type { Todo } from 'src/types/todo';

jest.spyOn(Alert, 'alert');

const mockTodo: Todo = {
  id: 'todo-1',
  content: '회의 준비',
  status: 'ACTIVE',
  isCarriedOver: false,
  todoDate: '2026-04-02',
  memos: [
    {
      id: 'memo-1',
      todoId: 'todo-1',
      content: '자료 준비',
      createdAt: '2026-04-02T09:00:00.000Z',
      updatedAt: '2026-04-02T09:00:00.000Z',
    },
  ],
  createdAt: '2026-04-02T09:00:00.000Z',
  updatedAt: '2026-04-02T09:00:00.000Z',
};

const mockTodoNoMemos: Todo = {
  ...mockTodo,
  id: 'todo-2',
  content: '코드 리뷰',
  memos: [],
};

describe('TodoItem 확장 상태', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('확장/접기 토글', () => {
    it('isExpanded가 true일 때 확장 UI가 표시된다', () => {
      render(
        <TodoItem todo={mockTodo} isExpanded={true} onExpand={jest.fn()} />,
      );

      expect(screen.getByTestId('action-buttons-container')).toBeTruthy();
    });

    it('isExpanded가 false일 때 확장 UI가 숨겨진다', () => {
      render(
        <TodoItem todo={mockTodo} isExpanded={false} onExpand={jest.fn()} />,
      );

      expect(screen.queryByTestId('action-buttons-container')).toBeNull();
    });

    it('isExpanded가 undefined(기본)일 때 확장 UI가 숨겨진다', () => {
      render(<TodoItem todo={mockTodo} />);

      expect(screen.queryByTestId('action-buttons-container')).toBeNull();
    });

    it('아이템 탭 시 onExpand가 todo.id와 함께 호출된다', () => {
      const onExpand = jest.fn();
      render(
        <TodoItem todo={mockTodo} isExpanded={false} onExpand={onExpand} />,
      );

      fireEvent.press(screen.getByTestId('todo-item-todo-1'));

      expect(onExpand).toHaveBeenCalledWith('todo-1');
    });

    it('확장 상태에서 아이템 탭 시 onExpand가 null과 함께 호출된다 (접기)', () => {
      const onExpand = jest.fn();
      render(
        <TodoItem todo={mockTodo} isExpanded={true} onExpand={onExpand} />,
      );

      fireEvent.press(screen.getByTestId('todo-item-todo-1'));

      expect(onExpand).toHaveBeenCalledWith(null);
    });
  });

  describe('확장 시 스타일', () => {
    it('확장 시 배경색이 primaryLight(#EEF2FF)로 변경된다', () => {
      render(
        <TodoItem todo={mockTodo} isExpanded={true} onExpand={jest.fn()} />,
      );

      const item = screen.getByTestId('todo-item-todo-1');
      const flatStyle = Array.isArray(item.props.style)
        ? Object.assign({}, ...item.props.style)
        : item.props.style;
      expect(flatStyle.backgroundColor).toBe('#EEF2FF');
    });

    it('확장 시 좌측 3px primary(#6366F1) border가 적용된다', () => {
      render(
        <TodoItem todo={mockTodo} isExpanded={true} onExpand={jest.fn()} />,
      );

      const item = screen.getByTestId('todo-item-todo-1');
      const flatStyle = Array.isArray(item.props.style)
        ? Object.assign({}, ...item.props.style)
        : item.props.style;
      expect(flatStyle.borderLeftWidth).toBe(3);
      expect(flatStyle.borderLeftColor).toBe('#6366F1');
    });
  });

  describe('확장 시 액션 버튼 표시', () => {
    it('확장 시 TodoActionButtons가 렌더링된다', () => {
      render(
        <TodoItem
          todo={mockTodo}
          isExpanded={true}
          onExpand={jest.fn()}
          onDelete={jest.fn()}
          onDeactivate={jest.fn()}
          onAddMemo={jest.fn()}
        />,
      );

      expect(screen.getByTestId('action-delete-button')).toBeTruthy();
      expect(screen.getByTestId('action-deactivate-button')).toBeTruthy();
      expect(screen.getByTestId('action-add-memo-button')).toBeTruthy();
    });

    it('삭제 버튼 탭 시 삭제 확인 Alert가 표시된다', () => {
      const onDelete = jest.fn();
      render(
        <TodoItem
          todo={mockTodo}
          isExpanded={true}
          onExpand={jest.fn()}
          onDelete={onDelete}
        />,
      );

      fireEvent.press(screen.getByTestId('action-delete-button'));

      expect(Alert.alert).toHaveBeenCalledWith(
        '삭제',
        expect.stringContaining('회의 준비'),
        expect.any(Array),
      );
    });

    it('비활성화 버튼 탭 시 onDeactivate가 todo.id와 함께 호출된다', () => {
      const onDeactivate = jest.fn();
      render(
        <TodoItem
          todo={mockTodo}
          isExpanded={true}
          onExpand={jest.fn()}
          onDeactivate={onDeactivate}
        />,
      );

      fireEvent.press(screen.getByTestId('action-deactivate-button'));

      expect(onDeactivate).toHaveBeenCalledWith('todo-1');
    });
  });

  describe('확장 시 메모 표시', () => {
    it('확장 시 메모가 있으면 MemoSection이 표시된다', () => {
      render(
        <TodoItem todo={mockTodo} isExpanded={true} onExpand={jest.fn()} />,
      );

      expect(screen.getByTestId('memo-section-todo-1')).toBeTruthy();
    });

    it('확장 시 메모가 없어도 MemoSection이 표시된다', () => {
      render(
        <TodoItem
          todo={mockTodoNoMemos}
          isExpanded={true}
          onExpand={jest.fn()}
        />,
      );

      expect(screen.getByTestId('memo-section-todo-2')).toBeTruthy();
    });
  });

  describe('chevron-up 접기', () => {
    it('확장 시 chevron-up 아이콘이 표시된다', () => {
      render(
        <TodoItem todo={mockTodo} isExpanded={true} onExpand={jest.fn()} />,
      );

      expect(screen.getByTestId('chevron-up-todo-1')).toBeTruthy();
    });

    it('접힌 상태에서는 chevron-up이 표시되지 않는다', () => {
      render(
        <TodoItem todo={mockTodo} isExpanded={false} onExpand={jest.fn()} />,
      );

      expect(screen.queryByTestId('chevron-up-todo-1')).toBeNull();
    });

    it('chevron-up 탭 시 onExpand(null)이 호출된다', () => {
      const onExpand = jest.fn();
      render(
        <TodoItem todo={mockTodo} isExpanded={true} onExpand={onExpand} />,
      );

      fireEvent.press(screen.getByTestId('chevron-up-todo-1'));

      expect(onExpand).toHaveBeenCalledWith(null);
    });
  });

  describe('Swipeable/LongPress 제거 검증', () => {
    it('Swipeable 삭제 액션이 렌더링되지 않는다', () => {
      render(
        <TodoItem
          todo={mockTodo}
          isExpanded={false}
          onExpand={jest.fn()}
          onDelete={jest.fn()}
        />,
      );

      expect(screen.queryByTestId('todo-delete-todo-1')).toBeNull();
    });
  });
});
