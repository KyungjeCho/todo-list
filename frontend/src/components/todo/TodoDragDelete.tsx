import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography } from '../../theme';

interface TodoDragDeleteProps {
  isActive: boolean;
}

export const TodoDragDelete: React.FC<TodoDragDeleteProps> = ({ isActive }) => {
  const { t } = useTranslation();
  if (!isActive) return null;

  return (
    <View
      testID="drag-delete-zone"
      style={styles.container}
      accessibilityLabel={t('todo.dragDelete')}
    >
      <Text style={styles.icon}>&#128465;</Text>
      <Text style={styles.text}>{t('todo.dragDeleteInstruction')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  icon: { fontSize: 24, marginRight: 8 },
  text: {
    color: colors.surface,
    ...typography.body,
    fontWeight: '700',
  },
});
