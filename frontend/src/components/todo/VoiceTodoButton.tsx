import React, { useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useVoiceRecording } from '../../features/todo/useVoiceRecording';

interface VoiceTodoButtonProps {
  onVoiceTodoCreated: (audioUri: string) => void;
  isProcessing?: boolean;
  processingError?: string;
  disabled?: boolean;
}

export const VoiceTodoButton: React.FC<VoiceTodoButtonProps> = ({
  onVoiceTodoCreated,
  isProcessing = false,
  processingError,
  disabled = false,
}) => {
  const { isRecording, audioUri, error, startRecording, stopRecording } =
    useVoiceRecording();

  useEffect(() => {
    if (audioUri) {
      onVoiceTodoCreated(audioUri);
    }
  }, [audioUri, onVoiceTodoCreated]);

  const isDisabled = disabled || isProcessing;

  if (isProcessing) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          testID="voice-todo-button"
          accessibilityLabel="음성으로 할 일 추가"
          accessibilityState={{ disabled: true }}
          disabled={true}
          style={[styles.button, styles.disabledButton]}
        >
          <Text style={styles.micIcon}>🎙</Text>
        </TouchableOpacity>
        <ActivityIndicator testID="voice-loading" style={styles.loading} />
      </View>
    );
  }

  if (isRecording) {
    return (
      <View style={styles.container}>
        <View
          testID="voice-recording-indicator"
          style={styles.recordingIndicator}
        >
          <Text style={styles.recordingText}>녹음 중...</Text>
        </View>
        <TouchableOpacity
          testID="voice-stop-button"
          accessibilityLabel="녹음 중지"
          onPress={stopRecording}
          style={[styles.button, styles.stopButton]}
        >
          <Text style={styles.stopIcon}>⏹</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="voice-todo-button"
          accessibilityLabel="음성으로 할 일 추가"
          onPress={startRecording}
          style={[styles.button, { display: 'none' }]}
        >
          <Text style={styles.micIcon}>🎙</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        testID="voice-todo-button"
        accessibilityLabel="음성으로 할 일 추가"
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        onPress={startRecording}
        style={[styles.button, isDisabled && styles.disabledButton]}
      >
        <Text style={styles.micIcon}>🎙</Text>
      </TouchableOpacity>
      {(error || processingError) && (
        <View testID="voice-error" style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || processingError}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  micIcon: {
    fontSize: 24,
  },
  stopIcon: {
    fontSize: 24,
  },
  recordingIndicator: {
    marginBottom: 8,
  },
  recordingText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  loading: {
    marginTop: 8,
  },
  errorContainer: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    textAlign: 'center',
  },
});
