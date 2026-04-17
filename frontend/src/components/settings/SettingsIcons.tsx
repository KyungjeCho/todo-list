import Svg, { Path, Circle, Line, Rect, Polyline } from 'react-native-svg';
import { colors } from '../../theme';

export function BellIcon({ muted }: { muted?: boolean }) {
  if (muted) {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
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
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
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

export function GlobeIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={12}
        r={10}
        stroke={colors.onSurface}
        strokeWidth={1.5}
      />
      <Path
        d="M2 12h20"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function DocumentIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="14 2 14 8 20 8"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShieldIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MailIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect
        x={2}
        y={4}
        width={20}
        height={16}
        rx={2}
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="22 7 12 13 2 7"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SpeakerIcon({ muted }: { muted?: boolean }) {
  const stroke = muted ? colors.disabled : colors.onSurface;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 5L6 9H2v6h4l5 4V5z"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {muted ? (
        <>
          <Line
            x1={23}
            y1={9}
            x2={17}
            y2={15}
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <Line
            x1={17}
            y1={9}
            x2={23}
            y2={15}
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </>
      ) : (
        <Path
          d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

export function LanguageIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 8l6 6"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 14l6-6 2-3"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2 5h12"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M7 2v3"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M22 22l-5-10-5 10"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 18h6"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ChevronRightIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={colors.disabled}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
