/**
 * TabBar — 하단 탭 네비게이션
 * 홈 / 캘린더 / 설정
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Line, Circle } from 'react-native-svg';
import { colors, typography } from '../theme';

type TabName = 'home' | 'calendar' | 'settings';

interface TabBarProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
}

const HomeIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 10.5L12 4l9 6.5" />
    <Path d="M5 9.5V19a1 1 0 001 1h12a1 1 0 001-1V9.5" />
    <Path d="M9 20v-6a1 1 0 011-1h4a1 1 0 011 1v6" />
  </Svg>
);

const CalendarIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Rect x={3} y={4} width={18} height={17} rx={2} />
    <Line x1={3} y1={9} x2={21} y2={9} />
    <Line x1={8} y1={2} x2={8} y2={6} />
    <Line x1={16} y1={2} x2={16} y2={6} />
  </Svg>
);

const SettingsIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={12} r={3} />
    <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-1.42 3.42 2 2 0 01-1.42-.59l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" />
  </Svg>
);

const tabs: { key: TabName; label: string; Icon: React.FC<{ color: string }> }[] = [
  { key: 'home', label: '홈', Icon: HomeIcon },
  { key: 'calendar', label: '캘린더', Icon: CalendarIcon },
  { key: 'settings', label: '설정', Icon: SettingsIcon },
];

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabPress }) => (
  <View style={styles.container}>
    {tabs.map(({ key, label, Icon }) => {
      const isActive = activeTab === key;
      const color = isActive ? colors.primary : colors.disabled;
      return (
        <TouchableOpacity key={key} style={styles.tab} onPress={() => onTabPress(key)}>
          <Icon color={color} />
          <Text style={[styles.label, { color }]}>{label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 32,
  },
  tab: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    ...typography.label,
  },
});
