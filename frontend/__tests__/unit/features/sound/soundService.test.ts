import {
  __getLastCreatedPlayer,
  __resetAudioPlayerMocks,
  __setCreateAudioPlayerShouldThrow,
  createAudioPlayer,
} from 'expo-audio';
import { soundService } from 'src/features/sound/soundService';
import { useSoundStore } from 'src/store/soundStore';

describe('soundService', () => {
  beforeEach(() => {
    __resetAudioPlayerMocks();
    soundService.dispose();
    soundService.setRecordingActive(false);
    useSoundStore.setState({ enabled: true, hydrated: true });
  });

  it('preload()는 멱등이며 플레이어를 1회만 생성한다', async () => {
    await soundService.preload();
    await soundService.preload();
    await soundService.preload();

    expect(createAudioPlayer).toHaveBeenCalledTimes(1);
    expect(soundService.getStatus()).toBe('ready');
  });

  it('preload 실패 시 status는 error이고 play()는 no-op', async () => {
    __setCreateAudioPlayerShouldThrow(true);

    await soundService.preload();

    expect(soundService.getStatus()).toBe('error');
    soundService.play();
    // lastCreatedPlayer is null so nothing to assert on; verify no throw.
    expect(__getLastCreatedPlayer()).toBeNull();
  });

  it('status가 ready가 아니면 play()는 no-op', () => {
    // preload 호출 전에는 idle 상태
    expect(soundService.getStatus()).toBe('idle');

    expect(() => soundService.play()).not.toThrow();
  });

  it('녹음 중(setRecordingActive(true))에는 play()가 no-op이다', async () => {
    await soundService.preload();
    const player = __getLastCreatedPlayer();
    expect(player).not.toBeNull();

    soundService.setRecordingActive(true);
    soundService.play();

    expect(player!.play).not.toHaveBeenCalled();
    expect(player!.seekTo).not.toHaveBeenCalled();
  });

  it('store.enabled=false면 play()가 no-op이다', async () => {
    await soundService.preload();
    const player = __getLastCreatedPlayer();

    useSoundStore.setState({ enabled: false, hydrated: true });
    soundService.play();

    expect(player!.play).not.toHaveBeenCalled();
  });

  it('ready + enabled + 녹음 off 조건에서 seekTo(0) 후 play()를 호출한다', async () => {
    await soundService.preload();
    const player = __getLastCreatedPlayer();
    expect(player).not.toBeNull();

    soundService.play();

    expect(player!.seekTo).toHaveBeenCalledWith(0);
    expect(player!.play).toHaveBeenCalledTimes(1);
    // seekTo must be called before play.
    const seekOrder = player!.seekTo.mock.invocationCallOrder[0];
    const playOrder = player!.play.mock.invocationCallOrder[0];
    expect(seekOrder).toBeLessThan(playOrder);
  });

  it('재생 호출 자체가 throw해도 silent하게 no-op 처리된다', async () => {
    await soundService.preload();
    const player = __getLastCreatedPlayer();
    player!.play.mockImplementationOnce(() => {
      throw new Error('native play failed');
    });

    expect(() => soundService.play()).not.toThrow();
  });

  it('setRecordingActive(false)로 복귀하면 다시 재생된다', async () => {
    await soundService.preload();
    const player = __getLastCreatedPlayer();

    soundService.setRecordingActive(true);
    soundService.play();
    expect(player!.play).not.toHaveBeenCalled();

    soundService.setRecordingActive(false);
    soundService.play();
    expect(player!.play).toHaveBeenCalledTimes(1);
  });
});
