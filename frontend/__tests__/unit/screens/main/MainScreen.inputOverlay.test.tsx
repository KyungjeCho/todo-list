import { render, fireEvent, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MainScreen } from 'src/screens/main/MainScreen';
import type { Todo } from 'src/types/todo';

// expo-blur mock
jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return {
    BlurView: (props: Record<string, unknown>) => <View {...props} />,
  };
});

// voice recording mock
jest.mock('src/features/todo/useVoiceRecording', () => ({
  useVoiceRecording: () => ({
    isRecording: false,
    audioUri: null,
    error: null,
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
  }),
}));

const mockTodo: Todo = {
  id: 'todo-1',
  content: '기존 할 일',
  status: 'ACTIVE',
  isCarriedOver: false,
  todoDate: '2026-04-02',
  memos: [],
  createdAt: '2026-04-02T09:00:00.000Z',
  updatedAt: '2026-04-02T09:00:00.000Z',
};

const defaultProps = {
  mode: 'PLAN' as const,
  todos: [mockTodo],
  stats: { total: 1, completed: 0, active: 1, inactive: 0, progressRate: 0 },
  date: '2026-04-02',
  onAddTodo: jest.fn(),
  onToggleComplete: jest.fn(),
  onVoiceTodoCreated: jest.fn(),
};

const safeAreaMetrics = {
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>{ui}</SafeAreaProvider>,
  );
}

describe('MainScreen InputOverlay 통합', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('FAB+ 버튼이 표시된다', () => {
    renderWithProvider(<MainScreen {...defaultProps} />);

    expect(screen.getByTestId('fab-add-button')).toBeTruthy();
  });

  it('FAB+ 탭 시 입력 오버레이가 표시된다', () => {
    renderWithProvider(<MainScreen {...defaultProps} />);

    fireEvent.press(screen.getByTestId('fab-add-button'));

    expect(screen.getByTestId('input-overlay')).toBeTruthy();
  });

  it('오버레이에서 텍스트 입력 후 추가 시 onAddTodo가 호출된다', () => {
    const onAddTodo = jest.fn();
    renderWithProvider(<MainScreen {...defaultProps} onAddTodo={onAddTodo} />);

    fireEvent.press(screen.getByTestId('fab-add-button'));

    const input = screen.getByTestId('input-overlay-text-input');
    fireEvent.changeText(input, '새로운 할 일');
    fireEvent.press(screen.getByTestId('input-overlay-submit-button'));

    expect(onAddTodo).toHaveBeenCalledWith('새로운 할 일');
  });

  it('할 일 추가 후 오버레이가 닫힌다', () => {
    renderWithProvider(<MainScreen {...defaultProps} />);

    fireEvent.press(screen.getByTestId('fab-add-button'));
    expect(screen.getByTestId('input-overlay')).toBeTruthy();

    const input = screen.getByTestId('input-overlay-text-input');
    fireEvent.changeText(input, '새로운 할 일');
    fireEvent.press(screen.getByTestId('input-overlay-submit-button'));

    expect(screen.queryByTestId('input-overlay')).toBeNull();
  });

  it('오버레이 배경 탭 시 오버레이가 닫힌다', () => {
    renderWithProvider(<MainScreen {...defaultProps} />);

    fireEvent.press(screen.getByTestId('fab-add-button'));
    expect(screen.getByTestId('input-overlay')).toBeTruthy();

    fireEvent.press(screen.getByTestId('input-overlay-backdrop'));

    expect(screen.queryByTestId('input-overlay')).toBeNull();
  });

  it('오버레이 활성 시 FAB 버튼이 숨겨진다', () => {
    renderWithProvider(<MainScreen {...defaultProps} />);

    fireEvent.press(screen.getByTestId('fab-add-button'));

    expect(screen.queryByTestId('fab-add-button')).toBeNull();
  });
});
