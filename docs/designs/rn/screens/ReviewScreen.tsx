/**
 * 4. Main — Review Mode
 * 헤더: Review H1 + [Plan][공유]
 * 진행 바 + 완료/미완료 섹션 + 일정 완료 버튼
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme';
import { TabBar } from '../components/TabBar';
import { TodoItem } from '../components/TodoItem';
import { SecondaryPill, GhostButton, PrimaryButton } from '../components/Buttons';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  isCarryOver?: boolean;
}

interface ReviewScreenProps {
  todos: Todo[];
  onSwitchToPlan: () => void;
  onShare: () => void;
  onComplete: () => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  todos, onSwitchToPlan, onShare, onComplete,
}) => {
  const completed = todos.filter(t => t.completed);
  const incomplete = todos.filter(t => !t.completed);
  const total = todos.length;
  const percentage = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Review</Text>
        <View style={styles.headerButtons}>
          <SecondaryPill label="Plan" onPress={onSwitchToPlan} />
          <GhostButton label="공유" onPress={onShare} />
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
      </View>

      {/* Progress Text */}
      <View style={styles.progressText}>
        <Text style={styles.progressCount}>{completed.length}/{total}</Text>
        <Text style={styles.progressPercent}>({percentage}%)</Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 완료 섹션 */}
        {completed.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>완료</Text>
            {completed.map(item => (
              <TodoItem key={item.id} text={item.text} completed />
            ))}
          </>
        )}

        {/* 미완료 섹션 */}
        {incomplete.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, styles.sectionWarning]}>미완료</Text>
            {incomplete.map(item => (
              <TodoItem key={item.id} text={item.text} completed={false} isCarryOver={item.isCarryOver} />
            ))}
          </>
        )}
      </ScrollView>

      {/* 일정 완료 버튼 */}
      <View style={styles.bottomButton}>
        <PrimaryButton label="일정 완료" onPress={onComplete} />
      </View>

      <TabBar activeTab="home" onTabPress={() => {}} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceDim,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    ...typography.h1,
    color: colors.onSurface,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginHorizontal: spacing.xl,
    marginVertical: 8,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  progressText: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.xl,
    paddingBottom: 8,
  },
  progressCount: {
    ...typography.caption,
    color: colors.onSurface,
  },
  progressPercent: {
    ...typography.caption,
    color: colors.disabled,
  },
  list: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.success,
    paddingHorizontal: spacing.xl,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionWarning: {
    color: colors.warning,
  },
  bottomButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
  },
});
