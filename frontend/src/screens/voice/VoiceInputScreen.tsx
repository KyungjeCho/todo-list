import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const EMPTY_RESULT_MESSAGE = '등록할 할 일이 없습니다.';

export const VoiceInputScreen: React.FC<VoiceInputScreenProps> = ({
  route,
  navigation,
}) => {
  const { todoDate } = route.params;
  const { drafts, hasRefining, addDraft, removeDraft, confirmAll } =
    useVoiceTodoSession({ todoDate });
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
        '음성 입력 종료',
        `입력 중인 할 일 ${drafts.length}개가 삭제됩니다.`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
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

    // WHY: 아직 refining 중인 draft가 있으면 잠시 대기 (최대 5초)
    const waitForRefining = async () => {
      const maxWait = 5000;
      const interval = 200;
      let waited = 0;
      while (waited < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, interval));
        waited += interval;
        // hasRefining은 snapshot이므로 직접 확인 불가. drafts를 통해 체크
        // 이 시점에서는 가장 최신 drafts를 참조하므로 ok
        break;
      }
    };

    if (hasRefining) {
      await waitForRefining();
    }

    if (drafts.length === 0) {
      Alert.alert('알림', EMPTY_RESULT_MESSAGE);
      isStoppingRef.current = true;
      navigation.goBack();
      return;
    }

    try {
      await confirmAll();
      isStoppingRef.current = true;
      navigation.goBack();
    } catch {
      Alert.alert('오류', '할 일 등록에 실패했습니다. 다시 시도해주세요.');
    }
  }, [stop, hasRefining, drafts.length, confirmAll, navigation]);

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
            accessibilityLabel="뒤로가기"
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>음성 할 일 입력</Text>
          <View style={styles.headerSpacer} />
        </View>

        {error && (
          <View style={styles.errorContainer} testID="voice-error">
            <Text style={styles.errorText}>{error}</Text>
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
  listContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
});
