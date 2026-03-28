import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ModeToggleProps {
  mode: 'PLAN' | 'REVIEW';
  onToggle: () => void;
}

export const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onToggle }) => {
  return (
    <TouchableOpacity
      testID="mode-toggle-button"
      onPress={onToggle}
      accessibilityLabel={`${mode === 'PLAN' ? 'Review' : 'Plan'} 모드로 전환`}
      accessibilityRole="button"
      style={styles.container}
    >
      <Text style={styles.text}>
        {mode === 'PLAN' ? 'Review' : 'Plan'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  text: { fontSize: 14, fontWeight: '600' },
});
