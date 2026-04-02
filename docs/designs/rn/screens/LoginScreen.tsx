/**
 * 1. Login Screen
 * 배경: Indigo 50 → White 그라데이션
 * OAuth: Google / Naver / Kakao / Apple
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { colors, typography } from '../theme';

const CheckmarkLogo = () => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 11l3 3L22 4" />
    <Path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </Svg>
);

interface OAuthButtonProps {
  provider: 'google' | 'naver' | 'kakao' | 'apple';
  onPress: () => void;
}

const oauthConfig = {
  google: { bg: colors.surface, border: colors.border, textColor: '#334155', label: 'Google로 계속하기' },
  naver: { bg: colors.naver, border: 'transparent', textColor: '#FFFFFF', label: '네이버로 계속하기' },
  kakao: { bg: colors.kakao, border: 'transparent', textColor: '#1E293B', label: '카카오로 계속하기' },
  apple: { bg: colors.apple, border: 'transparent', textColor: '#FFFFFF', label: 'Apple로 계속하기' },
};

const OAuthButton: React.FC<OAuthButtonProps> = ({ provider, onPress }) => {
  const config = oauthConfig[provider];
  return (
    <TouchableOpacity
      style={[styles.oauthButton, { backgroundColor: config.bg, borderColor: config.border, borderWidth: config.border === 'transparent' ? 0 : 1 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* OAuth 브랜드 아이콘은 각 프로바이더 SVG 삽입 */}
      <Text style={[styles.oauthText, { color: config.textColor }]}>{config.label}</Text>
    </TouchableOpacity>
  );
};

export const LoginScreen: React.FC = () => (
  <LinearGradient colors={[colors.primaryLight, colors.surface]} style={styles.container}>
    <View style={styles.branding}>
      <CheckmarkLogo />
      <Text style={styles.title}>TodoList</Text>
      <Text style={styles.subtitle}>하루를 계획하고 돌아보세요</Text>
    </View>

    <View style={styles.oauthContainer}>
      <OAuthButton provider="google" onPress={() => {}} />
      <OAuthButton provider="naver" onPress={() => {}} />
      <OAuthButton provider="kakao" onPress={() => {}} />
      <OAuthButton provider="apple" onPress={() => {}} />
    </View>
  </LinearGradient>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branding: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 60,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -1,
  },
  subtitle: {
    ...typography.body,
    color: colors.secondaryText,
  },
  oauthContainer: {
    width: 310,
    gap: 12,
  },
  oauthButton: {
    height: 54,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  oauthText: {
    fontSize: 14,
    fontWeight: '400',
  },
});
