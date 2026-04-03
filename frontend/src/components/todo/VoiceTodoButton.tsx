import React, { useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Svg, { Path, Line, Rect } from 'react-native-svg';
import { useVoiceRecording } from '../../features/todo/useVoiceRecording';
import { colors } from '../../theme';

interface VoiceTodoButtonProps {
  onVoiceTodoCreated: (audioUri: string) => void;
  isProcessing?: boolean;
  processingError?: string;
  disabled?: boolean;
}

function MicIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect
        x={9}
        y={1}
        width={6}
        height={12}
        rx={3}
        stroke={colors.surface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19 10v2a7 7 0 01-14 0v-2"
        stroke={colors.surface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1={12}
        y1={19}
        x2={12}
        y2={23}
        stroke={colors.surface}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Line
        x1={8}
        y1={23}
        x2={16}
        y2={23}
        stroke={colors.surface}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function StopIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={4} width={16} height={16} rx={2} fill={colors.surface} />
    </Svg>
  );
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
          <MicIcon />
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
          <StopIcon />
        </TouchableOpacity>
        <TouchableOpacity
          testID="voice-todo-button"
          accessibilityLabel="음성으로 할 일 추가"
          onPress={startRecording}
          style={[styles.button, { display: 'none' }]}
        >
          <MicIcon />
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
        <MicIcon />
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
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  stopButton: {
    backgroundColor: colors.error,
  },
  recordingIndicator: {
    marginBottom: 8,
  },
  recordingText: {
    color: colors.error,
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
    color: colors.error,
    fontSize: 12,
    textAlign: 'center',
  },
});
