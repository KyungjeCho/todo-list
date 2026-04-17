import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius } from '../../theme';
import { SoundPressable } from '../common/SoundPressable';
import {
  DocumentIcon,
  ShieldIcon,
  MailIcon,
  ChevronRightIcon,
} from './SettingsIcons';

interface AccountSettingsProps {
  onNavigateContact?: () => void;
  onLogout?: () => void | Promise<void>;
  handleLogoutPress: () => void;
}

/** WHY: 정보/계정 섹션을 분리하여 SettingsScreen 크기를 줄인다. */
export const AccountSettings: React.FC<AccountSettingsProps> = ({
  onNavigateContact,
  onLogout,
  handleLogoutPress,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.info')}</Text>

        <SoundPressable style={styles.settingRow}>
          <View style={styles.iconContainer}>
            <DocumentIcon />
          </View>
          <Text style={[styles.settingLabel, styles.settingLabelFlex]}>
            {t('settings.openSourceLicense')}
          </Text>
          <ChevronRightIcon />
        </SoundPressable>

        <SoundPressable style={styles.settingRow}>
          <View style={styles.iconContainer}>
            <ShieldIcon />
          </View>
          <Text style={[styles.settingLabel, styles.settingLabelFlex]}>
            {t('settings.privacyPolicy')}
          </Text>
          <ChevronRightIcon />
        </SoundPressable>
      </View>

      <SoundPressable style={styles.settingRow} onPress={onNavigateContact}>
        <View style={styles.iconContainer}>
          <MailIcon />
        </View>
        <Text style={[styles.settingLabel, styles.settingLabelFlex]}>
          {t('settings.contact')}
        </Text>
        <ChevronRightIcon />
      </SoundPressable>

      {onLogout && (
        <SoundPressable
          testID="logout-button"
          style={styles.logoutButton}
          onPress={handleLogoutPress}
        >
          <Text style={styles.logoutText}>{t('settings.logout')}</Text>
        </SoundPressable>
      )}

      <Text style={styles.versionText}>TodoList v1.0.0</Text>
    </>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    ...typography.overline,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  iconContainer: {
    marginRight: spacing.md,
  },
  settingLabel: {
    ...typography.body,
    color: colors.onSurface,
  },
  settingLabelFlex: { flex: 1 },
  logoutButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  versionText: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
});
