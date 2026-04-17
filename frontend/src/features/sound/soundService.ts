import { createAudioPlayer } from 'expo-audio';
import { useSoundStore } from '../../store/soundStore';

type AudioPlayerLike = {
  play: () => void;
  seekTo: (seconds: number) => void;
  remove?: () => void;
};

export type SoundAssetStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ClickSoundService {
  preload(): Promise<void>;
  play(): void;
  setRecordingActive(active: boolean): void;
  getStatus(): SoundAssetStatus;
  dispose(): void;
}

function devWarn(message: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[soundService] ${message}`, error);
  }
}

function createClickSoundService(): ClickSoundService {
  let player: AudioPlayerLike | null = null;
  let status: SoundAssetStatus = 'idle';
  let recordingActive = false;
  let preloadPromise: Promise<void> | null = null;

  // WHY: Audio assets must be loaded into memory before playback; on-demand loading causes
  // audible latency that makes tap feedback feel sluggish.
  const preload = async (): Promise<void> => {
    if (status === 'ready' || status === 'error') {
      return;
    }
    if (preloadPromise) {
      return preloadPromise;
    }
    status = 'loading';
    preloadPromise = Promise.resolve().then(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const asset = require('../../../assets/u_o8xh7gwsrj-app_interface_click_2-476372.mp3');
        player = createAudioPlayer(asset) as AudioPlayerLike;
        status = 'ready';
      } catch (err) {
        devWarn('preload failed', err);
        player = null;
        status = 'error';
      }
    });
    try {
      await preloadPromise;
    } finally {
      preloadPromise = null;
    }
  };

  const play = (): void => {
    // WHY: Guards prevent crashes from playing before preload completes, avoid audio
    // conflicts during voice recording, and respect the user's sound preference.
    if (status !== 'ready' || !player) {
      return;
    }
    if (recordingActive) {
      return;
    }
    if (!useSoundStore.getState().enabled) {
      return;
    }
    try {
      player.seekTo(0);
      player.play();
    } catch (err) {
      devWarn('play failed', err);
    }
  };

  const setRecordingActive = (active: boolean): void => {
    recordingActive = active;
  };

  const getStatus = (): SoundAssetStatus => status;

  const dispose = (): void => {
    try {
      player?.remove?.();
    } catch (err) {
      devWarn('dispose remove failed', err);
    }
    player = null;
    status = 'idle';
    preloadPromise = null;
    recordingActive = false;
  };

  return { preload, play, setRecordingActive, getStatus, dispose };
}

export const soundService: ClickSoundService = createClickSoundService();
