import { render, fireEvent, screen } from '@testing-library/react-native';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

import { VoiceTodoButton } from 'src/components/todo/VoiceTodoButton';

describe('VoiceTodoButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('마이크 버튼을 렌더링한다', () => {
    render(<VoiceTodoButton todoDate="2026-04-04" />);

    expect(screen.getByTestId('voice-todo-button')).toBeTruthy();
  });

  it('���이크 버튼에 접근성 라벨이 있다', () => {
    render(<VoiceTodoButton todoDate="2026-04-04" />);

    const button = screen.getByTestId('voice-todo-button');
    expect(
      button.props.accessibilityLabel || button.props['aria-label'],
    ).toBeTruthy();
  });

  it('탭 시 VoiceInput 화면으로 ��비게이션한다', () => {
    render(<VoiceTodoButton todoDate="2026-04-04" />);

    fireEvent.press(screen.getByTestId('voice-todo-button'));

    expect(mockNavigate).toHaveBeenCalledWith('VoiceInput', {
      todoDate: '2026-04-04',
    });
  });

  it('disabled prop이 true���면 버튼이 비활성화된다', () => {
    render(<VoiceTodoButton todoDate="2026-04-04" disabled={true} />);

    const button = screen.getByTestId('voice-todo-button');
    expect(
      button.props.accessibilityState?.disabled || button.props.disabled,
    ).toBe(true);
  });
});
