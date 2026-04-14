import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SoundPressable } from '../common/SoundPressable';
import { colors, typography, spacing } from '../../theme';

interface AddTodoInputProps {
  onAdd: (content: string) => void;
  isLoading?: boolean;
}

export const AddTodoInput: React.FC<AddTodoInputProps> = ({
  onAdd,
  isLoading = false,
}) => {
  const { t } = useTranslation();
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
        placeholder={t('main.todoPlaceholder')}
        maxLength={255}
        editable={!isLoading}
        accessibilityLabel={t('todo.todoInput')}
        style={styles.input}
      />
      <SoundPressable
        testID="add-todo-button"
        onPress={handleSubmit}
        disabled={isLoading}
        accessibilityLabel={t('todo.addTodo')}
        accessibilityState={{ disabled: isLoading }}
        accessibilityRole="button"
        style={[styles.button, isLoading && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>+</Text>
      </SoundPressable>
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
