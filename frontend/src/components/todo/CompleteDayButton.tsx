import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

interface CarriedOverResult {
  carriedOverCount: number;
  carriedOverTodos: Array<{
    fromTodoId: string;
    toTodoId: string;
    content: string;
  }>;
}

interface CompleteDayButtonProps {
  onComplete: () => void;
  isLoading?: boolean;
  isCompleted?: boolean;
  carriedOverResult?: CarriedOverResult;
  error?: string;
}

export const CompleteDayButton: React.FC<CompleteDayButtonProps> = ({
  onComplete,
  isLoading,
  isCompleted,
  carriedOverResult,
  error,
}) => {
  const disabled = isLoading || isCompleted;

  const handlePress = () => {
    if (disabled) return;
    onComplete();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        testID="complete-day-button"
        onPress={handlePress}
        disabled={disabled}
        accessibilityLabel="오늘의 일정 완료"
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        style={[styles.button, disabled && styles.buttonDisabled]}
      >
        {isLoading ? (
          <ActivityIndicator
            testID="complete-day-loading"
            color="#fff"
            size="small"
          />
        ) : (
          <Text style={styles.buttonText}>일정 완료</Text>
        )}
      </TouchableOpacity>

      {isCompleted && (
        <Text testID="already-completed-text" style={styles.completedText}>
          오늘의 일정이 이미 완료되었습니다
        </Text>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {carriedOverResult && carriedOverResult.carriedOverCount > 0 && (
        <View testID="carried-over-result" style={styles.resultContainer}>
          <Text style={styles.resultTitle}>이월됨</Text>
          {carriedOverResult.carriedOverTodos.map((item) => (
            <Text key={item.fromTodoId} style={styles.resultItem}>
              {item.content}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#B0BEC5' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  completedText: {
    marginTop: 8,
    color: '#4CAF50',
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 8,
    color: '#F44336',
    fontSize: 14,
    textAlign: 'center',
  },
  resultContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 8,
  },
  resultItem: { fontSize: 13, color: '#795548', paddingVertical: 2 },
});
