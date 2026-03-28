import { render, fireEvent, screen } from '@testing-library/react-native';
import { MainScreen } from 'src/screens/main/MainScreen';
import type { Todo } from 'src/types/todo';

const mockTodos: Todo[] = [
  {
    id: 'todo-1',
    content: '회의 준비',
    status: 'ACTIVE',
    isCarriedOver: false,
    todoDate: '2026-03-28',
    memos: [],
    createdAt: '2026-03-28T09:00:00.000Z',
    updatedAt: '2026-03-28T09:00:00.000Z',
  },
  {
    id: 'todo-2',
    content: '코드 리뷰',
    status: 'COMPLETED',
    isCarriedOver: false,
    todoDate: '2026-03-28',
    memos: [],
    createdAt: '2026-03-28T10:00:00.000Z',
    updatedAt: '2026-03-28T10:00:00.000Z',
  },
  {
    id: 'todo-3',
    content: '운동하기',
    status: 'INACTIVE',
    isCarriedOver: false,
    todoDate: '2026-03-28',
    memos: [],
    createdAt: '2026-03-28T11:00:00.000Z',
    updatedAt: '2026-03-28T11:00:00.000Z',
  },
];

const mockStats = {
  total: 3,
  completed: 1,
  active: 1,
  inactive: 1,
  progressRate: 33.3,
};

describe('MainScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Plan 모드 렌더링', () => {
    it('Plan 모드를 나타내는 텍스트를 표시한다', () => {
      render(<MainScreen mode="PLAN" todos={mockTodos} stats={mockStats} />);

      expect(screen.getByText(/plan/i)).toBeTruthy();
    });

    it('할 일 목록을 렌더링한다', () => {
      render(<MainScreen mode="PLAN" todos={mockTodos} stats={mockStats} />);

      expect(screen.getByText('회의 준비')).toBeTruthy();
      expect(screen.getByText('코드 리뷰')).toBeTruthy();
      expect(screen.getByText('운동하기')).toBeTruthy();
    });

    it('진행률을 표시한다', () => {
      render(<MainScreen mode="PLAN" todos={mockTodos} stats={mockStats} />);

      expect(screen.getByTestId('progress-rate')).toBeTruthy();
    });
  });

  describe('Review 모드 렌더링', () => {
    it('Review 모드를 나타내는 텍스트를 표시한다', () => {
      render(<MainScreen mode="REVIEW" todos={mockTodos} stats={mockStats} />);

      expect(screen.getByText(/review/i)).toBeTruthy();
    });

    it('Review 모드에서도 할 일 목록을 렌더링한다', () => {
      render(<MainScreen mode="REVIEW" todos={mockTodos} stats={mockStats} />);

      expect(screen.getByText('회의 준비')).toBeTruthy();
    });
  });

  describe('모드 전환', () => {
    it('모드 전환 토글 버튼이 존재한다', () => {
      render(<MainScreen mode="PLAN" todos={mockTodos} stats={mockStats} onModeToggle={jest.fn()} />);

      expect(screen.getByTestId('mode-toggle-button')).toBeTruthy();
    });

    it('모드 전환 버튼 탭 시 onModeToggle 콜백이 호출된다', () => {
      const mockOnModeToggle = jest.fn();
      render(
        <MainScreen
          mode="PLAN"
          todos={mockTodos}
          stats={mockStats}
          onModeToggle={mockOnModeToggle}
        />,
      );

      fireEvent.press(screen.getByTestId('mode-toggle-button'));

      expect(mockOnModeToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('진행률 표시', () => {
    it('완료된 할 일 수를 표시한다', () => {
      render(<MainScreen mode="PLAN" todos={mockTodos} stats={mockStats} />);

      expect(screen.getByText(/1/)).toBeTruthy();
    });

    it('전체 할 일 수를 표시한다', () => {
      render(<MainScreen mode="PLAN" todos={mockTodos} stats={mockStats} />);

      expect(screen.getByText(/3/)).toBeTruthy();
    });

    it('진행률 퍼센트를 표시한다', () => {
      render(<MainScreen mode="PLAN" todos={mockTodos} stats={mockStats} />);

      expect(screen.getByTestId('progress-rate')).toBeTruthy();
    });

    it('할 일이 없을 때 0% 진행률을 표시한다', () => {
      const emptyStats = { total: 0, completed: 0, active: 0, inactive: 0, progressRate: 0 };
      render(<MainScreen mode="PLAN" todos={[]} stats={emptyStats} />);

      expect(screen.getByTestId('progress-rate')).toBeTruthy();
    });
  });

  describe('빈 상태 (empty state)', () => {
    it('할 일이 없을 때 빈 상태 메시지를 표시한다', () => {
      const emptyStats = { total: 0, completed: 0, active: 0, inactive: 0, progressRate: 0 };
      render(<MainScreen mode="PLAN" todos={[]} stats={emptyStats} />);

      expect(screen.getByTestId('empty-state')).toBeTruthy();
    });
  });

  describe('로딩 상태', () => {
    it('로딩 중일 때 로딩 인디케이터를 표시한다', () => {
      render(<MainScreen mode="PLAN" todos={[]} stats={mockStats} isLoading={true} />);

      expect(screen.getByTestId('main-loading-indicator')).toBeTruthy();
    });

    it('로딩 중이 아닐 때 로딩 인디케이터를 표시하지 않는다', () => {
      render(<MainScreen mode="PLAN" todos={mockTodos} stats={mockStats} isLoading={false} />);

      expect(screen.queryByTestId('main-loading-indicator')).toBeNull();
    });
  });

  describe('에러 상태', () => {
    it('에러 메시지가 있을 때 에러를 표시한다', () => {
      render(
        <MainScreen
          mode="PLAN"
          todos={[]}
          stats={mockStats}
          error="데이터를 불러올 수 없습니다"
        />,
      );

      expect(screen.getByText('데이터를 불러올 수 없습니다')).toBeTruthy();
    });

    it('에러가 없을 때 에러 메시지를 표시하지 않는다', () => {
      render(<MainScreen mode="PLAN" todos={mockTodos} stats={mockStats} />);

      expect(screen.queryByTestId('main-error-message')).toBeNull();
    });
  });

  describe('접근성', () => {
    it('모드 전환 버튼에 접근성 라벨이 있다', () => {
      render(<MainScreen mode="PLAN" todos={mockTodos} stats={mockStats} onModeToggle={jest.fn()} />);

      const toggle = screen.getByTestId('mode-toggle-button');
      expect(toggle.props.accessibilityLabel || toggle.props['aria-label']).toBeTruthy();
    });
  });
});
