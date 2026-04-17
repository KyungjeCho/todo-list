import { render, screen, fireEvent } from '@testing-library/react-native';
import { Checkbox } from 'src/components/common/Checkbox';
import { soundService } from 'src/features/sound/soundService';
import { useSoundStore } from 'src/store/soundStore';

describe('Checkbox', () => {
  let playSpy: jest.SpyInstance;

  beforeEach(() => {
    useSoundStore.setState({ enabled: true, hydrated: true });
    playSpy = jest
      .spyOn(soundService, 'play')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    playSpy.mockRestore();
  });

  it('renders unchecked state without checkmark', () => {
    render(<Checkbox checked={false} testID="cb" />);

    const cb = screen.getByTestId('cb');
    expect(cb).toBeTruthy();
    expect(screen.queryByText('\u2713')).toBeNull();
  });

  it('renders checked state with checkmark', () => {
    render(<Checkbox checked={true} testID="cb" />);

    expect(screen.getByText('\u2713')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Checkbox checked={false} onPress={onPress} testID="cb" />);

    fireEvent.press(screen.getByTestId('cb'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
