import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../theme';

interface LiveTranscriptProps {
  interimText: string;
  isListening: boolean;
}

export const LiveTranscript: React.FC<LiveTranscriptProps> = ({
  interimText,
  isListening,
}) => {
  if (!isListening) return null;

  return (
    <View style={styles.container} testID="live-transcript">
      <Text style={styles.text}>{interimText || '말씀하세요...'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    minHeight: 48,
    justifyContent: 'center',
  },
  text: {
    ...typography.body,
    color: colors.secondaryText,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
