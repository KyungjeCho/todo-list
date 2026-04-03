/**
 * 7. Settings
 * 알림 설정 / 지역 설정 / 정보 / 연락처
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Polyline, Rect } from 'react-native-svg';
import { colors, typography, spacing, radius } from '../theme';
import { TabBar } from '../components/TabBar';
import { ToggleSwitch } from '../components/Buttons';

interface SettingsScreenProps {
  planTime: string | null;
  reviewTime: string | null;
  timezone: string;
  onTogglePlan: () => void;
  onToggleReview: () => void;
  onChangeTimezone: () => void;
  onNavigateLicense: () => void;
  onNavigatePrivacy: () => void;
  onNavigateContact: () => void;
}

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

const SettingsRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
}> = ({ icon, label, value, trailing, onPress }) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
    <View style={styles.rowLeft}>
      {icon}
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {value && <Text style={[styles.rowValue, { color: value === '해제됨' ? colors.disabled : colors.primary }]}>{value}</Text>}
      </View>
    </View>
    {trailing || (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.disabled} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="9 18 15 12 9 6" />
      </Svg>
    )}
  </TouchableOpacity>
);

const BellIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <Path d="M13.73 21a2 2 0 01-3.46 0" />
  </Svg>
);

const GlobeIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={12} r={10} />
    <Line x1={2} y1={12} x2={22} y2={12} />
    <Path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </Svg>
);

const DocumentIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M14 3v4a1 1 0 001 1h4" />
    <Path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
    <Line x1={9} y1={13} x2={15} y2={13} />
    <Line x1={9} y1={17} x2={13} y2={17} />
  </Svg>
);

const ShieldIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Svg>
);

const MailIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Rect x={2} y={4} width={20} height={16} rx={2} />
    <Polyline points="22,6 12,13 2,6" />
  </Svg>
);

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  planTime, reviewTime, timezone,
  onTogglePlan, onToggleReview, onChangeTimezone,
  onNavigateLicense, onNavigatePrivacy, onNavigateContact,
}) => (
  <View style={styles.container}>
    <Text style={styles.title}>설정</Text>

    <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* 알림 설정 */}
      <SectionTitle title="알림 설정" />
      <SettingsRow
        icon={<BellIcon color={planTime ? colors.primary : colors.disabled} />}
        label="계획 알림"
        value={planTime ?? '해제됨'}
        trailing={<ToggleSwitch value={!!planTime} onToggle={onTogglePlan} />}
      />
      <SettingsRow
        icon={<BellIcon color={reviewTime ? colors.primary : colors.disabled} />}
        label="회고 알림"
        value={reviewTime ?? '해제됨'}
        trailing={<ToggleSwitch value={!!reviewTime} onToggle={onToggleReview} />}
      />

      {/* 지역 설정 */}
      <SectionTitle title="지역 설정" />
      <SettingsRow
        icon={<GlobeIcon />}
        label="타임존"
        onPress={onChangeTimezone}
        trailing={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ ...typography.body, color: colors.primary, fontWeight: '500' }}>{timezone}</Text>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.disabled} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Polyline points="9 18 15 12 9 6" />
            </Svg>
          </View>
        }
      />

      {/* 정보 */}
      <SectionTitle title="정보" />
      <SettingsRow icon={<DocumentIcon />} label="오픈소스 라이센스" onPress={onNavigateLicense} />
      <SettingsRow icon={<ShieldIcon />} label="개인정보 처리방침" onPress={onNavigatePrivacy} />

      {/* 연락처 */}
      <SettingsRow icon={<MailIcon />} label="연락처" onPress={onNavigateContact} />

      {/* Version */}
      <Text style={styles.version}>TodoList v1.0.0</Text>
    </ScrollView>

    <TabBar activeTab="settings" onTabPress={() => {}} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceDim },
  title: { ...typography.h1, color: colors.onSurface, paddingHorizontal: spacing.xl, paddingTop: 8, paddingBottom: 16 },
  scroll: { flex: 1 },
  sectionTitle: { ...typography.overline, color: colors.disabled, paddingHorizontal: spacing.xl, paddingTop: 24, paddingBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { gap: 2 },
  rowLabel: { ...typography.body, color: colors.onSurface },
  rowValue: { ...typography.caption },
  version: { ...typography.caption, color: colors.muted, textAlign: 'center', marginTop: 24 },
});
