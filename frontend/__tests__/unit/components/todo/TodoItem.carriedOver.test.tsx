import { render, screen } from '@testing-library/react-native';
import { TodoItem } from 'src/components/todo/TodoItem';
import type { Todo } from 'src/types/todo';

const baseCarriedOverTodo: Todo = {
  id: 'todo-carried-1',
  content: '어제 미완료 항목',
  status: 'ACTIVE',
  isCarriedOver: true,
  todoDate: '2026-03-30',
  memos: [],
  createdAt: '2026-03-30T00:00:00.000Z',
  updatedAt: '2026-03-30T00:00:00.000Z',
};

const normalTodo: Todo = {
  ...baseCarriedOverTodo,
  id: 'todo-normal-1',
  content: '일반 항목',
  isCarriedOver: false,
};

const completedCarriedOverTodo: Todo = {
  ...baseCarriedOverTodo,
  id: 'todo-carried-2',
  content: '이월 후 완료된 항목',
  status: 'COMPLETED',
};

describe('TodoItem 이월 뱃지', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isCarriedOver 뱃지 표시', () => {
    it('isCarriedOver가 true인 항목에 이월 뱃지를 표시한다', () => {
      render(<TodoItem todo={baseCarriedOverTodo} />);

      expect(
        screen.getByTestId('carried-over-badge-todo-carried-1'),
      ).toBeTruthy();
    });

    it('isCarriedOver가 false인 항목에 이월 뱃지를 표시하지 않는다', () => {
      render(<TodoItem todo={normalTodo} />);

      expect(
        screen.queryByTestId('carried-over-badge-todo-normal-1'),
      ).toBeNull();
    });

    it('이월 뱃지에 시각적 표시(텍스트 또는 아이콘)가 있다', () => {
      render(<TodoItem todo={baseCarriedOverTodo} />);

      const badge = screen.getByTestId('carried-over-badge-todo-carried-1');
      expect(badge).toBeTruthy();
    });
  });

  describe('이월 항목의 상태별 표시', () => {
    it('이월된 ACTIVE 항목에 뱃지와 체크박스를 모두 표시한다', () => {
      render(<TodoItem todo={baseCarriedOverTodo} />);

      expect(
        screen.getByTestId('carried-over-badge-todo-carried-1'),
      ).toBeTruthy();
      expect(screen.getByTestId('todo-checkbox-todo-carried-1')).toBeTruthy();
    });

    it('이월 후 완료된 항목에도 이월 뱃지를 표시한다', () => {
      render(<TodoItem todo={completedCarriedOverTodo} />);

      expect(
        screen.getByTestId('carried-over-badge-todo-carried-2'),
      ).toBeTruthy();
    });

    it('이월된 항목의 내용을 정상적으로 표시한다', () => {
      render(<TodoItem todo={baseCarriedOverTodo} />);

      expect(screen.getByText('어제 미완료 항목')).toBeTruthy();
    });
  });

  describe('접근성', () => {
    it('이월 뱃지에 접근성 라벨이 있다', () => {
      render(<TodoItem todo={baseCarriedOverTodo} />);

      const badge = screen.getByTestId('carried-over-badge-todo-carried-1');
      expect(
        badge.props.accessibilityLabel || badge.props['aria-label'],
      ).toBeTruthy();
    });

    it('이월 항목의 접근성 라벨에 이월 정보가 포함된다', () => {
      render(<TodoItem todo={baseCarriedOverTodo} />);

      const item = screen.getByTestId('todo-item-todo-carried-1');
      const label =
        item.props.accessibilityLabel || item.props['aria-label'] || '';
      expect(label).toMatch(/이월/);
    });
  });
});
