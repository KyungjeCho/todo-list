import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { DraftTodoItem } from './DraftTodoItem';
import type { DraftTodo } from '../../features/voice/types';
import { spacing } from '../../theme';

interface DraftTodoListProps {
  drafts: DraftTodo[];
  onRemove: (id: string) => void;
}

export const DraftTodoList: React.FC<DraftTodoListProps> = ({
  drafts,
  onRemove,
}) => {
  return (
    <FlatList
      data={drafts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <DraftTodoItem draft={item} onRemove={onRemove} />
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      testID="draft-todo-list"
    />
  );
};

const styles = StyleSheet.create({
  list: {
    paddingVertical: spacing.sm,
  },
});
