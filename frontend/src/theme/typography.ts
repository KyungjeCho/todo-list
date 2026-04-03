/**
 * Typography tokens — Noto Sans 기반
 * @see docs/designs/DESIGN_SYSTEM.md
 */
export const typography = {
  h1: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    fontFamily: 'NotoSans-Bold',
  },
  h2: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
    fontFamily: 'NotoSans-SemiBold',
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 24,
    fontFamily: 'NotoSans-Regular',
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
    letterSpacing: 0.2,
    fontFamily: 'NotoSans-Medium',
  },
  overline: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontFamily: 'NotoSans-SemiBold',
  },
  label: {
    fontSize: 10,
    fontWeight: '600' as const,
    lineHeight: 14,
    letterSpacing: 0.5,
    fontFamily: 'NotoSans-SemiBold',
  },
} as const;
