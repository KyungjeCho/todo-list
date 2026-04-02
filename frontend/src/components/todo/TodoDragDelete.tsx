import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../../theme';

interface TodoDragDeleteProps {
  isActive: boolean;
}

export const TodoDragDelete: React.FC<TodoDragDeleteProps> = ({ isActive }) => {
  if (!isActive) return null;

  return (
    <View
      testID="drag-delete-zone"
      style={styles.container}
      accessibilityLabel="삭제 영역"
    >
      <Text style={styles.icon}>&#128465;</Text>
      <Text style={styles.text}>여기에 놓으면 삭제</Text>
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
