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
