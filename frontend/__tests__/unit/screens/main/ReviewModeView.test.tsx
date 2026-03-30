import { render, screen } from '@testing-library/react-native';
import { ReviewModeView } from 'src/screens/main/ReviewModeView';
import type { Todo } from 'src/types/todo';

const baseTodo: Todo = {
  id: 'todo-1',
  content: '회의 준비',
  status: 'ACTIVE',
  isCarriedOver: false,
  todoDate: '2026-03-30',
  memos: [],
  createdAt: '2026-03-30T09:00:00.000Z',
  updatedAt: '2026-03-30T09:00:00.000Z',
};

const completedTodo: Todo = {
  ...baseTodo,
  id: 'todo-2',
  content: '코드 리뷰',
  status: 'COMPLETED',
};

const inactiveTodo: Todo = {
  ...baseTodo,
  id: 'todo-3',
  content: '운동하기',
  status: 'INACTIVE',
};

const carriedOverTodo: Todo = {
  ...baseTodo,
  id: 'todo-4',
  content: '이월된 항목',
  status: 'CARRIED_OVER',
  isCarriedOver: true,
};

describe('ReviewModeView', () => {
  const defaultStats = {
    total: 4,
    completed: 1,
    active: 1,
    inactive: 1,
    progressRate: 25,
  };

  const allTodos = [baseTodo, completedTodo, inactiveTodo, carriedOverTodo];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('진행률 표시', () => {
    it('진행률 바를 렌더링한다', () => {
      render(<ReviewModeView todos={allTodos} stats={defaultStats} />);

      expect(screen.getByTestId('review-progress-bar')).toBeTruthy();
    });

    it('진행률 퍼센트를 표시한다', () => {
      render(<ReviewModeView todos={allTodos} stats={defaultStats} />);

      expect(screen.getByTestId('review-progress-rate')).toBeTruthy();
      expect(screen.getByText(/25%/)).toBeTruthy();
    });

    it('완료 수 / 전체 수를 표시한다', () => {
      render(<ReviewModeView todos={allTodos} stats={defaultStats} />);

      expect(screen.getByText(/1/)).toBeTruthy();
      expect(screen.getByText(/4/)).toBeTruthy();
    });

    it('100% 진행률일 때 완료 상태를 표시한다', () => {
      const allCompletedStats = {
        total: 2,
        completed: 2,
        active: 0,
        inactive: 0,
        progressRate: 100,
      };
      const completedTodos = [
        completedTodo,
        { ...completedTodo, id: 'todo-5', content: '다른 완료 항목' },
      ];

      render(<ReviewModeView todos={completedTodos} stats={allCompletedStats} />);

      expect(screen.getByText(/100%/)).toBeTruthy();
    });

    it('0% 진행률(할 일 없음)일 때 빈 상태를 표시한다', () => {
      const emptyStats = { total: 0, completed: 0, active: 0, inactive: 0, progressRate: 0 };

      render(<ReviewModeView todos={[]} stats={emptyStats} />);

      expect(screen.getByText(/0%/)).toBeTruthy();
    });
  });

  describe('완료/미완료 분리', () => {
    it('완료된 항목 섹션을 렌더링한다', () => {
      render(<ReviewModeView todos={allTodos} stats={defaultStats} />);

      expect(screen.getByTestId('review-completed-section')).toBeTruthy();
    });

    it('미완료 항목 섹션을 렌더링한다', () => {
      render(<ReviewModeView todos={allTodos} stats={defaultStats} />);

      expect(screen.getByTestId('review-incomplete-section')).toBeTruthy();
    });

    it('완료된 항목만 완료 섹션에 표시된다', () => {
      render(<ReviewModeView todos={allTodos} stats={defaultStats} />);

      const completedSection = screen.getByTestId('review-completed-section');
      expect(completedSection).toBeTruthy();
      expect(screen.getByText('코드 리뷰')).toBeTruthy();
    });

    it('미완료 항목(ACTIVE, INACTIVE)이 미완료 섹션에 표시된다', () => {
      render(<ReviewModeView todos={allTodos} stats={defaultStats} />);

      const incompleteSection = screen.getByTestId('review-incomplete-section');
      expect(incompleteSection).toBeTruthy();
      expect(screen.getByText('회의 준비')).toBeTruthy();
      expect(screen.getByText('운동하기')).toBeTruthy();
    });

    it('CARRIED_OVER 항목은 이월 항목으로 구분 표시된다', () => {
      render(<ReviewModeView todos={allTodos} stats={defaultStats} />);

      expect(screen.getByText('이월된 항목')).toBeTruthy();
    });
  });

  describe('상태 변경 시 재계산', () => {
    it('stats 변경 시 진행률이 업데이트된다', () => {
      const { rerender } = render(
        <ReviewModeView todos={allTodos} stats={defaultStats} />,
      );

      const updatedStats = { ...defaultStats, completed: 3, progressRate: 75 };
      rerender(<ReviewModeView todos={allTodos} stats={updatedStats} />);

      expect(screen.getByText(/75%/)).toBeTruthy();
    });

    it('todos 변경 시 섹션 내용이 업데이트된다', () => {
      const { rerender } = render(
        <ReviewModeView todos={[baseTodo]} stats={{ total: 1, completed: 0, active: 1, inactive: 0, progressRate: 0 }} />,
      );

      const updatedTodos = [{ ...baseTodo, status: 'COMPLETED' as const }];
      const updatedStats = { total: 1, completed: 1, active: 0, inactive: 0, progressRate: 100 };
      rerender(<ReviewModeView todos={updatedTodos} stats={updatedStats} />);

      expect(screen.getByText(/100%/)).toBeTruthy();
    });
  });

  describe('접근성', () => {
    it('진행률 영역에 접근성 라벨이 있다', () => {
      render(<ReviewModeView todos={allTodos} stats={defaultStats} />);

      const progressBar = screen.getByTestId('review-progress-bar');
      expect(
        progressBar.props.accessibilityLabel ||
        progressBar.props['aria-label'] ||
        progressBar.props.accessibilityRole,
      ).toBeTruthy();
    });
  });
});
