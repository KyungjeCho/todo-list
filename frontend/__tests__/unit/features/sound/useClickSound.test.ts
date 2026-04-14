import { renderHook, act } from '@testing-library/react-native';
import { useClickSound } from 'src/features/sound/useClickSound';
import { soundService } from 'src/features/sound/soundService';
import { useSoundStore } from 'src/store/soundStore';

describe('useClickSound', () => {
  beforeEach(() => {
    useSoundStore.setState({ enabled: true, hydrated: true });
    jest.restoreAllMocks();
  });

  it('returns { play, enabled } with play delegating to soundService.play()', () => {
    const playSpy = jest.spyOn(soundService, 'play').mockImplementation(() => undefined);

    const { result } = renderHook(() => useClickSound());

    expect(typeof result.current.play).toBe('function');
    expect(result.current.enabled).toBe(true);

    act(() => {
      result.current.play();
    });

    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('enabled mirrors soundStore.enabled', () => {
    useSoundStore.setState({ enabled: false, hydrated: true });
    const { result } = renderHook(() => useClickSound());
    expect(result.current.enabled).toBe(false);
  });
});
