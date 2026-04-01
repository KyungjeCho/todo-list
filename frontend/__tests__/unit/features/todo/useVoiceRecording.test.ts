import { renderHook, act } from '@testing-library/react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { useVoiceRecording } from 'src/features/todo/useVoiceRecording';

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

describe('useVoiceRecording', () => {
  let mockRecorder: {
    prepareToRecordAsync: jest.Mock;
    record: jest.Mock;
    stop: jest.Mock;
    uri: string | null;
  };

  beforeEach(() => {
    jest.clearAllMocks();

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

  describe('초기 상태', () => {
    it('녹음 중이 아닌 상태로 시작한다', () => {
      const { result } = renderHook(() => useVoiceRecording());

      expect(result.current.isRecording).toBe(false);
    });

    it('오디오 URI가 null이다', () => {
      const { result } = renderHook(() => useVoiceRecording());

      expect(result.current.audioUri).toBeNull();
    });

    it('에러가 null이다', () => {
      const { result } = renderHook(() => useVoiceRecording());

      expect(result.current.error).toBeNull();
    });
  });

  describe('녹음 시작', () => {
    it('startRecording 호출 시 마이크 권한을 요청한다', async () => {
      const { result } = renderHook(() => useVoiceRecording());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(mockRequestPermissions).toHaveBeenCalled();
    });

    it('권한 허용 후 녹음을 시작한다', async () => {
      mockUseAudioRecorderState.mockReturnValue({
        isRecording: true,
        canRecord: true,
        durationMillis: 0,
      } as never);

      const { result } = renderHook(() => useVoiceRecording());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalled();
      expect(mockRecorder.record).toHaveBeenCalled();
    });

    it('권한 거부 시 에러를 설정하고 녹음을 시작하지 않는다', async () => {
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

      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    it('오디오 모드를 설정한다', async () => {
      const { result } = renderHook(() => useVoiceRecording());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(mockSetAudioMode).toHaveBeenCalled();
    });
  });

  describe('녹음 중지', () => {
    it('stopRecording 호출 시 녹음을 중지하고 URI를 반환한다', async () => {
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

      expect(mockRecorder.stop).toHaveBeenCalled();
      expect(result.current.audioUri).toBe('file:///tmp/recording.m4a');
    });

    it('녹음 중이 아닐 때 stopRecording을 호출해도 에러가 발생하지 않는다', async () => {
      const { result } = renderHook(() => useVoiceRecording());

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('오디오 데이터 반환', () => {
    it('녹음 완료 후 audioUri를 제공한다', async () => {
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

      expect(result.current.audioUri).toBe('file:///tmp/recording.m4a');
    });

    it('uri가 null이면 audioUri가 null이다', async () => {
      mockUseAudioRecorderState.mockReturnValue({
        isRecording: true,
        canRecord: true,
        durationMillis: 1000,
      } as never);
      mockRecorder.uri = null;

      const { result } = renderHook(() => useVoiceRecording());

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.audioUri).toBeNull();
    });
  });

  describe('에러 처리', () => {
    it('녹음 시작 중 에러가 발생하면 error 상태를 설정한다', async () => {
      mockRecorder.record.mockImplementation(() => {
        throw new Error('녹음 시작 실패');
      });

      const { result } = renderHook(() => useVoiceRecording());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toBeTruthy();
    });

    it('녹음 중지 중 에러가 발생하면 error 상태를 설정한다', async () => {
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

      expect(result.current.error).toBeTruthy();
    });

    it('resetError 호출 시 에러를 초기화한다', async () => {
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

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.resetError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
