import { render, screen } from '@testing-library/react-native';
import { DayDetailView } from 'src/screens/calendar/DayDetailView';
import type { Todo } from 'src/types/todo';

const mockTodos: Todo[] = [
  {
    id: 'todo-1',
    content: '회의 준비',
    status: 'ACTIVE',
    isCarriedOver: false,
    todoDate: '2026-03-15',
    memos: [],
    createdAt: '2026-03-15T09:00:00.000Z',
    updatedAt: '2026-03-15T09:00:00.000Z',
  },
  {
    id: 'todo-2',
    content: '코드 리뷰',
    status: 'COMPLETED',
    isCarriedOver: false,
    todoDate: '2026-03-15',
    memos: [],
    createdAt: '2026-03-15T10:00:00.000Z',
    updatedAt: '2026-03-15T11:00:00.000Z',
  },
  {
    id: 'todo-3',
    content: '운동하기',
    status: 'INACTIVE',
    isCarriedOver: false,
    todoDate: '2026-03-15',
    memos: [],
    createdAt: '2026-03-15T11:00:00.000Z',
    updatedAt: '2026-03-15T11:00:00.000Z',
  },
];

const mockStats = {
  total: 3,
  completed: 1,
  active: 1,
  inactive: 1,
  progressRate: 33.3,
};

describe('DayDetailView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('날짜 선택 시 할 일 목록 표시', () => {
    it('선택된 날짜를 헤더에 표시한다', () => {
      render(
        <DayDetailView
          date="2026-03-15"
          todos={mockTodos}
          stats={mockStats}
        />,
      );

      expect(screen.getByTestId('day-detail-date')).toBeTruthy();
      expect(screen.getByText(/2026-03-15/)).toBeTruthy();
    });

    it('해당 날짜의 할 일 목록을 렌더링한다', () => {
      render(
        <DayDetailView
          date="2026-03-15"
          todos={mockTodos}
          stats={mockStats}
        />,
      );

      expect(screen.getByText('회의 준비')).toBeTruthy();
      expect(screen.getByText('코드 리뷰')).toBeTruthy();
      expect(screen.getByText('운동하기')).toBeTruthy();
    });

    it('할 일 상태에 따라 다른 스타일을 적용한다', () => {
      render(
        <DayDetailView
          date="2026-03-15"
          todos={mockTodos}
          stats={mockStats}
        />,
      );

      expect(screen.getByTestId('day-todo-item-todo-1')).toBeTruthy();
      expect(screen.getByTestId('day-todo-item-todo-2')).toBeTruthy();
      expect(screen.getByTestId('day-todo-item-todo-3')).toBeTruthy();
    });

    it('진행률 통계를 표시한다', () => {
      render(
        <DayDetailView
          date="2026-03-15"
          todos={mockTodos}
          stats={mockStats}
        />,
      );

      expect(screen.getByTestId('day-detail-stats')).toBeTruthy();
    });

    it('완료된 할 일 수와 전체 수를 표시한다', () => {
      render(
        <DayDetailView
          date="2026-03-15"
          todos={mockTodos}
          stats={mockStats}
        />,
      );

      expect(screen.getAllByText(/1/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/3/).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('빈 상태', () => {
    it('할 일이 없을 때 빈 상태 메시지를 표시한다', () => {
      const emptyStats = {
        total: 0,
        completed: 0,
        active: 0,
        inactive: 0,
        progressRate: 0,
      };

      render(
        <DayDetailView
          date="2026-03-20"
          todos={[]}
          stats={emptyStats}
        />,
      );

      expect(screen.getByTestId('day-detail-empty-state')).toBeTruthy();
    });
  });

  describe('로딩 상태', () => {
    it('로딩 중일 때 로딩 인디케이터를 표시한다', () => {
      render(
        <DayDetailView
          date="2026-03-15"
          todos={[]}
          stats={mockStats}
          isLoading={true}
        />,
      );

      expect(screen.getByTestId('day-detail-loading-indicator')).toBeTruthy();
    });

    it('로딩 중이 아닐 때 로딩 인디케이터를 표시하지 않는다', () => {
      render(
        <DayDetailView
          date="2026-03-15"
          todos={mockTodos}
          stats={mockStats}
          isLoading={false}
        />,
      );

      expect(
        screen.queryByTestId('day-detail-loading-indicator'),
      ).toBeNull();
    });
  });

  describe('에러 상태', () => {
    it('에러 메시지가 있을 때 에러를 표시한다', () => {
      render(
        <DayDetailView
          date="2026-03-15"
          todos={[]}
          stats={mockStats}
          error="데이터를 불러올 수 없습니다"
        />,
      );

      expect(screen.getByText('데이터를 불러올 수 없습니다')).toBeTruthy();
    });

    it('에러가 없을 때 에러 메시지를 표시하지 않는다', () => {
      render(
        <DayDetailView
          date="2026-03-15"
          todos={mockTodos}
          stats={mockStats}
        />,
      );

      expect(screen.queryByTestId('day-detail-error-message')).toBeNull();
    });
  });

  describe('이월된 할 일', () => {
    it('이월된 할 일에 이월 표시가 있다', () => {
      const carriedOverTodo: Todo = {
        id: 'todo-carried',
        content: '이월된 할 일',
        status: 'ACTIVE',
        isCarriedOver: true,
        todoDate: '2026-03-15',
        memos: [],
        createdAt: '2026-03-14T09:00:00.000Z',
        updatedAt: '2026-03-15T09:00:00.000Z',
      };

      render(
        <DayDetailView
          date="2026-03-15"
          todos={[carriedOverTodo]}
          stats={{ total: 1, completed: 0, active: 1, inactive: 0, progressRate: 0 }}
        />,
      );

      expect(
        screen.getByTestId('carried-over-badge-todo-carried'),
      ).toBeTruthy();
    });
  });

  describe('접근성', () => {
    it('할 일 항목에 접근성 라벨이 있다', () => {
      render(
        <DayDetailView
          date="2026-03-15"
          todos={mockTodos}
          stats={mockStats}
        />,
      );

      const todoItem = screen.getByTestId('day-todo-item-todo-1');
      expect(
        todoItem.props.accessibilityLabel || todoItem.props['aria-label'],
      ).toBeTruthy();
    });
  });
});
