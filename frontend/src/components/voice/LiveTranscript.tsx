import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing } from '../../theme';

interface LiveTranscriptProps {
  interimText: string;
  isListening: boolean;
}

export const LiveTranscript: React.FC<LiveTranscriptProps> = ({
  interimText,
  isListening,
}) => {
  const { t } = useTranslation();
  if (!isListening) return null;

  return (
    <View style={styles.container} testID="live-transcript">
      <Text style={styles.text}>
        {interimText || t('voice.speakPlaceholder')}
      </Text>
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
