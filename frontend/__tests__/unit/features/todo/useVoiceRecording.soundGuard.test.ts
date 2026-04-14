import { renderHook, act } from '@testing-library/react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { useVoiceRecording } from 'src/features/todo/useVoiceRecording';
import { soundService } from 'src/features/sound/soundService';

jest.mock('expo-audio');

const mockUseAudioRecorder = useAudioRecorder as jest.MockedFunction<
  typeof useAudioRecorder
>;
const mockUseAudioRecorderState = useAudioRecorderState as jest.MockedFunction<
  typeof useAudioRecorderState
>;
const mockRequestPermissions =
  requestRecordingPermissionsAsync as jest.MockedFunction<
    typeof requestRecordingPermissionsAsync
  >;
const mockSetAudioMode = setAudioModeAsync as jest.MockedFunction<
  typeof setAudioModeAsync
>;

describe('useVoiceRecording — soundService 녹음 가드', () => {
  let mockRecorder: {
    prepareToRecordAsync: jest.Mock;
    record: jest.Mock;
    stop: jest.Mock;
    uri: string | null;
  };
  let setRecordingActiveSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    setRecordingActiveSpy = jest.spyOn(soundService, 'setRecordingActive');

    mockRecorder = {
      prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
      record: jest.fn(),
      stop: jest.fn().mockResolvedValue(undefined),
      uri: null,
    };

    mockUseAudioRecorder.mockReturnValue(mockRecorder as never);
    mockUseAudioRecorderState.mockReturnValue({
      isRecording: false,
      canRecord: true,
      durationMillis: 0,
    } as never);
    mockRequestPermissions.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    } as never);
    mockSetAudioMode.mockResolvedValue(undefined);
  });

  afterEach(() => {
    setRecordingActiveSpy.mockRestore();
  });

  it('startRecording 성공 시 setRecordingActive(true)를 호출한다', async () => {
    const { result } = renderHook(() => useVoiceRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(setRecordingActiveSpy).toHaveBeenCalledWith(true);
  });

  it('권한 거부 시에는 setRecordingActive(true)를 호출하지 않는다', async () => {
    mockRequestPermissions.mockResolvedValue({
      status: 'denied',
      granted: false,
      canAskAgain: true,
      expires: 'never',
    } as never);

    const { result } = renderHook(() => useVoiceRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(setRecordingActiveSpy).not.toHaveBeenCalledWith(true);
  });

  it('startRecording 실패 시 finally 경로에서 setRecordingActive(false)를 호출한다', async () => {
    mockRecorder.record.mockImplementation(() => {
      throw new Error('녹음 시작 실패');
    });

    const { result } = renderHook(() => useVoiceRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(setRecordingActiveSpy).toHaveBeenCalledWith(false);
  });

  it('stopRecording 성공 시 setRecordingActive(false)를 호출한다', async () => {
    mockUseAudioRecorderState.mockReturnValue({
      isRecording: true,
      canRecord: true,
      durationMillis: 1000,
    } as never);
    mockRecorder.uri = 'file:///tmp/recording.m4a';

    const { result } = renderHook(() => useVoiceRecording());

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(setRecordingActiveSpy).toHaveBeenCalledWith(false);
  });

  it('stopRecording 실패 시에도 setRecordingActive(false)를 호출한다', async () => {
    mockUseAudioRecorderState.mockReturnValue({
      isRecording: true,
      canRecord: true,
      durationMillis: 1000,
    } as never);
    mockRecorder.stop.mockRejectedValue(new Error('녹음 중지 실패'));

    const { result } = renderHook(() => useVoiceRecording());

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(setRecordingActiveSpy).toHaveBeenCalledWith(false);
  });
});
