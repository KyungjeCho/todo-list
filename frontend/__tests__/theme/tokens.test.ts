import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

/**
 * DESIGN_SYSTEM.md 정합성 검증
 * Paper 디자인 원본과 토큰 값이 정확히 일치하는지 확인
 */
describe('Design Tokens — DESIGN_SYSTEM.md 정합성', () => {
  describe('colors', () => {
    it('Primary 색상이 Paper 디자인과 일치한다', () => {
      expect(colors.primary).toBe('#6366F1');
      expect(colors.primaryLight).toBe('#EEF2FF');
    });

    it('Surface 색상이 Paper 디자인과 일치한다', () => {
      expect(colors.surface).toBe('#FFFFFF');
      expect(colors.surfaceDim).toBe('#F8FAFC');
      expect(colors.onSurface).toBe('#0F172A');
    });

    it('Border & Disabled 색상이 Paper 디자인과 일치한다', () => {
      expect(colors.border).toBe('#E2E8F0');
      expect(colors.borderLight).toBe('#F1F5F9');
      expect(colors.disabled).toBe('#94A3B8');
      expect(colors.muted).toBe('#CBD5E1');
      expect(colors.secondaryText).toBe('#64748B');
    });

    it('Semantic 색상이 Paper 디자인과 일치한다', () => {
      expect(colors.success).toBe('#22C55E');
      expect(colors.successLight).toBe('#4ADE80');
      expect(colors.warning).toBe('#F59E0B');
      expect(colors.warningLight).toBe('#FEF3C7');
      expect(colors.warningDark).toBe('#D97706');
      expect(colors.error).toBe('#EF4444');
    });

    it('Overlay 색상이 Paper 디자인과 일치한다', () => {
      expect(colors.overlay).toBe('#0F172A4D');
    });
  });

  describe('typography', () => {
    it('H1 스타일이 Paper 디자인과 일치한다', () => {
      expect(typography.h1).toEqual({
        fontSize: 24,
        fontWeight: '700',
        lineHeight: 32,
        fontFamily: 'NotoSans-Bold',
      });
    });

    it('H2 스타일이 Paper 디자인과 일치한다', () => {
      expect(typography.h2).toEqual({
        fontSize: 18,
        fontWeight: '600',
        lineHeight: 26,
        fontFamily: 'NotoSans-SemiBold',
      });
    });

    it('Body 스타일이 Paper 디자인과 일치한다', () => {
      expect(typography.body).toEqual({
        fontSize: 15,
        fontWeight: '400',
        lineHeight: 24,
        fontFamily: 'NotoSans-Regular',
      });
    });

    it('Caption 스타일이 Paper 디자인과 일치한다', () => {
      expect(typography.caption).toEqual({
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
        letterSpacing: 0.2,
        fontFamily: 'NotoSans-Medium',
      });
    });

    it('Overline 스타일이 Paper 디자인과 일치한다', () => {
      expect(typography.overline).toEqual({
        fontSize: 11,
        fontWeight: '600',
        lineHeight: 16,
        letterSpacing: 0.5,
        fontFamily: 'NotoSans-SemiBold',
      });
    });

    it('Label 스타일이 Paper 디자인과 일치한다', () => {
      expect(typography.label).toEqual({
        fontSize: 10,
        fontWeight: '600',
        lineHeight: 14,
        letterSpacing: 0.5,
        fontFamily: 'NotoSans-SemiBold',
      });
    });

    it('모든 폰트가 NotoSans 패밀리를 사용한다', () => {
      const styles = Object.values(typography);
      for (const style of styles) {
        expect(style.fontFamily).toMatch(/^NotoSans-/);
      }
    });
  });

  describe('spacing', () => {
    it('spacing 값이 Paper 디자인과 일치한다', () => {
      expect(spacing).toEqual({
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        xxl: 32,
      });
    });
  });

  describe('radius', () => {
    it('radius 값이 Paper 디자인과 일치한다', () => {
      expect(radius).toEqual({
        sm: 6,
        md: 8,
        lg: 12,
        xl: 14,
        xxl: 16,
        full: 9999,
      });
    });
  });

  describe('theme index re-exports', () => {
    it('통합 export가 모든 토큰을 포함한다', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const theme = require('../../src/theme');
      expect(theme.colors).toBeDefined();
      expect(theme.typography).toBeDefined();
      expect(theme.spacing).toBeDefined();
      expect(theme.radius).toBeDefined();
    });
  });
});
