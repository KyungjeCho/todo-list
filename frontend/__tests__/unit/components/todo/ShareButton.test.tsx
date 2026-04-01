import { render, fireEvent, screen } from '@testing-library/react-native';
import { ShareButton } from 'src/components/todo/ShareButton';
import { useShareTodo } from 'src/features/share/useShareTodo';

jest.mock('src/features/share/useShareTodo');

const mockShareTodos = jest.fn().mockResolvedValue(undefined);
const mockShareToSelf = jest.fn().mockResolvedValue(undefined);
const mockUseShareTodo = useShareTodo as jest.MockedFunction<typeof useShareTodo>;

function setupHook(overrides: Partial<ReturnType<typeof useShareTodo>> = {}) {
  mockUseShareTodo.mockReturnValue({
    shareTodos: mockShareTodos,
    shareToSelf: mockShareToSelf,
    isSharing: false,
    copied: false,
    error: null,
    ...overrides,
  });
}

const mockTodos = [
  {
    id: 'todo-1',
    todoDate: '2026-03-31',
    content: '운동하기',
    status: 'COMPLETED' as const,
    isCarriedOver: false,
    memos: [],
    createdAt: '2026-03-31T09:00:00.000Z',
    updatedAt: '2026-03-31T09:00:00.000Z',
  },
];

describe('ShareButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHook();
  });

  describe('렌더링', () => {
    it('공유 버튼을 렌더링한다', () => {
      render(<ShareButton todos={mockTodos} date="2026-03-31" />);

      expect(screen.getByTestId('share-button')).toBeTruthy();
    });

    it('공유 버튼에 접근성 라벨이 있다', () => {
      render(<ShareButton todos={mockTodos} date="2026-03-31" />);

      expect(screen.getByTestId('share-button')).toBeTruthy();
    });
  });

  describe('공유 메뉴', () => {
    it('공유 버튼 클릭 시 공유 메뉴가 표시된다', () => {
      render(<ShareButton todos={mockTodos} date="2026-03-31" />);

      fireEvent.press(screen.getByTestId('share-button'));

      expect(screen.getByTestId('share-menu')).toBeTruthy();
    });

    it('"나에게 전송" 옵션이 최상단에 표시된다', () => {
      render(<ShareButton todos={mockTodos} date="2026-03-31" />);

      fireEvent.press(screen.getByTestId('share-button'));

      const shareToSelfOption = screen.getByTestId('share-to-self');
      expect(shareToSelfOption).toBeTruthy();
      expect(screen.getByText('나에게 전송')).toBeTruthy();
    });

    it('공유하기 옵션이 표시된다', () => {
      render(<ShareButton todos={mockTodos} date="2026-03-31" />);

      fireEvent.press(screen.getByTestId('share-button'));

      expect(screen.getByTestId('share-to-others')).toBeTruthy();
    });

    it('메뉴 바깥 영역 터치 시 메뉴가 닫힌다', () => {
      render(<ShareButton todos={mockTodos} date="2026-03-31" />);

      fireEvent.press(screen.getByTestId('share-button'));
      expect(screen.getByTestId('share-menu')).toBeTruthy();

      fireEvent.press(screen.getByTestId('share-backdrop'));
      expect(screen.queryByTestId('share-menu')).toBeNull();
    });
  });

  describe('공유 액션', () => {
    it('"나에게 전송" 클릭 시 shareToSelf를 호출한다', () => {
      render(<ShareButton todos={mockTodos} date="2026-03-31" />);

      fireEvent.press(screen.getByTestId('share-button'));
      fireEvent.press(screen.getByTestId('share-to-self'));

      expect(mockShareToSelf).toHaveBeenCalledWith(mockTodos, '2026-03-31');
    });

    it('공유하기 클릭 시 shareTodos를 호출한다', () => {
      render(<ShareButton todos={mockTodos} date="2026-03-31" />);

      fireEvent.press(screen.getByTestId('share-button'));
      fireEvent.press(screen.getByTestId('share-to-others'));

      expect(mockShareTodos).toHaveBeenCalledWith(mockTodos, '2026-03-31');
    });
  });

  describe('비활성 상태', () => {
    it('할 일 목록이 비어있으면 공유 버튼이 비활성화된다', () => {
      render(<ShareButton todos={[]} date="2026-03-31" />);

      const button = screen.getByTestId('share-button');
      expect(button.props.accessibilityState?.disabled || button.props.disabled).toBe(true);
    });
  });

  describe('복사 완료 피드백', () => {
    it('클립보드 복사 성공 시 완료 메시지를 표시한다', () => {
      setupHook({ copied: true });

      render(<ShareButton todos={mockTodos} date="2026-03-31" />);

      expect(screen.getByText('클립보드에 복사되었습니다')).toBeTruthy();
    });
  });

  describe('에러 상태', () => {
    it('에러 발생 시 에러 메시지를 표시한다', () => {
      setupHook({ error: '공유에 실패했습니다' });

      render(<ShareButton todos={mockTodos} date="2026-03-31" />);

      expect(screen.getByText('공유에 실패했습니다')).toBeTruthy();
    });

    it('에러가 없으면 에러 메시지를 표시하지 않는다', () => {
      render(<ShareButton todos={mockTodos} date="2026-03-31" />);

      expect(screen.queryByTestId('share-error')).toBeNull();
    });
  });

  describe('로딩 상태', () => {
    it('공유 중일 때 로딩 표시를 보여준다', () => {
      setupHook({ isSharing: true });

      render(<ShareButton todos={mockTodos} date="2026-03-31" />);

      expect(screen.getByTestId('share-loading')).toBeTruthy();
    });
  });
});
