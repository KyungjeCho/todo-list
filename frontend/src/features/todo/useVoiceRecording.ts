import { useState, useCallback } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  audioUri: string | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  resetError: () => void;
}

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const startRecording = useCallback(async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('마이크 권한이 필요합니다');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '녹음 시작에 실패했습니다');
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    if (!recorderState.isRecording) {
      return;
    }

    try {
      await recorder.stop();
      setAudioUri(recorder.uri);
    } catch (err) {
      setError(err instanceof Error ? err.message : '녹음 중지에 실패했습니다');
    }
  }, [recorder, recorderState.isRecording]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isRecording: recorderState.isRecording,
    audioUri,
    error,
    startRecording,
    stopRecording,
    resetError,
  };
}
