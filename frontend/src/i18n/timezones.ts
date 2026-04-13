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

export interface TimezoneEntry {
  tz: string;
  offsetMinutes: number;
  offsetLabel: string;
}

// WHY: ~420개 타임존 오프셋 계산은 수십 ms 블로킹 작업이라 캐시가 필요하지만,
// DST 경계에서 오프셋이 바뀌므로 영구 캐시는 부정확한 라벨/정렬을 유발한다.
// TTL 1시간으로 제한해 장시간 실행 중인 앱에서도 최악의 경우 한 시간 내에 갱신되도록 한다.
const CACHE_TTL_MS = 60 * 60 * 1000;
let cachedEntries: TimezoneEntry[] | null = null;
let cachedAt = 0;

/** `GMT+09:00`, `GMT-5`, `GMT+5:30`, `GMT`, `UTC` 형식을 분 단위로 파싱한다. */
function parseOffsetLabelToMinutes(label: string): number {
  const match = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(label);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  return sign * (hours * 60 + minutes);
}

/**
 * 사용 가능한 모든 타임존을 `{ tz, offsetMinutes, offsetLabel }` 형태로 반환한다.
 * 오프셋 오름차순으로 정렬되어 있으며, 결과는 TTL(기본 1시간) 동안 캐시된다.
 */
export function getTimezoneEntries(): TimezoneEntry[] {
  const now = new Date();
  if (cachedEntries && now.getTime() - cachedAt < CACHE_TTL_MS) {
    return cachedEntries;
  }
  // WHY: Intl.supportedValuesOf('timeZone')은 구현에 따라 'UTC'/'Etc/*'를 포함하지 않아
  // 사용자 current='UTC'가 목록에서 사라지는 문제가 있다. 항상 UTC를 포함하도록 보장한다.
  const timezones = Array.from(new Set([...getAvailableTimezones(), 'UTC']));
  const entries = timezones.map<TimezoneEntry>((tz) => {
    try {
      // WHY: shortOffset 한 번의 포맷 호출로 라벨과 분 단위 오프셋을 모두 얻어
      // 기존 `toLocaleString` 2회 호출(약 840회)을 제거한다.
      const parts = new Intl.DateTimeFormat('en', {
        timeZone: tz,
        timeZoneName: 'shortOffset',
      }).formatToParts(now);
      const offsetLabel =
        parts.find((p) => p.type === 'timeZoneName')?.value ?? 'UTC';
      return {
        tz,
        offsetMinutes: parseOffsetLabelToMinutes(offsetLabel),
        offsetLabel,
      };
    } catch {
      return { tz, offsetMinutes: 0, offsetLabel: 'UTC' };
    }
  });
  entries.sort((a, b) => a.offsetMinutes - b.offsetMinutes);
  cachedEntries = entries;
  cachedAt = now.getTime();
  return entries;
}

/** 테스트 또는 DST 전환 직후 강제 무효화가 필요할 때 사용. */
export function clearTimezoneEntriesCache(): void {
  cachedEntries = null;
  cachedAt = 0;
}
