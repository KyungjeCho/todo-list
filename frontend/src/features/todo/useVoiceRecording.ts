import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  audioUri: string | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  resetError: () => void;
}

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (String(permission.status) !== 'granted') {
        setError('마이크 권한이 필요합니다');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '녹음 시작에 실패했습니다');
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) {
      return;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      setAudioUri(uri);
      setIsRecording(false);
      recordingRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : '녹음 중지에 실패했습니다');
      setIsRecording(false);
      recordingRef.current = null;
    }
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  return {
    isRecording,
    audioUri,
    error,
    startRecording,
    stopRecording,
    resetError,
  };
}
