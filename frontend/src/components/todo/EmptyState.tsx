import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { colors, typography, spacing, radius } from '../../theme';

/** Checkmark icon — docs/designs/icons/checkmark.svg 기반 */
const CheckmarkIcon: React.FC = () => (
  <Svg
    testID="empty-state-checkmark"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke={colors.primary}
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M9 11l3 3L22 4" />
    <Path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </Svg>
);

export const EmptyState: React.FC = () => {
  const { t } = useTranslation();
  return (
    <View testID="empty-state" style={styles.container}>
      <View testID="empty-state-icon-container" style={styles.iconContainer}>
        <CheckmarkIcon />
      </View>
      <Text style={styles.title}>{t('todo.emptyTitle')}</Text>
      <Text style={styles.caption}>{t('todo.emptyCaption')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.onSurface,
  },
  caption: {
    ...typography.caption,
    color: colors.secondaryText,
    textAlign: 'center',
  },
});
