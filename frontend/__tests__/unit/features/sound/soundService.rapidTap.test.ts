import {
  __getLastCreatedPlayer,
  __resetAudioPlayerMocks,
} from 'expo-audio';
import { soundService } from 'src/features/sound/soundService';
import { useSoundStore } from 'src/store/soundStore';

describe('soundService — 연속 탭 (FR-012, SC-002)', () => {
  beforeEach(() => {
    __resetAudioPlayerMocks();
    soundService.dispose();
    soundService.setRecordingActive(false);
    useSoundStore.setState({ enabled: true, hydrated: true });
  });

  it('100ms 간격 5회 연속 탭 → seekTo(0)+play()가 정확히 5회 호출된다', async () => {
    jest.useFakeTimers();
    try {
      await soundService.preload();
      const player = __getLastCreatedPlayer();
      expect(player).not.toBeNull();

      for (let i = 0; i < 5; i += 1) {
        soundService.play();
        jest.advanceTimersByTime(100);
      }

      expect(player!.seekTo).toHaveBeenCalledTimes(5);
      expect(player!.play).toHaveBeenCalledTimes(5);
      player!.seekTo.mock.calls.forEach((call) => {
        expect(call[0]).toBe(0);
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('play()는 동기적으로(<2ms) 반환한다 — fire-and-forget', async () => {
    await soundService.preload();

    const start = Date.now();
    soundService.play();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5);
  });
});
