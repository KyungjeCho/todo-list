import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { colors, typography, spacing } from '../../theme';

interface AddTodoInputProps {
  onAdd: (content: string) => void;
  isLoading?: boolean;
}

export const AddTodoInput: React.FC<AddTodoInputProps> = ({
  onAdd,
  isLoading = false,
}) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (isLoading) return;
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onAdd(trimmed);
    setText('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        testID="add-todo-input"
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSubmit}
        placeholder="할 일을 입력하세요"
        maxLength={255}
        editable={!isLoading}
        accessibilityLabel="할 일 입력"
        style={styles.input}
      />
      <TouchableOpacity
        testID="add-todo-button"
        onPress={handleSubmit}
        disabled={isLoading}
        accessibilityLabel="할 일 추가"
        accessibilityState={{ disabled: isLoading }}
        accessibilityRole="button"
        style={[styles.button, isLoading && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  input: {
    flex: 1,
    ...typography.body,
    padding: spacing.sm,
    marginRight: spacing.sm,
    color: colors.onSurface,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.surface, fontSize: 24, lineHeight: 28 },
});
