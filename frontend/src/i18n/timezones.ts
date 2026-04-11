/**
 * Intl.supportedValuesOf('timeZone') 미지원 디바이스를 위한
 * 정적 IANA 타임존 fallback 리스트.
 * 주요 타임존만 포함하며, 런타임 API가 사용 가능하면 이 리스트를 사용하지 않는다.
 */
export const STATIC_TIMEZONES: string[] = [
  'Pacific/Midway',
  'Pacific/Honolulu',
  'America/Anchorage',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Caracas',
  'America/Santiago',
  'America/Buenos_Aires',
  'America/Sao_Paulo',
  'Atlantic/South_Georgia',
  'Atlantic/Azores',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Istanbul',
  'Africa/Cairo',
  'Africa/Nairobi',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Pacific/Auckland',
  'Pacific/Fiji',
  'UTC',
];

/**
 * 런타임에 IANA 타임존 목록을 가져온다.
 * Intl.supportedValuesOf가 지원되면 동적 목록, 아니면 정적 fallback.
 */
export function getAvailableTimezones(): string[] {
  try {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      return (
        Intl as { supportedValuesOf: (key: string) => string[] }
      ).supportedValuesOf('timeZone');
    }
  } catch {
    // WHY: 구형 디바이스에서 supportedValuesOf가 존재하지만 실패할 수 있다
  }
  return STATIC_TIMEZONES;
}

/**
 * 타임존의 현재 UTC 오프셋을 'UTC+09:00' 형식으로 반환한다.
 */
export function getTimezoneOffset(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(new Date());
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    return offsetPart?.value ?? 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * 타임존의 UTC 오프셋을 분 단위로 반환한다 (정렬용).
 */
export function getTimezoneOffsetMinutes(timezone: string): number {
  try {
    const now = new Date();
    const utcStr = now.toLocaleString('en-US', { timeZone: 'UTC' });
    const tzStr = now.toLocaleString('en-US', { timeZone: timezone });
    const utcDate = new Date(utcStr);
    const tzDate = new Date(tzStr);
    return (tzDate.getTime() - utcDate.getTime()) / 60000;
  } catch {
    return 0;
  }
}
