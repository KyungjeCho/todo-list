import { renderHook, act } from '@testing-library/react-native';

const mockStart = jest.fn();
const mockStop = jest.fn();
const mockUseSpeechRecognitionEvent = jest.fn();

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    start: mockStart,
    stop: mockStop,
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  },
  useSpeechRecognitionEvent: mockUseSpeechRecognitionEvent,
}));

import i18n from 'src/i18n';
import { useSpeechRecognition } from 'src/features/voice/useSpeechRecognition';

describe('useSpeechRecognition', () => {
  let capturedListeners: Record<string, (...args: unknown[]) => void>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    capturedListeners = {};
    mockUseSpeechRecognitionEvent.mockImplementation(
      (event: string, handler: (...args: unknown[]) => void) => {
        capturedListeners[event] = handler;
      },
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(async () => {
    await i18n.changeLanguage('ko');
  });

  describe('언어별 STT locale 매핑 (T054)', () => {
    it('한국어 설정 시 ko-KR로 STT를 시작한다', async () => {
      await i18n.changeLanguage('ko');
      const { result } = renderHook(() =>
        useSpeechRecognition({ onFinal: jest.fn() }),
      );

      await act(async () => {
        await result.current.start();
      });

      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({ lang: 'ko-KR' }),
      );
    });

    it('영어 설정 시 en-US로 STT를 시작한다', async () => {
      await i18n.changeLanguage('en');
      const { result } = renderHook(() =>
        useSpeechRecognition({ onFinal: jest.fn() }),
      );

      await act(async () => {
        await result.current.start();
      });

      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({ lang: 'en-US' }),
      );
    });

    it('일본어 설정 시 ja-JP로 STT를 시작한다', async () => {
      await i18n.changeLanguage('ja');
      const { result } = renderHook(() =>
        useSpeechRecognition({ onFinal: jest.fn() }),
      );

      await act(async () => {
        await result.current.start();
      });

      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({ lang: 'ja-JP' }),
      );
    });

    it('스페인어 설정 시 es-ES로 STT를 시작한다', async () => {
      await i18n.changeLanguage('es');
      const { result } = renderHook(() =>
        useSpeechRecognition({ onFinal: jest.fn() }),
      );

      await act(async () => {
        await result.current.start();
      });

      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({ lang: 'es-ES' }),
      );
    });

    it('end 이벤트로 재시작 시 현재 언어 locale을 사용한다', async () => {
      await i18n.changeLanguage('ja');
      const { result } = renderHook(() =>
        useSpeechRecognition({ onFinal: jest.fn() }),
      );

      await act(async () => {
        await result.current.start();
      });

      mockStart.mockClear();

      act(() => {
        capturedListeners['end']?.({});
      });

      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({ lang: 'ja-JP' }),
      );
    });
  });

  it('start 호출 시 ExpoSpeechRecognitionModule.start를 호출한다', async () => {
    await i18n.changeLanguage('ko');
    const { result } = renderHook(() =>
      useSpeechRecognition({ onFinal: jest.fn() }),
    );

    await act(async () => {
      await result.current.start();
    });

    expect(mockStart).toHaveBeenCalledWith(
      expect.objectContaining({
        lang: 'ko-KR',
        continuous: true,
        interimResults: true,
      }),
    );
  });

  it('stop 호출 시 ExpoSpeechRecognitionModule.stop을 호출한다', async () => {
    const { result } = renderHook(() =>
      useSpeechRecognition({ onFinal: jest.fn() }),
    );

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    expect(mockStop).toHaveBeenCalled();
  });

  it('interim 결과를 interimText로 업데이트한다', async () => {
    const { result } = renderHook(() =>
      useSpeechRecognition({ onFinal: jest.fn() }),
    );

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      capturedListeners['result']?.({
        isFinal: false,
        results: [{ transcript: '장보기 가야' }],
      });
    });

    expect(result.current.interimText).toBe('장보기 가야');
  });

  it('isFinal 결과 시 onFinal 콜백을 호출한다', async () => {
    const onFinal = jest.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal }));

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      capturedListeners['result']?.({
        isFinal: true,
        results: [{ transcript: '장보기 가야 돼' }],
      });
    });

    expect(onFinal).toHaveBeenCalledWith('장보기 가야 돼');
  });

  it('에러 발생 시 error 상태를 설정한다', async () => {
    const { result } = renderHook(() =>
      useSpeechRecognition({ onFinal: jest.fn() }),
    );

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      capturedListeners['error']?.({
        error: 'recognition-failed',
        message: '인식 실패',
      });
    });

    expect(result.current.error).toBeTruthy();
  });

  it('iOS 60초 제한으로 end 이벤트 시 자동 재시작한다', async () => {
    const { result } = renderHook(() =>
      useSpeechRecognition({ onFinal: jest.fn() }),
    );

    await act(async () => {
      await result.current.start();
    });

    expect(mockStart).toHaveBeenCalledTimes(1);

    act(() => {
      capturedListeners['end']?.({});
    });

    expect(mockStart).toHaveBeenCalledTimes(2);
  });

  it('end 이벤트 시 남은 interim 텍스트를 final로 처리한다', async () => {
    const onFinal = jest.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal }));

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      capturedListeners['result']?.({
        isFinal: false,
        results: [{ transcript: '장보기 가야' }],
      });
    });

    expect(result.current.interimText).toBe('장보기 가야');

    act(() => {
      capturedListeners['end']?.({});
    });

    expect(onFinal).toHaveBeenCalledWith('장보기 가야');
    expect(result.current.interimText).toBe('');
  });

  it('stop 호출 시 남은 interim 텍스트를 final로 처리한다', async () => {
    const onFinal = jest.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal }));

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      capturedListeners['result']?.({
        isFinal: false,
        results: [{ transcript: '우유 사기' }],
      });
    });

    expect(result.current.interimText).toBe('우유 사기');

    act(() => {
      result.current.stop();
    });

    expect(onFinal).toHaveBeenCalledWith('우유 사기');
    expect(result.current.interimText).toBe('');
  });

  it('end 이벤트 시 interim 텍스트가 없으면 onFinal을 호출하지 않는다', async () => {
    const onFinal = jest.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal }));

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      capturedListeners['end']?.({});
    });

    expect(onFinal).not.toHaveBeenCalled();
  });

  it('silence timeout 후 interim 텍스트를 final로 확정한다', async () => {
    const onFinal = jest.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal }));

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      capturedListeners['result']?.({
        isFinal: false,
        results: [{ transcript: '빨래 돌리기' }],
      });
    });

    expect(result.current.interimText).toBe('빨래 돌리기');
    expect(onFinal).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(onFinal).toHaveBeenCalledWith('빨래 돌리기');
    expect(result.current.interimText).toBe('');
  });

  it('새로운 interim 결과가 오면 silence timer를 리셋한다', async () => {
    const onFinal = jest.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal }));

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      capturedListeners['result']?.({
        isFinal: false,
        results: [{ transcript: '빨래' }],
      });
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onFinal).not.toHaveBeenCalled();

    act(() => {
      capturedListeners['result']?.({
        isFinal: false,
        results: [{ transcript: '빨래 돌리기' }],
      });
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onFinal).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(onFinal).toHaveBeenCalledWith('빨래 돌리기');
  });

  it('isFinal 결과가 오면 silence timer를 취소한다', async () => {
    const onFinal = jest.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal }));

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      capturedListeners['result']?.({
        isFinal: false,
        results: [{ transcript: '빨래' }],
      });
    });

    act(() => {
      capturedListeners['result']?.({
        isFinal: true,
        results: [{ transcript: '빨래 돌리기' }],
      });
    });

    expect(onFinal).toHaveBeenCalledTimes(1);
    expect(onFinal).toHaveBeenCalledWith('빨래 돌리기');

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // silence timer가 취소되었으므로 추가 호출 없음
    expect(onFinal).toHaveBeenCalledTimes(1);
  });
});
