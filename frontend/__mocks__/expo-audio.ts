export const useAudioRecorder = jest.fn().mockReturnValue({
  prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
  record: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
  uri: null,
});

export const useAudioRecorderState = jest.fn().mockReturnValue({
  isRecording: false,
  canRecord: true,
  durationMillis: 0,
});

export const requestRecordingPermissionsAsync = jest.fn().mockResolvedValue({
  status: 'granted',
  granted: true,
  canAskAgain: true,
  expires: 'never',
});

export const setAudioModeAsync = jest.fn().mockResolvedValue(undefined);

// Feature 006: singleton click-sound player mock. Tests can access the
// last-created mock player via __getLastCreatedPlayer() and clear it via
// __resetAudioPlayerMocks() in beforeEach blocks.
interface MockAudioPlayer {
  play: jest.Mock;
  seekTo: jest.Mock;
  remove: jest.Mock;
}

let lastCreatedPlayer: MockAudioPlayer | null = null;
let shouldThrowOnCreate = false;

export const createAudioPlayer = jest.fn((_source: number) => {
  if (shouldThrowOnCreate) {
    throw new Error('createAudioPlayer mock failure');
  }
  const player: MockAudioPlayer = {
    play: jest.fn(),
    seekTo: jest.fn(),
    remove: jest.fn(),
  };
  lastCreatedPlayer = player;
  return player;
});

export function __getLastCreatedPlayer(): MockAudioPlayer | null {
  return lastCreatedPlayer;
}

export function __resetAudioPlayerMocks(): void {
  (createAudioPlayer as jest.Mock).mockClear();
  lastCreatedPlayer = null;
  shouldThrowOnCreate = false;
}

export function __setCreateAudioPlayerShouldThrow(value: boolean): void {
  shouldThrowOnCreate = value;
}

export const RecordingPresets = {
  HIGH_QUALITY: {
    extension: '.m4a',
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  LOW_QUALITY: {
    extension: '.m4a',
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 64000,
  },
};
