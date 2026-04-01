import { render, fireEvent, screen } from '@testing-library/react-native';
import { OnboardingScreen } from 'src/screens/onboarding/OnboardingScreen';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    reset: jest.fn(),
  }),
}));

jest.mock('@react-native-community/datetimepicker', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createElement } = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  const MockPicker = (props: {
    testID: string;
    value: Date;
    onChange: (event: { type: string }, date?: Date) => void;
  }) =>
    createElement(View, {
      testID: props.testID,
      onChange: (date: Date) => {
        props.onChange({ type: 'set' }, date);
      },
    });
  return { __esModule: true, default: MockPicker };
});

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('렌더링', () => {
    it('계획 시간 설정 UI를 렌더링한다', () => {
      render(<OnboardingScreen />);

      expect(screen.getByTestId('plan-time-picker')).toBeTruthy();
    });

    it('회고 시간 설정 UI를 렌더링한다', () => {
      render(<OnboardingScreen />);

      expect(screen.getByTestId('review-time-picker')).toBeTruthy();
    });

    it('완료 버튼을 렌더링한다', () => {
      render(<OnboardingScreen />);

      expect(screen.getByTestId('onboarding-complete-button')).toBeTruthy();
    });

    it('계획 시간 라벨을 표시한다', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText(/계획/)).toBeTruthy();
    });

    it('회고 시간 라벨을 표시한다', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText(/회고/)).toBeTruthy();
    });
  });

  describe('기본값', () => {
    it('계획 시간 기본값은 08:00이다', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText('08:00')).toBeTruthy();
    });

    it('회고 시간 기본값은 22:00이다', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText('22:00')).toBeTruthy();
    });
  });

  describe('시간 설정', () => {
    it('계획 시간을 변경할 수 있다', () => {
      const mockOnComplete = jest.fn();
      render(<OnboardingScreen onComplete={mockOnComplete} />);

      // Tap to open picker
      fireEvent.press(screen.getByTestId('plan-time-picker'));

      // Select new time via native picker
      const nativePicker = screen.getByTestId('plan-time-native-picker');
      const newDate = new Date();
      newDate.setHours(9, 0, 0, 0);
      fireEvent(nativePicker, 'onChange', newDate);

      fireEvent.press(screen.getByTestId('onboarding-complete-button'));

      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          planTime: '09:00',
        }),
      );
    });

    it('회고 시간을 변경할 수 있다', () => {
      const mockOnComplete = jest.fn();
      render(<OnboardingScreen onComplete={mockOnComplete} />);

      // Tap to open picker
      fireEvent.press(screen.getByTestId('review-time-picker'));

      // Select new time via native picker
      const nativePicker = screen.getByTestId('review-time-native-picker');
      const newDate = new Date();
      newDate.setHours(21, 0, 0, 0);
      fireEvent(nativePicker, 'onChange', newDate);

      fireEvent.press(screen.getByTestId('onboarding-complete-button'));

      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          reviewTime: '21:00',
        }),
      );
    });
  });

  describe('완료 버튼', () => {
    it('완료 버튼 탭 시 onComplete 콜백이 시간 설정값과 함께 호출된다', () => {
      const mockOnComplete = jest.fn();
      render(<OnboardingScreen onComplete={mockOnComplete} />);

      fireEvent.press(screen.getByTestId('onboarding-complete-button'));

      expect(mockOnComplete).toHaveBeenCalledWith({
        planTime: '08:00',
        reviewTime: '22:00',
      });
    });

    it('완료 버튼 탭 시 한 번만 호출된다', () => {
      const mockOnComplete = jest.fn();
      render(<OnboardingScreen onComplete={mockOnComplete} />);

      fireEvent.press(screen.getByTestId('onboarding-complete-button'));

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('로딩 상태', () => {
    it('로딩 중일 때 완료 버튼이 비활성화된다', () => {
      render(<OnboardingScreen isLoading={true} />);

      const completeButton = screen.getByTestId('onboarding-complete-button');
      expect(completeButton.props.accessibilityState?.disabled ?? completeButton.props.disabled).toBe(true);
    });

    it('로딩 중일 때 로딩 인디케이터를 표시한다', () => {
      render(<OnboardingScreen isLoading={true} />);

      expect(screen.getByTestId('onboarding-loading-indicator')).toBeTruthy();
    });
  });

  describe('에러 상태', () => {
    it('에러 메시지가 있을 때 에러를 표시한다', () => {
      render(<OnboardingScreen error="설정 저장에 실패했습니다" />);

      expect(screen.getByText('설정 저장에 실패했습니다')).toBeTruthy();
    });

    it('에러 메시지가 없을 때 에러를 표시하지 않는다', () => {
      render(<OnboardingScreen />);

      expect(screen.queryByTestId('onboarding-error-message')).toBeNull();
    });
  });
});
