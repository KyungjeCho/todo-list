import { render, fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SoundPressable } from 'src/components/common/SoundPressable';
import { soundService } from 'src/features/sound/soundService';
import { useSoundStore } from 'src/store/soundStore';

describe('SoundPressable', () => {
  let playSpy: jest.SpyInstance;

  beforeEach(() => {
    useSoundStore.setState({ enabled: true, hydrated: true });
    playSpy = jest.spyOn(soundService, 'play').mockImplementation(() => undefined);
  });

  afterEach(() => {
    playSpy.mockRestore();
  });

  it('children을 렌더링한다', () => {
    render(
      <SoundPressable testID="btn">
        <Text>Tap</Text>
      </SoundPressable>,
    );
    expect(screen.getByText('Tap')).toBeTruthy();
    expect(screen.getByTestId('btn')).toBeTruthy();
  });

  it('onPress 발화 시 soundService.play()가 호출되고 onPress 핸들러도 동작한다', () => {
    const onPress = jest.fn();
    render(
      <SoundPressable testID="btn" onPress={onPress}>
        <Text>Tap</Text>
      </SoundPressable>,
    );

    fireEvent.press(screen.getByTestId('btn'));

    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disabled=true면 onPress와 soundService.play() 모두 호출되지 않는다', () => {
    const onPress = jest.fn();
    render(
      <SoundPressable testID="btn" onPress={onPress} disabled>
        <Text>Tap</Text>
      </SoundPressable>,
    );

    fireEvent.press(screen.getByTestId('btn'));

    expect(onPress).not.toHaveBeenCalled();
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('disableSound=true면 onPress는 호출되지만 소리는 나지 않는다', () => {
    const onPress = jest.fn();
    render(
      <SoundPressable testID="btn" onPress={onPress} disableSound>
        <Text>Tap</Text>
      </SoundPressable>,
    );

    fireEvent.press(screen.getByTestId('btn'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('onPressIn만 발생하고 press가 확정되지 않으면 soundService.play()가 호출되지 않는다 (FR-001)', () => {
    const onPress = jest.fn();
    const onPressIn = jest.fn();
    render(
      <SoundPressable testID="btn" onPress={onPress} onPressIn={onPressIn}>
        <Text>Tap</Text>
      </SoundPressable>,
    );

    // press-in만 발생시키고 press 확정 이벤트는 발생시키지 않음
    fireEvent(screen.getByTestId('btn'), 'pressIn', { nativeEvent: {} });

    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
    // 사운드는 onPress(확정 탭)에만 연동 → 호출 없음
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('testID, accessibilityRole, style 같은 props를 pass-through한다', () => {
    render(
      <SoundPressable
        testID="btn"
        accessibilityRole="button"
        style={{ padding: 10 }}
      >
        <Text>Tap</Text>
      </SoundPressable>,
    );

    const node = screen.getByTestId('btn');
    expect(node.props.accessibilityRole).toBe('button');
  });
});
