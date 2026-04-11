import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../app/navigation/types';
import { useSpeechRecognition } from '../../features/voice/useSpeechRecognition';
import { useVoiceTodoSession } from '../../features/voice/useVoiceTodoSession';
import { DraftTodoList } from '../../components/voice/DraftTodoList';
import { LiveTranscript } from '../../components/voice/LiveTranscript';
import { VoiceControls } from '../../components/voice/VoiceControls';
import { colors, typography, spacing } from '../../theme';

type VoiceInputScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'VoiceInput'
>;

export const VoiceInputScreen: React.FC<VoiceInputScreenProps> = ({
  route,
  navigation,
}) => {
  const { t } = useTranslation();
  const { todoDate } = route.params;
  const { drafts, addDraft, removeDraft, confirmAll } = useVoiceTodoSession({
    todoDate,
  });
  const { isListening, interimText, error, start, stop } = useSpeechRecognition(
    { onFinal: addDraft },
  );
  const isStoppingRef = useRef(false);

  useEffect(() => {
    start();
  }, [start]);

  // WHY: beforeRemove 이벤트로 뒤로가기를 가로채서 임시 할 일 데이터 손실 방지
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isStoppingRef.current) return;
      if (drafts.length === 0) {
        stop();
        return;
      }

      e.preventDefault();

      Alert.alert(
        t('voice.exitTitle'),
        t('voice.exitMessage', { count: drafts.length }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => {
              stop();
              navigation.dispatch(e.data.action);
            },
          },
        ],
      );
    });

    return unsubscribe;
  }, [navigation, drafts.length, stop]);

  const handleStop = useCallback(async () => {
    stop();

    if (drafts.length === 0) {
      Alert.alert(t('common.notification'), t('todo.noTodosToRegister'));
      isStoppingRef.current = true;
      navigation.goBack();
      return;
    }

    try {
      await confirmAll();
      isStoppingRef.current = true;
      navigation.goBack();
    } catch {
      Alert.alert(t('common.error'), t('voice.registerFailed'));
    }
  }, [stop, drafts.length, confirmAll, navigation]);

  return (
    <LinearGradient
      colors={[colors.primaryLight, colors.surface]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            testID="voice-back-button"
            onPress={() => navigation.goBack()}
            accessibilityLabel={t('voice.goBack')}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('voice.screenTitle')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {error && (
          <View style={styles.errorContainer} testID="voice-error">
            <Text style={styles.errorText}>{error}</Text>
            {!isListening && (
              <TouchableOpacity
                testID="voice-retry-button"
                onPress={start}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.listContainer}>
          <DraftTodoList drafts={drafts} onRemove={removeDraft} />
        </View>

        <LiveTranscript interimText={interimText} isListening={isListening} />

        <VoiceControls isListening={isListening} onStop={handleStop} />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  backIcon: {
    fontSize: 24,
    color: colors.onSurface,
  },
  title: {
    ...typography.h2,
    color: colors.onSurface,
  },
  headerSpacer: {
    width: 32,
  },
  errorContainer: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
  retryButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.error,
    borderRadius: 4,
  },
  retryText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
});
