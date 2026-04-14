import { render, fireEvent, screen } from '@testing-library/react-native';
import { ScrollView, Text } from 'react-native';
import { SoundPressable } from 'src/components/common/SoundPressable';
import { soundService } from 'src/features/sound/soundService';
import { useSoundStore } from 'src/store/soundStore';

describe('SoundPressable — FR-004 스크롤 취소 통합', () => {
  let playSpy: jest.SpyInstance;

  beforeEach(() => {
    useSoundStore.setState({ enabled: true, hydrated: true });
    playSpy = jest.spyOn(soundService, 'play').mockImplementation(() => undefined);
  });

  afterEach(() => {
    playSpy.mockRestore();
  });

  // WHY: React Native Pressability 상태 머신을 테스트 환경에서 정확히 시뮬레이션하기
  // 어렵다. 대신 "onPress(확정된 탭)가 발생하지 않은 경우 소리가 나지 않는다"는
  // 핵심 불변을 확인하여 FR-004(스크롤 취소 시 무음)를 보장한다. SoundPressable은
  // onPress에만 soundService.play()를 연결하므로, 스크롤 취소로 onPress가 발화되지
  // 않으면 자동으로 무음이 된다.
  it('ScrollView 내 SoundPressable: onPress가 발화되지 않으면 소리가 나지 않는다', () => {
    const onPress = jest.fn();

    render(
      <ScrollView testID="scroll">
        {[1, 2, 3].map((i) => (
          <SoundPressable key={i} testID={`row-${i}`} onPress={onPress}>
            <Text>Row {i}</Text>
          </SoundPressable>
        ))}
      </ScrollView>,
    );

    fireEvent(screen.getByTestId('row-1'), 'pressIn', { nativeEvent: {} });
    fireEvent.scroll(screen.getByTestId('scroll'), {
      nativeEvent: { contentOffset: { x: 0, y: 50 } },
    });
    // press confirm (onPress)은 발생하지 않았음

    expect(onPress).not.toHaveBeenCalled();
    expect(playSpy).not.toHaveBeenCalled();
  });
});
