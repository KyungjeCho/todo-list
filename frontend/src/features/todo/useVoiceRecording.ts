import { useState, useCallback } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';
import i18n from '../../i18n';

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
        setError(i18n.t('voice.micPermissionRequired'));
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
      setError(
        err instanceof Error ? err.message : i18n.t('voice.recordStartFailed'),
      );
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
      setError(
        err instanceof Error ? err.message : i18n.t('voice.recordStopFailed'),
      );
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
