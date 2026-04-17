import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing } from '../../theme';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  type SupportedLanguage,
} from '../../i18n';
import { SoundPressable } from '../common/SoundPressable';
import { GlobeIcon, LanguageIcon, ChevronRightIcon } from './SettingsIcons';

interface LanguagePickerProps {
  timezone: string | null;
  displayLanguage: SupportedLanguage;
  onTimezonePress: () => void;
  onLanguageSelect: (language: SupportedLanguage) => void;
}

/** WHY: 지역/언어 설정 섹션을 분리하여 SettingsScreen 크기를 줄인다. */
export const LanguagePicker: React.FC<LanguagePickerProps> = ({
  timezone,
  displayLanguage,
  onTimezonePress,
  onLanguageSelect,
}) => {
  const { t } = useTranslation();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('settings.regionSettings')}</Text>

      <SoundPressable
        testID="timezone-button"
        style={styles.settingRow}
        onPress={onTimezonePress}
      >
        <View style={styles.iconContainer}>
          <GlobeIcon />
        </View>
        <Text style={[styles.settingLabel, styles.settingLabelFlex]}>
          {t('settings.timezone')}
        </Text>
        <Text testID="timezone-value" style={styles.settingValue}>
          {(timezone ?? '').split('/').pop() ?? timezone}
        </Text>
        <ChevronRightIcon />
      </SoundPressable>

      <SoundPressable
        testID="language-button"
        style={styles.settingRow}
        onPress={() => setShowLanguagePicker(!showLanguagePicker)}
      >
        <View style={styles.iconContainer}>
          <LanguageIcon />
        </View>
        <Text style={[styles.settingLabel, styles.settingLabelFlex]}>
          {t('settings.language')}
        </Text>
        <Text testID="language-value" style={styles.settingValue}>
          {LANGUAGE_LABELS[displayLanguage]}
        </Text>
        <ChevronRightIcon />
      </SoundPressable>

      {showLanguagePicker && (
        <View testID="language-picker">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <SoundPressable
              key={lang}
              style={styles.timezoneOption}
              onPress={() => {
                setShowLanguagePicker(false);
                onLanguageSelect(lang);
              }}
            >
              <Text
                style={[
                  styles.timezoneText,
                  lang === displayLanguage && styles.timezoneSelected,
                ]}
              >
                {LANGUAGE_LABELS[lang]}
              </Text>
            </SoundPressable>
          ))}
        </View>
      )}
    </View>
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
  settingValue: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 2,
  },
  timezoneOption: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
  },
  timezoneText: { ...typography.body, color: colors.onSurface },
  timezoneSelected: { fontWeight: '700', color: colors.primary },
});
