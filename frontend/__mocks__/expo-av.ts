const mockStartAsync = jest.fn().mockResolvedValue({ status: 'granted' });
const mockStopAndUnloadAsync = jest.fn().mockResolvedValue(undefined);
const mockGetURI = jest.fn().mockReturnValue('file:///tmp/recording.m4a');
const mockPrepareToRecordAsync = jest.fn().mockResolvedValue(undefined);
const mockGetStatusAsync = jest.fn().mockResolvedValue({ isRecording: false, durationMillis: 0 });

const MockRecording = jest.fn().mockImplementation(() => ({
  prepareToRecordAsync: mockPrepareToRecordAsync,
  startAsync: mockStartAsync,
  stopAndUnloadAsync: mockStopAndUnloadAsync,
  getURI: mockGetURI,
  getStatusAsync: mockGetStatusAsync,
}));

export const Audio = {
  Recording: MockRecording,
  RecordingOptionsPresets: {
    HIGH_QUALITY: {
      android: {},
      ios: {},
      web: {},
    },
  },
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
};
