import { useState, useCallback, useRef } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

/** 음성 입력이 멈춘 뒤 interim 텍스트를 final로 확정하기까지 대기 시간 (ms) */
const SILENCE_TIMEOUT_MS = 1500;

interface UseSpeechRecognitionOptions {
  onFinal: (text: string) => void;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  interimText: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

export function useSpeechRecognition({
  onFinal,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isListeningRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const interimTextRef = useRef('');
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushInterim = useCallback(() => {
    if (interimTextRef.current.trim()) {
      onFinalRef.current(interimTextRef.current.trim());
      setInterimText('');
      interimTextRef.current = '';
    }
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results?.[0]?.transcript ?? '';

    if (event.isFinal) {
      clearSilenceTimer();
      setInterimText('');
      interimTextRef.current = '';
      if (transcript.trim()) {
        onFinalRef.current(transcript.trim());
      }
    } else {
      setInterimText(transcript);
      interimTextRef.current = transcript;

      // WHY: continuous 모드에서 엔진의 isFinal 감지가 5-10초 걸릴 수 있어
      // 클라이언트 측 silence timeout으로 빠르게 확정
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        flushInterim();
      }, SILENCE_TIMEOUT_MS);
    }
  });

  const hasErrorRef = useRef(false);

  useSpeechRecognitionEvent('error', (event) => {
    hasErrorRef.current = true;
    setError(event.message || '음성 인식 오류가 발생했습니다.');
  });

  // WHY: iOS는 60초 후 STT 세션이 자동 종료됨. 녹음 중이면 즉시 재시작하여 연속 인식 유지
  // WHY: 플랫폼에 따라 isFinal 결과 없이 세션이 종료될 수 있어 남은 interim 텍스트를 final로 처리
  useSpeechRecognitionEvent('end', () => {
    clearSilenceTimer();
    flushInterim();

    // WHY: 에러로 인한 종료 시 재시작하면 무한 루프 발생 가능 — 에러 상태에서는 재시작하지 않음
    if (isListeningRef.current && !hasErrorRef.current) {
      ExpoSpeechRecognitionModule.start({
        lang: 'ko-KR',
        continuous: true,
        interimResults: true,
      });
    }
  });

  const start = useCallback(async () => {
    setError(null);
    hasErrorRef.current = false;
    setInterimText('');

    const { granted } =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setError('마이크 권한이 필요합니다.');
      return;
    }

    isListeningRef.current = true;
    setIsListening(true);

    ExpoSpeechRecognitionModule.start({
      lang: 'ko-KR',
      continuous: true,
      interimResults: true,
    });
  }, []);

  const stop = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    clearSilenceTimer();
    flushInterim();
    ExpoSpeechRecognitionModule.stop();
  }, [clearSilenceTimer, flushInterim]);

  return { isListening, interimText, error, start, stop };
}
