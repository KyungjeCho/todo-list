import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../theme';

interface LoadingSpinnerProps {
  testID?: string;
}

/**
 * Centered ActivityIndicator for loading states.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ testID }) => (
  <View style={styles.container}>
    <ActivityIndicator testID={testID} size="large" color={colors.primary} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
