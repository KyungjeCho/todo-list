import { renderHook, act } from '@testing-library/react-native';
import { Audio } from 'expo-av';
import { useVoiceRecording } from 'src/features/todo/useVoiceRecording';

jest.mock('expo-av');

const mockAudio = Audio as jest.Mocked<typeof Audio>;

describe('useVoiceRecording', () => {
  let mockRecordingInstance: {
    prepareToRecordAsync: jest.Mock;
    startAsync: jest.Mock;
    stopAndUnloadAsync: jest.Mock;
    getURI: jest.Mock;
    getStatusAsync: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRecordingInstance = {
      prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
      startAsync: jest.fn().mockResolvedValue(undefined),
      stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
      getURI: jest.fn().mockReturnValue('file:///tmp/recording.m4a'),
      getStatusAsync: jest.fn().mockResolvedValue({
        isRecording: false,
        durationMillis: 0,
      }),
    };

    (Audio.Recording as unknown as jest.Mock).mockImplementation(
      () => mockRecordingInstance,
    );
    mockAudio.requestPermissionsAsync.mockResolvedValue({
      status: 'granted',
    } as never);
    mockAudio.setAudioModeAsync.mockResolvedValue(undefined as never);
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

      expect(mockAudio.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('권한 허용 후 녹음을 시작한다', async () => {
      const { result } = renderHook(() => useVoiceRecording());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
      expect(mockRecordingInstance.prepareToRecordAsync).toHaveBeenCalled();
      expect(mockRecordingInstance.startAsync).toHaveBeenCalled();
    });

    it('권한 거부 시 에러를 설정하고 녹음을 시작하지 않는다', async () => {
      mockAudio.requestPermissionsAsync.mockResolvedValue({
        status: 'denied',
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

      expect(mockAudio.setAudioModeAsync).toHaveBeenCalled();
    });
  });

  describe('녹음 중지', () => {
    it('stopRecording 호출 시 녹음을 중지하고 URI를 반환한다', async () => {
      const { result } = renderHook(() => useVoiceRecording());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(mockRecordingInstance.stopAndUnloadAsync).toHaveBeenCalled();
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

  describe('���디오 데이터 반환', () => {
    it('녹음 완료 후 audioUri를 제공��다', async () => {
      const { result } = renderHook(() => useVoiceRecording());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.audioUri).toBe('file:///tmp/recording.m4a');
    });

    it('getURI가 null을 반환하면 audioUri가 null이다', async () => {
      mockRecordingInstance.getURI.mockReturnValue(null);

      const { result } = renderHook(() => useVoiceRecording());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.audioUri).toBeNull();
    });
  });

  describe('에러 처리', () => {
    it('녹음 시작 중 에러가 발생하면 error 상태를 설정한다', async () => {
      mockRecordingInstance.startAsync.mockRejectedValue(
        new Error('녹음 시작 실패'),
      );

      const { result } = renderHook(() => useVoiceRecording());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isRecording).toBe(false);
    });

    it('녹음 중지 중 에러가 발생하면 error 상태를 설정한다', async () => {
      mockRecordingInstance.stopAndUnloadAsync.mockRejectedValue(
        new Error('녹음 중지 실패'),
      );

      const { result } = renderHook(() => useVoiceRecording());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.error).toBeTruthy();
    });

    it('resetError 호출 시 에러를 초기화한다', async () => {
      mockAudio.requestPermissionsAsync.mockResolvedValue({
        status: 'denied',
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

  describe('정리 (cleanup)', () => {
    it('언마운트 시 진행 중인 녹음을 정리한다', async () => {
      const { result, unmount } = renderHook(() => useVoiceRecording());

      await act(async () => {
        await result.current.startRecording();
      });

      unmount();

      expect(mockRecordingInstance.stopAndUnloadAsync).toHaveBeenCalled();
    });
  });
});
