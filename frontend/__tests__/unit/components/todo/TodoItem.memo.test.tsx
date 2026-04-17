import { render } from '@testing-library/react-native';
import { TodoItem } from 'src/components/todo/TodoItem';
import type { Todo } from 'src/types/todo';

const mockTodo: Todo = {
  id: 'todo-1',
  content: '회의 준비',
  status: 'ACTIVE',
  isCarriedOver: false,
  todoDate: '2026-03-28',
  memos: [],
  createdAt: '2026-03-28T09:00:00.000Z',
  updatedAt: '2026-03-28T09:00:00.000Z',
};

describe('TodoItem React.memo', () => {
  it('should render correctly when wrapped in React.memo', () => {
    const { getByText } = render(<TodoItem todo={mockTodo} />);
    expect(getByText('회의 준비')).toBeTruthy();
  });

  it('should be wrapped in React.memo (has compare function or memo $$typeof)', () => {
    // React.memo components have $$typeof = Symbol(react.memo)
    const memoComponent = TodoItem as unknown as {
      $$typeof: symbol;
      type: unknown;
    };
    expect(memoComponent.$$typeof).toBeDefined();
    expect(String(memoComponent.$$typeof)).toContain('memo');
  });
});
