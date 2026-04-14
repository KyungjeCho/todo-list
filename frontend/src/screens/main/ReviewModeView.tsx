import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Todo } from '../../types/todo';
import { SoundPressable } from '../../components/common/SoundPressable';
import { colors, typography, spacing, radius } from '../../theme';

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
  const { t } = useTranslation();
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
        accessibilityLabel={t('main.completionRate', {
          rate: stats.progressRate,
        })}
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
        <Text style={[styles.sectionTitle, styles.sectionTitleCompleted]}>
          {t('review.completed')}
        </Text>
        <FlatList
          data={completedTodos}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.todoRow}>
              <SoundPressable
                testID={`review-checkbox-${item.id}`}
                onPress={() => onToggleComplete?.(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: true }}
                style={[styles.checkbox, styles.checkboxChecked]}
              >
                <Text style={styles.checkmark}>&#10003;</Text>
              </SoundPressable>
              <Text style={styles.completedText}>{item.content}</Text>
            </View>
          )}
        />
      </View>

      <View testID="review-incomplete-section" style={styles.section}>
        <Text style={[styles.sectionTitle, styles.sectionTitleIncomplete]}>
          {t('review.incomplete')}
        </Text>
        <FlatList
          data={incompleteTodos}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.todoRow}>
              {item.status !== 'CARRIED_OVER' && (
                <SoundPressable
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
                <Text style={styles.carriedOverBadge}>
                  {t('common.carriedOver')}
                </Text>
              )}
            </View>
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  progressText: {
    ...typography.body,
    color: colors.secondaryText,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    ...typography.overline,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  sectionTitleCompleted: {
    color: colors.success,
  },
  sectionTitleIncomplete: {
    color: colors.warning,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.muted,
    borderRadius: radius.sm,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: { color: colors.surface, fontSize: 13 },
  todoText: { ...typography.body, flex: 1 },
  completedText: {
    ...typography.body,
    flex: 1,
    textDecorationLine: 'line-through',
    color: colors.disabled,
  },
  carriedOverText: { color: colors.warning },
  carriedOverBadge: {
    ...typography.label,
    color: colors.warningDark,
    backgroundColor: colors.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
