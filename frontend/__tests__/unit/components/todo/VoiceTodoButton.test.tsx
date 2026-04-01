import { render, fireEvent, screen } from '@testing-library/react-native';
import { VoiceTodoButton } from 'src/components/todo/VoiceTodoButton';
import { useVoiceRecording } from 'src/features/todo/useVoiceRecording';

jest.mock('src/features/todo/useVoiceRecording');

const mockStartRecording = jest.fn().mockResolvedValue(undefined);
const mockStopRecording = jest.fn().mockResolvedValue(undefined);
const mockResetError = jest.fn();

const mockUseVoiceRecording = useVoiceRecording as jest.MockedFunction<
  typeof useVoiceRecording
>;

function setupHook(
  overrides: Partial<ReturnType<typeof useVoiceRecording>> = {},
) {
  mockUseVoiceRecording.mockReturnValue({
    isRecording: false,
    audioUri: null,
    error: null,
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
    resetError: mockResetError,
    ...overrides,
  });
}

describe('VoiceTodoButton', () => {
  const mockOnVoiceTodoCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setupHook();
  });

  describe('렌더링', () => {
    it('마이크 버튼을 렌더링한다', () => {
      render(<VoiceTodoButton onVoiceTodoCreated={mockOnVoiceTodoCreated} />);

      expect(screen.getByTestId('voice-todo-button')).toBeTruthy();
    });

    it('마이크 버튼에 접근성 라벨이 있다', () => {
      render(<VoiceTodoButton onVoiceTodoCreated={mockOnVoiceTodoCreated} />);

      const button = screen.getByTestId('voice-todo-button');
      expect(
        button.props.accessibilityLabel || button.props['aria-label'],
      ).toBeTruthy();
    });
  });

  describe('녹음 시작', () => {
    it('마이크 버튼 클릭 시 녹음을 시작한다', () => {
      render(<VoiceTodoButton onVoiceTodoCreated={mockOnVoiceTodoCreated} />);

      fireEvent.press(screen.getByTestId('voice-todo-button'));

      expect(mockStartRecording).toHaveBeenCalled();
    });
  });

  describe('녹음 중 UI 상태', () => {
    it('녹음 중일 때 녹음 중 표시를 보여준다', () => {
      setupHook({ isRecording: true });

      render(<VoiceTodoButton onVoiceTodoCreated={mockOnVoiceTodoCreated} />);

      expect(screen.getByTestId('voice-recording-indicator')).toBeTruthy();
    });

    it('녹음 중일 때 중지 버튼을 표시한다', () => {
      setupHook({ isRecording: true });

      render(<VoiceTodoButton onVoiceTodoCreated={mockOnVoiceTodoCreated} />);

      const stopButton = screen.getByTestId('voice-stop-button');
      expect(stopButton).toBeTruthy();
    });

    it('중지 버튼 클릭 시 녹음을 중지한다', () => {
      setupHook({ isRecording: true });

      render(<VoiceTodoButton onVoiceTodoCreated={mockOnVoiceTodoCreated} />);

      fireEvent.press(screen.getByTestId('voice-stop-button'));

      expect(mockStopRecording).toHaveBeenCalled();
    });
  });

  describe('로딩 상태', () => {
    it('AI 변환 중일 때 로딩 인디케이터를 표시한다', () => {
      render(
        <VoiceTodoButton
          onVoiceTodoCreated={mockOnVoiceTodoCreated}
          isProcessing={true}
        />,
      );

      expect(screen.getByTestId('voice-loading')).toBeTruthy();
    });

    it('로딩 중일 때 마이크 버튼이 비활성화된다', () => {
      render(
        <VoiceTodoButton
          onVoiceTodoCreated={mockOnVoiceTodoCreated}
          isProcessing={true}
        />,
      );

      const button = screen.getByTestId('voice-todo-button');
      expect(
        button.props.accessibilityState?.disabled || button.props.disabled,
      ).toBe(true);
    });
  });

  describe('에러 상태', () => {
    it('녹음 에러 발생 시 에러 메시지를 표시한다', () => {
      setupHook({ error: '마이크 권한이 필요합니다' });

      render(<VoiceTodoButton onVoiceTodoCreated={mockOnVoiceTodoCreated} />);

      expect(screen.getByText('마이크 권한이 필요합니다')).toBeTruthy();
    });

    it('AI 실패 시 안내 메시지를 표시한다', () => {
      render(
        <VoiceTodoButton
          onVoiceTodoCreated={mockOnVoiceTodoCreated}
          processingError="음성 인식에 실패했습니다. 다시 시도해주세요."
        />,
      );

      expect(
        screen.getByText('음성 인식에 실패했습니다. 다시 시도해주세요.'),
      ).toBeTruthy();
    });

    it('에러가 없으면 에러 메시지를 표시하지 않는다', () => {
      render(<VoiceTodoButton onVoiceTodoCreated={mockOnVoiceTodoCreated} />);

      expect(screen.queryByTestId('voice-error')).toBeNull();
    });

    it('에러 상태에서 다시 시도 가능하다', () => {
      setupHook({ error: '녹음 실패' });

      render(<VoiceTodoButton onVoiceTodoCreated={mockOnVoiceTodoCreated} />);

      const button = screen.getByTestId('voice-todo-button');
      expect(
        button.props.accessibilityState?.disabled || button.props.disabled,
      ).toBeFalsy();
    });
  });

  describe('���음 완료 후 콜백', () => {
    it('녹음 완료 후 audioUri가 있으면 onVoiceTodoCreated를 호출한다', () => {
      setupHook({ audioUri: 'file:///tmp/recording.m4a' });

      render(<VoiceTodoButton onVoiceTodoCreated={mockOnVoiceTodoCreated} />);

      expect(mockOnVoiceTodoCreated).toHaveBeenCalledWith(
        'file:///tmp/recording.m4a',
      );
    });

    it('audioUri가 null이면 콜백을 호출하지 ��는다', () => {
      setupHook({ audioUri: null });

      render(<VoiceTodoButton onVoiceTodoCreated={mockOnVoiceTodoCreated} />);

      expect(mockOnVoiceTodoCreated).not.toHaveBeenCalled();
    });
  });

  describe('비활성 상태', () => {
    it('disabled prop이 true이면 버튼이 비활성화된다', () => {
      render(
        <VoiceTodoButton
          onVoiceTodoCreated={mockOnVoiceTodoCreated}
          disabled={true}
        />,
      );

      const button = screen.getByTestId('voice-todo-button');
      expect(
        button.props.accessibilityState?.disabled || button.props.disabled,
      ).toBe(true);
    });
  });
});
