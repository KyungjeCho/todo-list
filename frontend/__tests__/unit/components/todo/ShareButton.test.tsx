import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ShareButton } from 'src/components/todo/ShareButton';
import { useShareTodo } from 'src/features/share/useShareTodo';
import { colors, typography, radius } from 'src/theme';

jest.mock('src/features/share/useShareTodo');

const mockShareTodos = jest.fn().mockResolvedValue(undefined);
const mockShareToSelf = jest.fn().mockResolvedValue(undefined);
const mockUseShareTodo = useShareTodo as jest.MockedFunction<
  typeof useShareTodo
>;

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

const insets = { top: 0, bottom: 0, left: 0, right: 0 };

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={{ insets, frame: { x: 0, y: 0, width: 390, height: 844 } }}>
      {ui}
    </SafeAreaProvider>,
  );
}

describe('ShareButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHook();
  });

  describe('렌더링', () => {
    it('공유 버튼을 렌더링한다', () => {
      renderWithProvider(<ShareButton todos={mockTodos} date="2026-03-31" />);

      expect(screen.getByTestId('share-button')).toBeTruthy();
    });

    it('공유 버튼에 접근성 라벨이 있다', () => {
      renderWithProvider(<ShareButton todos={mockTodos} date="2026-03-31" />);

      expect(screen.getByTestId('share-button')).toBeTruthy();
    });
  });

  describe('공유 메뉴', () => {
    it('공유 버튼 클릭 시 공유 메뉴가 표시된다', () => {
      renderWithProvider(<ShareButton todos={mockTodos} date="2026-03-31" />);

      fireEvent.press(screen.getByTestId('share-button'));

      expect(screen.getByTestId('share-menu')).toBeTruthy();
    });

    it('"나에게 전송" 옵션이 최상단에 표시된다', () => {
      renderWithProvider(<ShareButton todos={mockTodos} date="2026-03-31" />);

      fireEvent.press(screen.getByTestId('share-button'));

      const shareToSelfOption = screen.getByTestId('share-to-self');
      expect(shareToSelfOption).toBeTruthy();
      expect(screen.getByText('나에게 전송')).toBeTruthy();
    });

    it('공유하기 옵션이 표시된다', () => {
      renderWithProvider(<ShareButton todos={mockTodos} date="2026-03-31" />);

      fireEvent.press(screen.getByTestId('share-button'));

      expect(screen.getByTestId('share-to-others')).toBeTruthy();
    });

    it('메뉴 바깥 영역 터치 시 메뉴가 닫힌다', () => {
      renderWithProvider(<ShareButton todos={mockTodos} date="2026-03-31" />);

      fireEvent.press(screen.getByTestId('share-button'));
      expect(screen.getByTestId('share-menu')).toBeTruthy();

      fireEvent.press(screen.getByTestId('share-backdrop'));
      expect(screen.queryByTestId('share-menu')).toBeNull();
    });
  });

  describe('공유 액션', () => {
    it('"나에게 전송" 클릭 시 shareToSelf를 호출한다', () => {
      renderWithProvider(<ShareButton todos={mockTodos} date="2026-03-31" />);

      fireEvent.press(screen.getByTestId('share-button'));
      fireEvent.press(screen.getByTestId('share-to-self'));

      expect(mockShareToSelf).toHaveBeenCalledWith(mockTodos, '2026-03-31');
    });

    it('공유하기 클릭 시 shareTodos를 호출한다', () => {
      renderWithProvider(<ShareButton todos={mockTodos} date="2026-03-31" />);

      fireEvent.press(screen.getByTestId('share-button'));
      fireEvent.press(screen.getByTestId('share-to-others'));

      expect(mockShareTodos).toHaveBeenCalledWith(mockTodos, '2026-03-31');
    });
  });

  describe('Ghost 버튼 스타일', () => {
    it('투명 배경과 border 스타일이 적용된다', () => {
      renderWithProvider(<ShareButton todos={mockTodos} date="2026-03-31" />);

      const button = screen.getByTestId('share-button');
      const flatStyle = Array.isArray(button.props.style)
        ? Object.assign({}, ...button.props.style)
        : button.props.style;

      expect(flatStyle.backgroundColor).toBe('transparent');
      expect(flatStyle.borderWidth).toBe(1);
      expect(flatStyle.borderColor).toBe(colors.border);
      expect(flatStyle.borderRadius).toBe(radius.md);
    });

    it('버튼 텍스트가 primary 색상과 caption 스타일을 사용한다', () => {
      renderWithProvider(<ShareButton todos={mockTodos} date="2026-03-31" />);

      const text = screen.getByText('공유');
      const flatStyle = Array.isArray(text.props.style)
        ? Object.assign({}, ...text.props.style)
        : text.props.style;

      expect(flatStyle.color).toBe(colors.primary);
      expect(flatStyle.fontSize).toBe(typography.caption.fontSize);
      expect(flatStyle.fontWeight).toBe(typography.caption.fontWeight);
    });
  });

  describe('비활성 상태', () => {
    it('할 일 목록이 비어있으면 공유 버튼 스타일이 비활성화된다', () => {
      renderWithProvider(<ShareButton todos={[]} date="2026-03-31" />);

      const button = screen.getByTestId('share-button');
      const flatStyle = Array.isArray(button.props.style)
        ? Object.assign({}, ...button.props.style)
        : button.props.style;

      expect(flatStyle.borderColor).toBe(colors.borderLight);
    });

    it('빈 상태에서 공유 버튼 누르면 "공유할 할 일이 없습니다" 안내를 표시한다', () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      renderWithProvider(<ShareButton todos={[]} date="2026-03-31" />);

      fireEvent.press(screen.getByTestId('share-button'));

      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        '공유할 할 일이 없습니다',
      );
      alertSpy.mockRestore();
    });
  });

  describe('복사 완료 피드백', () => {
    it('클립보드 복사 성공 시 완료 메시지를 표시한다', () => {
      setupHook({ copied: true });

      renderWithProvider(<ShareButton todos={mockTodos} date="2026-03-31" />);

      expect(screen.getByText('클립보드에 복사되었습니다')).toBeTruthy();
    });
  });

  describe('에러 상태', () => {
    it('에러 발생 시 에러 메시지를 표시한다', () => {
      setupHook({ error: '공유에 실패했습니다' });

      renderWithProvider(<ShareButton todos={mockTodos} date="2026-03-31" />);

      expect(screen.getByText('공유에 실패했습니다')).toBeTruthy();
    });

    it('에러가 없으면 에러 메시지를 표시하지 않는다', () => {
      renderWithProvider(<ShareButton todos={mockTodos} date="2026-03-31" />);

      expect(screen.queryByTestId('share-error')).toBeNull();
    });
  });

  describe('로딩 상태', () => {
    it('공유 중일 때 로딩 표시를 보여준다', () => {
      setupHook({ isSharing: true });

      renderWithProvider(<ShareButton todos={mockTodos} date="2026-03-31" />);

      expect(screen.getByTestId('share-loading')).toBeTruthy();
    });
  });
});
