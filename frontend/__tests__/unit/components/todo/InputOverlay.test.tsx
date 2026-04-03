import { render, fireEvent, screen } from '@testing-library/react-native';
import { InputOverlay } from 'src/components/todo/InputOverlay';

// expo-blur mock
jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return {
    BlurView: (props: Record<string, unknown>) => <View {...props} />,
  };
});

describe('InputOverlay', () => {
  const defaultProps = {
    visible: true,
    mode: 'todo' as const,
    placeholder: '할 일을 입력하세요',
    onSubmit: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('렌더링', () => {
    it('visible이 true일 때 오버레이가 렌더링된다', () => {
      render(<InputOverlay {...defaultProps} />);

      expect(screen.getByTestId('input-overlay')).toBeTruthy();
    });

    it('visible이 false일 때 오버레이가 렌더링되지 않는다', () => {
      render(<InputOverlay {...defaultProps} visible={false} />);

      expect(screen.queryByTestId('input-overlay')).toBeNull();
    });

    it('placeholder가 TextInput에 표시된다', () => {
      render(<InputOverlay {...defaultProps} />);

      expect(screen.getByPlaceholderText('할 일을 입력하세요')).toBeTruthy();
    });

    it('입력 바와 추가 버튼이 표시된다', () => {
      render(<InputOverlay {...defaultProps} />);

      expect(screen.getByTestId('input-overlay-text-input')).toBeTruthy();
      expect(screen.getByTestId('input-overlay-submit-button')).toBeTruthy();
    });
  });

  describe('텍스트 입력 및 제출', () => {
    it('텍스트 입력 후 추가 버튼 탭 시 onSubmit이 호출된다', () => {
      const onSubmit = jest.fn();
      render(<InputOverlay {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByTestId('input-overlay-text-input');
      fireEvent.changeText(input, '새 할 일');
      fireEvent.press(screen.getByTestId('input-overlay-submit-button'));

      expect(onSubmit).toHaveBeenCalledWith('새 할 일');
    });

    it('텍스트 입력 후 키보드 submit 시 onSubmit이 호출된다', () => {
      const onSubmit = jest.fn();
      render(<InputOverlay {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByTestId('input-overlay-text-input');
      fireEvent.changeText(input, '새 할 일');
      fireEvent(input, 'submitEditing');

      expect(onSubmit).toHaveBeenCalledWith('새 할 일');
    });

    it('빈 텍스트로 제출 시 onSubmit이 호출되지 않는다', () => {
      const onSubmit = jest.fn();
      render(<InputOverlay {...defaultProps} onSubmit={onSubmit} />);

      fireEvent.press(screen.getByTestId('input-overlay-submit-button'));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('공백만 있는 텍스트로 제출 시 onSubmit이 호출되지 않는다', () => {
      const onSubmit = jest.fn();
      render(<InputOverlay {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByTestId('input-overlay-text-input');
      fireEvent.changeText(input, '   ');
      fireEvent.press(screen.getByTestId('input-overlay-submit-button'));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('제출 후 입력 필드가 초기화된다', () => {
      const onSubmit = jest.fn();
      render(<InputOverlay {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByTestId('input-overlay-text-input');
      fireEvent.changeText(input, '새 할 일');
      fireEvent.press(screen.getByTestId('input-overlay-submit-button'));

      expect(input.props.value).toBe('');
    });
  });

  describe('오버레이 닫기', () => {
    it('오버레이 배경 영역 탭 시 onClose가 호출된다', () => {
      const onClose = jest.fn();
      render(<InputOverlay {...defaultProps} onClose={onClose} />);

      fireEvent.press(screen.getByTestId('input-overlay-backdrop'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('모드', () => {
    it('memo 모드에서 다른 placeholder를 표시할 수 있다', () => {
      render(
        <InputOverlay
          {...defaultProps}
          mode="memo"
          placeholder="메모를 입력하세요"
        />,
      );

      expect(screen.getByPlaceholderText('메모를 입력하세요')).toBeTruthy();
    });
  });
});
