import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { colors } from '../../theme';

interface PlanNotificationIconProps {
  /** 계획알림 활성 여부 — on/off 변형과 accessibilityLabel을 결정하는 단일 소스 */
  enabled: boolean;
  size?: number;
}

/**
 * 계획알림 상태 표시 아이콘.
 *
 * WHY(FR-005): 로컬 복사 state 없이 props의 `enabled`만 구독하여, 토글/프로필 갱신이
 * 즉시 시각적으로 반영되도록 한다.
 */
export const PlanNotificationIcon: React.FC<PlanNotificationIconProps> = ({
  enabled,
  size = 24,
}) => {
  const label = enabled ? '계획알림 활성' : '계획알림 비활성';
  return (
    <View testID="plan-notification-icon" accessibilityLabel={label} accessible>
      {enabled ? <BellOn size={size} /> : <BellOff size={size} />}
    </View>
  );
};

function BellOn({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21a2 2 0 01-3.46 0"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BellOff({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13.73 21a2 2 0 01-3.46 0"
        stroke={colors.disabled}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18.63 13A17.89 17.89 0 0118 8"
        stroke={colors.disabled}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14"
        stroke={colors.disabled}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18 8a6 6 0 00-9.33-5"
        stroke={colors.disabled}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1={1}
        y1={1}
        x2={23}
        y2={23}
        stroke={colors.disabled}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
