/**
 * Design System Tokens — Paper 디자인 기준
 * 실제 구현 시 frontend/src/theme/ 로 이동
 */

export const colors = {
  primary: '#6366F1',
  primaryLight: '#EEF2FF',

  surface: '#FFFFFF',
  surfaceDim: '#F8FAFC',
  onSurface: '#0F172A',

  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  disabled: '#94A3B8',
  muted: '#CBD5E1',
  secondaryText: '#64748B',

  success: '#22C55E',
  successLight: '#4ADE80',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#D97706',
  error: '#EF4444',

  // OAuth brand colors
  naver: '#03C75A',
  kakao: '#FEE500',
  apple: '#1E293B',
} as const;

export const typography = {
  h1: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, fontFamily: 'NotoSans-Bold' },
  h2: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26, fontFamily: 'NotoSans-SemiBold' },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 24, fontFamily: 'NotoSans-Regular' },
  caption: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18, letterSpacing: 0.2, fontFamily: 'NotoSans-Medium' },
  overline: { fontSize: 11, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 0.5, fontFamily: 'NotoSans-SemiBold' },
  label: { fontSize: 10, fontWeight: '600' as const, lineHeight: 14, letterSpacing: 0.5, fontFamily: 'NotoSans-SemiBold' },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 14,
  xxl: 16,
  full: 9999,
} as const;
