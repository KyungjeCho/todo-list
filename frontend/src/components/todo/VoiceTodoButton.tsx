import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Line, Rect } from 'react-native-svg';
import type { RootStackParamList } from '../../app/navigation/types';
import { colors } from '../../theme';

interface VoiceTodoButtonProps {
  todoDate: string;
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

export const VoiceTodoButton: React.FC<VoiceTodoButtonProps> = ({
  todoDate,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handlePress = () => {
    navigation.navigate('VoiceInput', { todoDate });
  };

  return (
    <TouchableOpacity
      testID="voice-todo-button"
      accessibilityLabel={t('voice.addByVoice')}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      style={[styles.button, disabled && styles.disabledButton]}
    >
      <MicIcon />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
});
