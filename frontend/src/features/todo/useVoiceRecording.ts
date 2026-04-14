import { useState, useCallback } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';
import i18n from '../../i18n';
import { soundService } from '../sound/soundService';

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
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError(i18n.t('voice.micPermissionRequired'));
      return;
    }

    soundService.setRecordingActive(true);
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setError(null);
    } catch (err) {
      // WHY: 녹음 시작 실패 시에도 전역 오디오 세션을 플랫폼 기본값으로 복원해야
      //      이후 앱이 무음 모드/미디어 볼륨 정책을 계속 존중한다 (research.md R2).
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
      }).catch(() => undefined);
      soundService.setRecordingActive(false);
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
    } finally {
      // WHY: 녹음 세션 종료 후 전역 오디오 세션을 기본값으로 되돌려
      //      이후 무음 모드/미디어 볼륨 정책이 다시 적용되도록 한다.
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
      }).catch(() => undefined);
      soundService.setRecordingActive(false);
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
