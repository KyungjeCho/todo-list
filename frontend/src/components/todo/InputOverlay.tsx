import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, spacing } from '../../theme';

interface InputOverlayProps {
  visible: boolean;
  mode: 'todo' | 'memo';
  placeholder: string;
  onSubmit: (text: string) => void;
  onClose: () => void;
}

export const InputOverlay: React.FC<InputOverlayProps> = ({
  visible,
  mode,
  placeholder,
  onSubmit,
  onClose,
}) => {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setText('');
    }
  }, [visible]);

  if (!visible) return null;

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
    setText('');
  };

  return (
    <View testID="input-overlay" style={styles.overlay}>
      <TouchableWithoutFeedback
        testID="input-overlay-backdrop"
        onPress={onClose}
      >
        <BlurView intensity={20} tint="dark" style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputWrapper}
        pointerEvents="box-none"
      >
        <View style={styles.spacer} pointerEvents="none" />
        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            testID="input-overlay-text-input"
            value={text}
            onChangeText={setText}
            onSubmitEditing={handleSubmit}
            placeholder={placeholder}
            placeholderTextColor={colors.disabled}
            maxLength={255}
            style={styles.textInput}
            accessibilityLabel={mode === 'todo' ? '할 일 입력' : '메모 입력'}
          />
          <TouchableOpacity
            testID="input-overlay-submit-button"
            onPress={handleSubmit}
            activeOpacity={0.8}
            style={styles.submitButton}
            accessibilityLabel={mode === 'todo' ? '할 일 추가' : '메모 추가'}
            accessibilityRole="button"
          >
            <Text style={styles.submitIcon}>+</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  spacer: {
    flex: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.onSurface,
  },
  submitButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitIcon: {
    color: colors.surface,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '400',
  },
});
