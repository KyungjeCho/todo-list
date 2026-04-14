import {
  __getLastCreatedPlayer,
  __resetAudioPlayerMocks,
} from 'expo-audio';
import { soundService } from 'src/features/sound/soundService';
import { useSoundStore } from 'src/store/soundStore';

describe('soundService recording guard', () => {
  beforeEach(() => {
    __resetAudioPlayerMocks();
    soundService.dispose();
    soundService.setRecordingActive(false);
    useSoundStore.setState({ enabled: true, hydrated: true });
  });

  it('setRecordingActive(true) 상태에서 play()는 네이티브 player.play를 호출하지 않는다', async () => {
    await soundService.preload();
    const player = __getLastCreatedPlayer();
    expect(player).not.toBeNull();

    soundService.setRecordingActive(true);
    soundService.play();

    expect(player!.play).not.toHaveBeenCalled();
  });

  it('setRecordingActive(false)로 전환 시 play()가 다시 복구된다', async () => {
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
