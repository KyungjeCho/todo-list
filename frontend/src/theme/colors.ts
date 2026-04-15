/**
 * Color tokens — Paper 디자인 기준
 * @see docs/designs/DESIGN_SYSTEM.md
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

  overlay: '#0F172A4D',
} as const;

/**
 * 브랜드 그라데이션 — 로그인/온보딩 등 히어로 화면에서 사용.
 *
 * WHY(008-update-01-ui-fixes): 과거 `[primaryLight, surface]` 조합은 두 색 간 차이가
 * 10-포인트 미만이라 대부분 디스플레이에서 육안상 플랫하게 보여 "그라데이션이 안 나온다"는
 * 피드백이 반복됐다. 아래 팔레트는 Indigo-300 → Indigo-100 → White 3-stop으로
 * 톤 차이를 명확히 해 상단에서 브랜드 색이 분명히 인지되도록 한다.
 */
export const gradients = {
  brandHero: {
    colors: ['#A5B4FC', '#E0E7FF', '#FFFFFF'] as const,
    locations: [0, 0.55, 1] as const,
    start: { x: 0.5, y: 0 } as const,
    end: { x: 0.5, y: 1 } as const,
  },
} as const;
