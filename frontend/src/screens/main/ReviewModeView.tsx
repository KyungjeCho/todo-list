import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import type { Todo } from '../../types/todo';

interface Stats {
  total: number;
  completed: number;
  active: number;
  inactive: number;
  progressRate: number;
}

interface ReviewModeViewProps {
  todos: Todo[];
  stats: Stats;
  onToggleComplete?: (id: string) => void;
}

export const ReviewModeView: React.FC<ReviewModeViewProps> = ({
  todos,
  stats,
  onToggleComplete,
}) => {
  const { completedTodos, incompleteTodos } = useMemo(() => {
    const completed: Todo[] = [];
    const incomplete: Todo[] = [];

    for (const todo of todos) {
      if (todo.status === 'COMPLETED') {
        completed.push(todo);
      } else {
        incomplete.push(todo);
      }
    }

    return { completedTodos: completed, incompleteTodos: incomplete };
  }, [todos]);

  return (
    <View style={styles.container}>
      <View
        testID="review-progress-bar"
        accessibilityRole="progressbar"
        accessibilityLabel={`진행률 ${stats.progressRate}%`}
        style={styles.progressBarContainer}
      >
        <View
          style={[styles.progressBarFill, { width: `${stats.progressRate}%` }]}
        />
      </View>

      <Text testID="review-progress-rate" style={styles.progressText}>
        {stats.completed}/{stats.total} ({stats.progressRate}%)
      </Text>

      <View testID="review-completed-section" style={styles.section}>
        <Text style={styles.sectionTitle}>완료</Text>
        <FlatList
          data={completedTodos}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.todoRow}>
              <TouchableOpacity
                testID={`review-checkbox-${item.id}`}
                onPress={() => onToggleComplete?.(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: true }}
                style={[styles.checkbox, styles.checkboxChecked]}
              >
                <Text style={styles.checkmark}>&#10003;</Text>
              </TouchableOpacity>
              <Text style={styles.completedText}>{item.content}</Text>
            </View>
          )}
        />
      </View>

      <View testID="review-incomplete-section" style={styles.section}>
        <Text style={styles.sectionTitle}>미완료</Text>
        <FlatList
          data={incompleteTodos}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.todoRow}>
              {item.status !== 'CARRIED_OVER' && (
                <TouchableOpacity
                  testID={`review-checkbox-${item.id}`}
                  onPress={() => onToggleComplete?.(item.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: false }}
                  style={styles.checkbox}
                />
              )}
              <Text
                style={[
                  styles.todoText,
                  item.status === 'CARRIED_OVER' && styles.carriedOverText,
                ]}
              >
                {item.content}
              </Text>
              {item.isCarriedOver && (
                <Text style={styles.carriedOverBadge}>이월</Text>
              )}
            </View>
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  checkmark: { color: '#fff', fontSize: 13 },
  todoText: { fontSize: 14, flex: 1 },
  completedText: {
    fontSize: 14,
    flex: 1,
    textDecorationLine: 'line-through',
    color: '#888',
  },
  carriedOverText: { color: '#FF9800' },
  carriedOverBadge: {
    fontSize: 10,
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
