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

// WHY(FR-012~014, 008): 타임존 라벨은 앱 언어와 무관하게 영어 고정이며,
// 저장·전송 포맷은 IANA 원문을 유지한다. 따라서 i18n 리소스·`t()`에 의존하지 않는
// 순수 상수 매핑으로만 라벨을 조립하고, 매핑되지 않은 IANA는 원문을 폴백으로 사용한다.
export interface CountryCityLabel {
  countryEn: string;
  cityEn: string;
}

export const TZ_TO_COUNTRY_CITY: Record<string, CountryCityLabel> = {
  // ── East Asia ──────────────────────────────────────────────────────
  'Asia/Seoul': { countryEn: 'South Korea', cityEn: 'Seoul' },
  'Asia/Pyongyang': { countryEn: 'North Korea', cityEn: 'Pyongyang' },
  'Asia/Tokyo': { countryEn: 'Japan', cityEn: 'Tokyo' },
  'Asia/Shanghai': { countryEn: 'China', cityEn: 'Shanghai' },
  'Asia/Urumqi': { countryEn: 'China', cityEn: 'Urumqi' },
  'Asia/Hong_Kong': { countryEn: 'Hong Kong', cityEn: 'Hong Kong' },
  'Asia/Macau': { countryEn: 'Macau', cityEn: 'Macau' },
  'Asia/Taipei': { countryEn: 'Taiwan', cityEn: 'Taipei' },
  'Asia/Ulaanbaatar': { countryEn: 'Mongolia', cityEn: 'Ulaanbaatar' },
  'Asia/Hovd': { countryEn: 'Mongolia', cityEn: 'Hovd' },
  'Asia/Choibalsan': { countryEn: 'Mongolia', cityEn: 'Choibalsan' },

  // ── Southeast Asia ─────────────────────────────────────────────────
  'Asia/Bangkok': { countryEn: 'Thailand', cityEn: 'Bangkok' },
  'Asia/Vientiane': { countryEn: 'Laos', cityEn: 'Vientiane' },
  'Asia/Phnom_Penh': { countryEn: 'Cambodia', cityEn: 'Phnom Penh' },
  'Asia/Ho_Chi_Minh': { countryEn: 'Vietnam', cityEn: 'Ho Chi Minh' },
  'Asia/Saigon': { countryEn: 'Vietnam', cityEn: 'Ho Chi Minh' },
  'Asia/Kuala_Lumpur': { countryEn: 'Malaysia', cityEn: 'Kuala Lumpur' },
  'Asia/Kuching': { countryEn: 'Malaysia', cityEn: 'Kuching' },
  'Asia/Singapore': { countryEn: 'Singapore', cityEn: 'Singapore' },
  'Asia/Brunei': { countryEn: 'Brunei', cityEn: 'Bandar Seri Begawan' },
  'Asia/Jakarta': { countryEn: 'Indonesia', cityEn: 'Jakarta' },
  'Asia/Pontianak': { countryEn: 'Indonesia', cityEn: 'Pontianak' },
  'Asia/Makassar': { countryEn: 'Indonesia', cityEn: 'Makassar' },
  'Asia/Jayapura': { countryEn: 'Indonesia', cityEn: 'Jayapura' },
  'Asia/Manila': { countryEn: 'Philippines', cityEn: 'Manila' },
  'Asia/Dili': { countryEn: 'East Timor', cityEn: 'Dili' },
  'Asia/Yangon': { countryEn: 'Myanmar', cityEn: 'Yangon' },
  'Asia/Rangoon': { countryEn: 'Myanmar', cityEn: 'Yangon' },

  // ── South & Central Asia ───────────────────────────────────────────
  'Asia/Kolkata': { countryEn: 'India', cityEn: 'Kolkata' },
  'Asia/Calcutta': { countryEn: 'India', cityEn: 'Kolkata' },
  'Asia/Colombo': { countryEn: 'Sri Lanka', cityEn: 'Colombo' },
  'Asia/Dhaka': { countryEn: 'Bangladesh', cityEn: 'Dhaka' },
  'Asia/Kathmandu': { countryEn: 'Nepal', cityEn: 'Kathmandu' },
  'Asia/Thimphu': { countryEn: 'Bhutan', cityEn: 'Thimphu' },
  'Asia/Karachi': { countryEn: 'Pakistan', cityEn: 'Karachi' },
  'Asia/Kabul': { countryEn: 'Afghanistan', cityEn: 'Kabul' },
  'Asia/Tashkent': { countryEn: 'Uzbekistan', cityEn: 'Tashkent' },
  'Asia/Samarkand': { countryEn: 'Uzbekistan', cityEn: 'Samarkand' },
  'Asia/Ashgabat': { countryEn: 'Turkmenistan', cityEn: 'Ashgabat' },
  'Asia/Ashkhabad': { countryEn: 'Turkmenistan', cityEn: 'Ashgabat' },
  'Asia/Dushanbe': { countryEn: 'Tajikistan', cityEn: 'Dushanbe' },
  'Asia/Bishkek': { countryEn: 'Kyrgyzstan', cityEn: 'Bishkek' },
  'Asia/Almaty': { countryEn: 'Kazakhstan', cityEn: 'Almaty' },
  'Asia/Aqtau': { countryEn: 'Kazakhstan', cityEn: 'Aqtau' },
  'Asia/Aqtobe': { countryEn: 'Kazakhstan', cityEn: 'Aqtobe' },
  'Asia/Atyrau': { countryEn: 'Kazakhstan', cityEn: 'Atyrau' },
  'Asia/Oral': { countryEn: 'Kazakhstan', cityEn: 'Oral' },
  'Asia/Qyzylorda': { countryEn: 'Kazakhstan', cityEn: 'Qyzylorda' },
  'Asia/Qostanay': { countryEn: 'Kazakhstan', cityEn: 'Qostanay' },

  // ── Middle East ────────────────────────────────────────────────────
  'Asia/Dubai': { countryEn: 'United Arab Emirates', cityEn: 'Dubai' },
  'Asia/Muscat': { countryEn: 'Oman', cityEn: 'Muscat' },
  'Asia/Qatar': { countryEn: 'Qatar', cityEn: 'Doha' },
  'Asia/Bahrain': { countryEn: 'Bahrain', cityEn: 'Manama' },
  'Asia/Riyadh': { countryEn: 'Saudi Arabia', cityEn: 'Riyadh' },
  'Asia/Kuwait': { countryEn: 'Kuwait', cityEn: 'Kuwait City' },
  'Asia/Baghdad': { countryEn: 'Iraq', cityEn: 'Baghdad' },
  'Asia/Tehran': { countryEn: 'Iran', cityEn: 'Tehran' },
  'Asia/Amman': { countryEn: 'Jordan', cityEn: 'Amman' },
  'Asia/Beirut': { countryEn: 'Lebanon', cityEn: 'Beirut' },
  'Asia/Damascus': { countryEn: 'Syria', cityEn: 'Damascus' },
  'Asia/Jerusalem': { countryEn: 'Israel', cityEn: 'Jerusalem' },
  'Asia/Tel_Aviv': { countryEn: 'Israel', cityEn: 'Tel Aviv' },
  'Asia/Gaza': { countryEn: 'Palestine', cityEn: 'Gaza' },
  'Asia/Hebron': { countryEn: 'Palestine', cityEn: 'Hebron' },
  'Asia/Nicosia': { countryEn: 'Cyprus', cityEn: 'Nicosia' },
  'Asia/Famagusta': { countryEn: 'Cyprus', cityEn: 'Famagusta' },
  'Asia/Tbilisi': { countryEn: 'Georgia', cityEn: 'Tbilisi' },
  'Asia/Yerevan': { countryEn: 'Armenia', cityEn: 'Yerevan' },
  'Asia/Baku': { countryEn: 'Azerbaijan', cityEn: 'Baku' },

  // ── Russia (Asia side) ─────────────────────────────────────────────
  'Asia/Yekaterinburg': { countryEn: 'Russia', cityEn: 'Yekaterinburg' },
  'Asia/Omsk': { countryEn: 'Russia', cityEn: 'Omsk' },
  'Asia/Novosibirsk': { countryEn: 'Russia', cityEn: 'Novosibirsk' },
  'Asia/Novokuznetsk': { countryEn: 'Russia', cityEn: 'Novokuznetsk' },
  'Asia/Barnaul': { countryEn: 'Russia', cityEn: 'Barnaul' },
  'Asia/Tomsk': { countryEn: 'Russia', cityEn: 'Tomsk' },
  'Asia/Krasnoyarsk': { countryEn: 'Russia', cityEn: 'Krasnoyarsk' },
  'Asia/Irkutsk': { countryEn: 'Russia', cityEn: 'Irkutsk' },
  'Asia/Chita': { countryEn: 'Russia', cityEn: 'Chita' },
  'Asia/Yakutsk': { countryEn: 'Russia', cityEn: 'Yakutsk' },
  'Asia/Khandyga': { countryEn: 'Russia', cityEn: 'Khandyga' },
  'Asia/Vladivostok': { countryEn: 'Russia', cityEn: 'Vladivostok' },
  'Asia/Sakhalin': { countryEn: 'Russia', cityEn: 'Sakhalin' },
  'Asia/Magadan': { countryEn: 'Russia', cityEn: 'Magadan' },
  'Asia/Srednekolymsk': { countryEn: 'Russia', cityEn: 'Srednekolymsk' },
  'Asia/Kamchatka': { countryEn: 'Russia', cityEn: 'Kamchatka' },
  'Asia/Anadyr': { countryEn: 'Russia', cityEn: 'Anadyr' },
  'Asia/Ust-Nera': { countryEn: 'Russia', cityEn: 'Ust-Nera' },

  // ── Europe ─────────────────────────────────────────────────────────
  'Europe/London': { countryEn: 'United Kingdom', cityEn: 'London' },
  'Europe/Dublin': { countryEn: 'Ireland', cityEn: 'Dublin' },
  'Europe/Lisbon': { countryEn: 'Portugal', cityEn: 'Lisbon' },
  'Europe/Madrid': { countryEn: 'Spain', cityEn: 'Madrid' },
  'Europe/Paris': { countryEn: 'France', cityEn: 'Paris' },
  'Europe/Amsterdam': { countryEn: 'Netherlands', cityEn: 'Amsterdam' },
  'Europe/Brussels': { countryEn: 'Belgium', cityEn: 'Brussels' },
  'Europe/Luxembourg': { countryEn: 'Luxembourg', cityEn: 'Luxembourg' },
  'Europe/Monaco': { countryEn: 'Monaco', cityEn: 'Monaco' },
  'Europe/Andorra': { countryEn: 'Andorra', cityEn: 'Andorra la Vella' },
  'Europe/Gibraltar': { countryEn: 'Gibraltar', cityEn: 'Gibraltar' },
  'Europe/Berlin': { countryEn: 'Germany', cityEn: 'Berlin' },
  'Europe/Busingen': { countryEn: 'Germany', cityEn: 'Büsingen' },
  'Europe/Zurich': { countryEn: 'Switzerland', cityEn: 'Zurich' },
  'Europe/Vaduz': { countryEn: 'Liechtenstein', cityEn: 'Vaduz' },
  'Europe/Vienna': { countryEn: 'Austria', cityEn: 'Vienna' },
  'Europe/Rome': { countryEn: 'Italy', cityEn: 'Rome' },
  'Europe/Vatican': { countryEn: 'Vatican City', cityEn: 'Vatican' },
  'Europe/San_Marino': { countryEn: 'San Marino', cityEn: 'San Marino' },
  'Europe/Malta': { countryEn: 'Malta', cityEn: 'Valletta' },
  'Europe/Copenhagen': { countryEn: 'Denmark', cityEn: 'Copenhagen' },
  'Europe/Stockholm': { countryEn: 'Sweden', cityEn: 'Stockholm' },
  'Europe/Oslo': { countryEn: 'Norway', cityEn: 'Oslo' },
  'Europe/Helsinki': { countryEn: 'Finland', cityEn: 'Helsinki' },
  'Europe/Mariehamn': { countryEn: 'Åland Islands', cityEn: 'Mariehamn' },
  'Europe/Reykjavik': { countryEn: 'Iceland', cityEn: 'Reykjavik' },
  'Europe/Warsaw': { countryEn: 'Poland', cityEn: 'Warsaw' },
  'Europe/Prague': { countryEn: 'Czech Republic', cityEn: 'Prague' },
  'Europe/Bratislava': { countryEn: 'Slovakia', cityEn: 'Bratislava' },
  'Europe/Budapest': { countryEn: 'Hungary', cityEn: 'Budapest' },
  'Europe/Bucharest': { countryEn: 'Romania', cityEn: 'Bucharest' },
  'Europe/Sofia': { countryEn: 'Bulgaria', cityEn: 'Sofia' },
  'Europe/Athens': { countryEn: 'Greece', cityEn: 'Athens' },
  'Europe/Belgrade': { countryEn: 'Serbia', cityEn: 'Belgrade' },
  'Europe/Sarajevo': {
    countryEn: 'Bosnia and Herzegovina',
    cityEn: 'Sarajevo',
  },
  'Europe/Ljubljana': { countryEn: 'Slovenia', cityEn: 'Ljubljana' },
  'Europe/Zagreb': { countryEn: 'Croatia', cityEn: 'Zagreb' },
  'Europe/Skopje': { countryEn: 'North Macedonia', cityEn: 'Skopje' },
  'Europe/Tirane': { countryEn: 'Albania', cityEn: 'Tirana' },
  'Europe/Podgorica': { countryEn: 'Montenegro', cityEn: 'Podgorica' },
  'Europe/Chisinau': { countryEn: 'Moldova', cityEn: 'Chișinău' },
  'Europe/Tiraspol': { countryEn: 'Moldova', cityEn: 'Tiraspol' },
  'Europe/Kiev': { countryEn: 'Ukraine', cityEn: 'Kyiv' },
  'Europe/Kyiv': { countryEn: 'Ukraine', cityEn: 'Kyiv' },
  'Europe/Uzhgorod': { countryEn: 'Ukraine', cityEn: 'Uzhhorod' },
  'Europe/Zaporozhye': { countryEn: 'Ukraine', cityEn: 'Zaporizhzhia' },
  'Europe/Simferopol': { countryEn: 'Ukraine', cityEn: 'Simferopol' },
  'Europe/Minsk': { countryEn: 'Belarus', cityEn: 'Minsk' },
  'Europe/Moscow': { countryEn: 'Russia', cityEn: 'Moscow' },
  'Europe/Kaliningrad': { countryEn: 'Russia', cityEn: 'Kaliningrad' },
  'Europe/Volgograd': { countryEn: 'Russia', cityEn: 'Volgograd' },
  'Europe/Samara': { countryEn: 'Russia', cityEn: 'Samara' },
  'Europe/Saratov': { countryEn: 'Russia', cityEn: 'Saratov' },
  'Europe/Astrakhan': { countryEn: 'Russia', cityEn: 'Astrakhan' },
  'Europe/Ulyanovsk': { countryEn: 'Russia', cityEn: 'Ulyanovsk' },
  'Europe/Kirov': { countryEn: 'Russia', cityEn: 'Kirov' },
  'Europe/Istanbul': { countryEn: 'Turkey', cityEn: 'Istanbul' },
  'Europe/Tallinn': { countryEn: 'Estonia', cityEn: 'Tallinn' },
  'Europe/Riga': { countryEn: 'Latvia', cityEn: 'Riga' },
  'Europe/Vilnius': { countryEn: 'Lithuania', cityEn: 'Vilnius' },
  'Europe/Jersey': { countryEn: 'Jersey', cityEn: 'Saint Helier' },
  'Europe/Guernsey': { countryEn: 'Guernsey', cityEn: 'Saint Peter Port' },
  'Europe/Isle_of_Man': { countryEn: 'Isle of Man', cityEn: 'Douglas' },

  // ── Africa ─────────────────────────────────────────────────────────
  'Africa/Cairo': { countryEn: 'Egypt', cityEn: 'Cairo' },
  'Africa/Tripoli': { countryEn: 'Libya', cityEn: 'Tripoli' },
  'Africa/Tunis': { countryEn: 'Tunisia', cityEn: 'Tunis' },
  'Africa/Algiers': { countryEn: 'Algeria', cityEn: 'Algiers' },
  'Africa/Casablanca': { countryEn: 'Morocco', cityEn: 'Casablanca' },
  'Africa/El_Aaiun': { countryEn: 'Western Sahara', cityEn: 'El Aaiún' },
  'Africa/Nouakchott': { countryEn: 'Mauritania', cityEn: 'Nouakchott' },
  'Africa/Bamako': { countryEn: 'Mali', cityEn: 'Bamako' },
  'Africa/Timbuktu': { countryEn: 'Mali', cityEn: 'Timbuktu' },
  'Africa/Ouagadougou': { countryEn: 'Burkina Faso', cityEn: 'Ouagadougou' },
  'Africa/Niamey': { countryEn: 'Niger', cityEn: 'Niamey' },
  'Africa/Dakar': { countryEn: 'Senegal', cityEn: 'Dakar' },
  'Africa/Banjul': { countryEn: 'Gambia', cityEn: 'Banjul' },
  'Africa/Bissau': { countryEn: 'Guinea-Bissau', cityEn: 'Bissau' },
  'Africa/Conakry': { countryEn: 'Guinea', cityEn: 'Conakry' },
  'Africa/Freetown': { countryEn: 'Sierra Leone', cityEn: 'Freetown' },
  'Africa/Monrovia': { countryEn: 'Liberia', cityEn: 'Monrovia' },
  'Africa/Abidjan': { countryEn: 'Ivory Coast', cityEn: 'Abidjan' },
  'Africa/Accra': { countryEn: 'Ghana', cityEn: 'Accra' },
  'Africa/Lome': { countryEn: 'Togo', cityEn: 'Lomé' },
  'Africa/Porto-Novo': { countryEn: 'Benin', cityEn: 'Porto-Novo' },
  'Africa/Lagos': { countryEn: 'Nigeria', cityEn: 'Lagos' },
  'Africa/Douala': { countryEn: 'Cameroon', cityEn: 'Douala' },
  'Africa/Ndjamena': { countryEn: 'Chad', cityEn: "N'Djamena" },
  'Africa/Bangui': {
    countryEn: 'Central African Republic',
    cityEn: 'Bangui',
  },
  'Africa/Malabo': { countryEn: 'Equatorial Guinea', cityEn: 'Malabo' },
  'Africa/Libreville': { countryEn: 'Gabon', cityEn: 'Libreville' },
  'Africa/Sao_Tome': {
    countryEn: 'São Tomé and Príncipe',
    cityEn: 'São Tomé',
  },
  'Africa/Brazzaville': {
    countryEn: 'Republic of the Congo',
    cityEn: 'Brazzaville',
  },
  'Africa/Kinshasa': {
    countryEn: 'Democratic Republic of the Congo',
    cityEn: 'Kinshasa',
  },
  'Africa/Lubumbashi': {
    countryEn: 'Democratic Republic of the Congo',
    cityEn: 'Lubumbashi',
  },
  'Africa/Luanda': { countryEn: 'Angola', cityEn: 'Luanda' },
  'Africa/Windhoek': { countryEn: 'Namibia', cityEn: 'Windhoek' },
  'Africa/Gaborone': { countryEn: 'Botswana', cityEn: 'Gaborone' },
  'Africa/Harare': { countryEn: 'Zimbabwe', cityEn: 'Harare' },
  'Africa/Lusaka': { countryEn: 'Zambia', cityEn: 'Lusaka' },
  'Africa/Maputo': { countryEn: 'Mozambique', cityEn: 'Maputo' },
  'Africa/Mbabane': { countryEn: 'Eswatini', cityEn: 'Mbabane' },
  'Africa/Maseru': { countryEn: 'Lesotho', cityEn: 'Maseru' },
  'Africa/Johannesburg': { countryEn: 'South Africa', cityEn: 'Johannesburg' },
  'Africa/Khartoum': { countryEn: 'Sudan', cityEn: 'Khartoum' },
  'Africa/Juba': { countryEn: 'South Sudan', cityEn: 'Juba' },
  'Africa/Addis_Ababa': { countryEn: 'Ethiopia', cityEn: 'Addis Ababa' },
  'Africa/Asmara': { countryEn: 'Eritrea', cityEn: 'Asmara' },
  'Africa/Asmera': { countryEn: 'Eritrea', cityEn: 'Asmara' },
  'Africa/Djibouti': { countryEn: 'Djibouti', cityEn: 'Djibouti' },
  'Africa/Mogadishu': { countryEn: 'Somalia', cityEn: 'Mogadishu' },
  'Africa/Nairobi': { countryEn: 'Kenya', cityEn: 'Nairobi' },
  'Africa/Kampala': { countryEn: 'Uganda', cityEn: 'Kampala' },
  'Africa/Kigali': { countryEn: 'Rwanda', cityEn: 'Kigali' },
  'Africa/Bujumbura': { countryEn: 'Burundi', cityEn: 'Bujumbura' },
  'Africa/Dar_es_Salaam': { countryEn: 'Tanzania', cityEn: 'Dar es Salaam' },
  'Africa/Blantyre': { countryEn: 'Malawi', cityEn: 'Blantyre' },
  'Africa/Ceuta': { countryEn: 'Spain', cityEn: 'Ceuta' },

  // ── North America: United States ───────────────────────────────────
  'America/New_York': { countryEn: 'United States', cityEn: 'New York' },
  'America/Detroit': { countryEn: 'United States', cityEn: 'Detroit' },
  'America/Kentucky/Louisville': {
    countryEn: 'United States',
    cityEn: 'Louisville',
  },
  'America/Kentucky/Monticello': {
    countryEn: 'United States',
    cityEn: 'Monticello',
  },
  'America/Indiana/Indianapolis': {
    countryEn: 'United States',
    cityEn: 'Indianapolis',
  },
  'America/Indianapolis': {
    countryEn: 'United States',
    cityEn: 'Indianapolis',
  },
  'America/Indiana/Vincennes': {
    countryEn: 'United States',
    cityEn: 'Vincennes',
  },
  'America/Indiana/Winamac': { countryEn: 'United States', cityEn: 'Winamac' },
  'America/Indiana/Marengo': { countryEn: 'United States', cityEn: 'Marengo' },
  'America/Indiana/Petersburg': {
    countryEn: 'United States',
    cityEn: 'Petersburg',
  },
  'America/Indiana/Vevay': { countryEn: 'United States', cityEn: 'Vevay' },
  'America/Indiana/Tell_City': {
    countryEn: 'United States',
    cityEn: 'Tell City',
  },
  'America/Indiana/Knox': { countryEn: 'United States', cityEn: 'Knox' },
  'America/Knox_IN': { countryEn: 'United States', cityEn: 'Knox' },
  'America/Chicago': { countryEn: 'United States', cityEn: 'Chicago' },
  'America/Menominee': { countryEn: 'United States', cityEn: 'Menominee' },
  'America/North_Dakota/Beulah': {
    countryEn: 'United States',
    cityEn: 'Beulah',
  },
  'America/North_Dakota/Center': {
    countryEn: 'United States',
    cityEn: 'Center',
  },
  'America/North_Dakota/New_Salem': {
    countryEn: 'United States',
    cityEn: 'New Salem',
  },
  'America/Denver': { countryEn: 'United States', cityEn: 'Denver' },
  'America/Boise': { countryEn: 'United States', cityEn: 'Boise' },
  'America/Phoenix': { countryEn: 'United States', cityEn: 'Phoenix' },
  'America/Los_Angeles': { countryEn: 'United States', cityEn: 'Los Angeles' },
  'America/Anchorage': { countryEn: 'United States', cityEn: 'Anchorage' },
  'America/Juneau': { countryEn: 'United States', cityEn: 'Juneau' },
  'America/Sitka': { countryEn: 'United States', cityEn: 'Sitka' },
  'America/Metlakatla': { countryEn: 'United States', cityEn: 'Metlakatla' },
  'America/Yakutat': { countryEn: 'United States', cityEn: 'Yakutat' },
  'America/Nome': { countryEn: 'United States', cityEn: 'Nome' },
  'America/Adak': { countryEn: 'United States', cityEn: 'Adak' },
  'America/Atka': { countryEn: 'United States', cityEn: 'Adak' },
  'America/Shiprock': { countryEn: 'United States', cityEn: 'Shiprock' },
  'Pacific/Honolulu': { countryEn: 'United States', cityEn: 'Honolulu' },
  'Pacific/Johnston': { countryEn: 'United States', cityEn: 'Johnston' },
  'Pacific/Midway': { countryEn: 'United States', cityEn: 'Midway' },
  'Pacific/Wake': { countryEn: 'United States', cityEn: 'Wake Island' },
  'Pacific/Pago_Pago': { countryEn: 'American Samoa', cityEn: 'Pago Pago' },
  'Pacific/Samoa': { countryEn: 'American Samoa', cityEn: 'Pago Pago' },
  'Pacific/Guam': { countryEn: 'Guam', cityEn: 'Hagåtña' },
  'Pacific/Saipan': {
    countryEn: 'Northern Mariana Islands',
    cityEn: 'Saipan',
  },
  'America/Puerto_Rico': { countryEn: 'Puerto Rico', cityEn: 'San Juan' },
  'America/St_Thomas': {
    countryEn: 'U.S. Virgin Islands',
    cityEn: 'Saint Thomas',
  },
  'America/Virgin': {
    countryEn: 'U.S. Virgin Islands',
    cityEn: 'Saint Thomas',
  },

  // ── North America: Canada ──────────────────────────────────────────
  'America/Toronto': { countryEn: 'Canada', cityEn: 'Toronto' },
  'America/Montreal': { countryEn: 'Canada', cityEn: 'Montreal' },
  'America/Vancouver': { countryEn: 'Canada', cityEn: 'Vancouver' },
  'America/Edmonton': { countryEn: 'Canada', cityEn: 'Edmonton' },
  'America/Winnipeg': { countryEn: 'Canada', cityEn: 'Winnipeg' },
  'America/Halifax': { countryEn: 'Canada', cityEn: 'Halifax' },
  'America/St_Johns': { countryEn: 'Canada', cityEn: "St. John's" },
  'America/Regina': { countryEn: 'Canada', cityEn: 'Regina' },
  'America/Swift_Current': { countryEn: 'Canada', cityEn: 'Swift Current' },
  'America/Moncton': { countryEn: 'Canada', cityEn: 'Moncton' },
  'America/Goose_Bay': { countryEn: 'Canada', cityEn: 'Goose Bay' },
  'America/Blanc-Sablon': { countryEn: 'Canada', cityEn: 'Blanc-Sablon' },
  'America/Atikokan': { countryEn: 'Canada', cityEn: 'Atikokan' },
  'America/Coral_Harbour': { countryEn: 'Canada', cityEn: 'Coral Harbour' },
  'America/Nipigon': { countryEn: 'Canada', cityEn: 'Nipigon' },
  'America/Rainy_River': { countryEn: 'Canada', cityEn: 'Rainy River' },
  'America/Thunder_Bay': { countryEn: 'Canada', cityEn: 'Thunder Bay' },
  'America/Resolute': { countryEn: 'Canada', cityEn: 'Resolute' },
  'America/Rankin_Inlet': { countryEn: 'Canada', cityEn: 'Rankin Inlet' },
  'America/Pangnirtung': { countryEn: 'Canada', cityEn: 'Pangnirtung' },
  'America/Whitehorse': { countryEn: 'Canada', cityEn: 'Whitehorse' },
  'America/Yellowknife': { countryEn: 'Canada', cityEn: 'Yellowknife' },
  'America/Iqaluit': { countryEn: 'Canada', cityEn: 'Iqaluit' },
  'America/Inuvik': { countryEn: 'Canada', cityEn: 'Inuvik' },
  'America/Cambridge_Bay': { countryEn: 'Canada', cityEn: 'Cambridge Bay' },
  'America/Creston': { countryEn: 'Canada', cityEn: 'Creston' },
  'America/Dawson': { countryEn: 'Canada', cityEn: 'Dawson' },
  'America/Dawson_Creek': { countryEn: 'Canada', cityEn: 'Dawson Creek' },
  'America/Fort_Nelson': { countryEn: 'Canada', cityEn: 'Fort Nelson' },
  'America/Glace_Bay': { countryEn: 'Canada', cityEn: 'Glace Bay' },

  // ── North America: Mexico ──────────────────────────────────────────
  'America/Mexico_City': { countryEn: 'Mexico', cityEn: 'Mexico City' },
  'America/Cancun': { countryEn: 'Mexico', cityEn: 'Cancún' },
  'America/Merida': { countryEn: 'Mexico', cityEn: 'Mérida' },
  'America/Monterrey': { countryEn: 'Mexico', cityEn: 'Monterrey' },
  'America/Matamoros': { countryEn: 'Mexico', cityEn: 'Matamoros' },
  'America/Tijuana': { countryEn: 'Mexico', cityEn: 'Tijuana' },
  'America/Ensenada': { countryEn: 'Mexico', cityEn: 'Ensenada' },
  'America/Chihuahua': { countryEn: 'Mexico', cityEn: 'Chihuahua' },
  'America/Ciudad_Juarez': { countryEn: 'Mexico', cityEn: 'Ciudad Juárez' },
  'America/Ojinaga': { countryEn: 'Mexico', cityEn: 'Ojinaga' },
  'America/Mazatlan': { countryEn: 'Mexico', cityEn: 'Mazatlán' },
  'America/Hermosillo': { countryEn: 'Mexico', cityEn: 'Hermosillo' },
  'America/Bahia_Banderas': { countryEn: 'Mexico', cityEn: 'Bahía Banderas' },

  // ── Central America & Caribbean ────────────────────────────────────
  'America/Belize': { countryEn: 'Belize', cityEn: 'Belize City' },
  'America/Costa_Rica': { countryEn: 'Costa Rica', cityEn: 'San José' },
  'America/El_Salvador': {
    countryEn: 'El Salvador',
    cityEn: 'San Salvador',
  },
  'America/Guatemala': { countryEn: 'Guatemala', cityEn: 'Guatemala City' },
  'America/Tegucigalpa': { countryEn: 'Honduras', cityEn: 'Tegucigalpa' },
  'America/Managua': { countryEn: 'Nicaragua', cityEn: 'Managua' },
  'America/Panama': { countryEn: 'Panama', cityEn: 'Panama City' },
  'America/Havana': { countryEn: 'Cuba', cityEn: 'Havana' },
  'America/Nassau': { countryEn: 'Bahamas', cityEn: 'Nassau' },
  'America/Jamaica': { countryEn: 'Jamaica', cityEn: 'Kingston' },
  'America/Cayman': { countryEn: 'Cayman Islands', cityEn: 'George Town' },
  'America/Port-au-Prince': { countryEn: 'Haiti', cityEn: 'Port-au-Prince' },
  'America/Santo_Domingo': {
    countryEn: 'Dominican Republic',
    cityEn: 'Santo Domingo',
  },
  'America/Port_of_Spain': {
    countryEn: 'Trinidad and Tobago',
    cityEn: 'Port of Spain',
  },
  'America/Barbados': { countryEn: 'Barbados', cityEn: 'Bridgetown' },
  'America/Martinique': { countryEn: 'Martinique', cityEn: 'Fort-de-France' },
  'America/Guadeloupe': {
    countryEn: 'Guadeloupe',
    cityEn: 'Basse-Terre',
  },
  'America/St_Kitts': {
    countryEn: 'Saint Kitts and Nevis',
    cityEn: 'Basseterre',
  },
  'America/St_Lucia': { countryEn: 'Saint Lucia', cityEn: 'Castries' },
  'America/St_Vincent': {
    countryEn: 'Saint Vincent and the Grenadines',
    cityEn: 'Kingstown',
  },
  'America/Grenada': { countryEn: 'Grenada', cityEn: "St. George's" },
  'America/Antigua': {
    countryEn: 'Antigua and Barbuda',
    cityEn: "St. John's",
  },
  'America/Dominica': { countryEn: 'Dominica', cityEn: 'Roseau' },
  'America/Montserrat': { countryEn: 'Montserrat', cityEn: 'Plymouth' },
  'America/Anguilla': { countryEn: 'Anguilla', cityEn: 'The Valley' },
  'America/Aruba': { countryEn: 'Aruba', cityEn: 'Oranjestad' },
  'America/Curacao': { countryEn: 'Curaçao', cityEn: 'Willemstad' },
  'America/Kralendijk': {
    countryEn: 'Caribbean Netherlands',
    cityEn: 'Kralendijk',
  },
  'America/Lower_Princes': {
    countryEn: 'Sint Maarten',
    cityEn: 'Philipsburg',
  },
  'America/Marigot': { countryEn: 'Saint Martin', cityEn: 'Marigot' },
  'America/St_Barthelemy': {
    countryEn: 'Saint Barthélemy',
    cityEn: 'Gustavia',
  },
  'America/Tortola': {
    countryEn: 'British Virgin Islands',
    cityEn: 'Road Town',
  },
  'America/Grand_Turk': {
    countryEn: 'Turks and Caicos Islands',
    cityEn: 'Cockburn Town',
  },
  'America/Miquelon': {
    countryEn: 'Saint Pierre and Miquelon',
    cityEn: 'Saint-Pierre',
  },

  // ── South America ──────────────────────────────────────────────────
  'America/Caracas': { countryEn: 'Venezuela', cityEn: 'Caracas' },
  'America/Bogota': { countryEn: 'Colombia', cityEn: 'Bogotá' },
  'America/Guayaquil': { countryEn: 'Ecuador', cityEn: 'Guayaquil' },
  'Pacific/Galapagos': { countryEn: 'Ecuador', cityEn: 'Galápagos' },
  'America/Lima': { countryEn: 'Peru', cityEn: 'Lima' },
  'America/La_Paz': { countryEn: 'Bolivia', cityEn: 'La Paz' },
  'America/Santiago': { countryEn: 'Chile', cityEn: 'Santiago' },
  'America/Punta_Arenas': { countryEn: 'Chile', cityEn: 'Punta Arenas' },
  'Pacific/Easter': { countryEn: 'Chile', cityEn: 'Easter Island' },
  'America/Asuncion': { countryEn: 'Paraguay', cityEn: 'Asunción' },
  'America/Montevideo': { countryEn: 'Uruguay', cityEn: 'Montevideo' },
  'America/Buenos_Aires': { countryEn: 'Argentina', cityEn: 'Buenos Aires' },
  'America/Argentina/Buenos_Aires': {
    countryEn: 'Argentina',
    cityEn: 'Buenos Aires',
  },
  'America/Argentina/Cordoba': { countryEn: 'Argentina', cityEn: 'Córdoba' },
  'America/Argentina/Salta': { countryEn: 'Argentina', cityEn: 'Salta' },
  'America/Argentina/Jujuy': { countryEn: 'Argentina', cityEn: 'Jujuy' },
  'America/Argentina/Tucuman': { countryEn: 'Argentina', cityEn: 'Tucumán' },
  'America/Argentina/Catamarca': {
    countryEn: 'Argentina',
    cityEn: 'Catamarca',
  },
  'America/Argentina/La_Rioja': { countryEn: 'Argentina', cityEn: 'La Rioja' },
  'America/Argentina/San_Juan': { countryEn: 'Argentina', cityEn: 'San Juan' },
  'America/Argentina/Mendoza': { countryEn: 'Argentina', cityEn: 'Mendoza' },
  'America/Argentina/San_Luis': { countryEn: 'Argentina', cityEn: 'San Luis' },
  'America/Argentina/Rio_Gallegos': {
    countryEn: 'Argentina',
    cityEn: 'Río Gallegos',
  },
  'America/Argentina/Ushuaia': { countryEn: 'Argentina', cityEn: 'Ushuaia' },
  'America/Argentina/ComodRivadavia': {
    countryEn: 'Argentina',
    cityEn: 'Comodoro Rivadavia',
  },
  'America/Cordoba': { countryEn: 'Argentina', cityEn: 'Córdoba' },
  'America/Catamarca': { countryEn: 'Argentina', cityEn: 'Catamarca' },
  'America/Jujuy': { countryEn: 'Argentina', cityEn: 'Jujuy' },
  'America/Mendoza': { countryEn: 'Argentina', cityEn: 'Mendoza' },
  'America/Sao_Paulo': { countryEn: 'Brazil', cityEn: 'São Paulo' },
  'America/Fortaleza': { countryEn: 'Brazil', cityEn: 'Fortaleza' },
  'America/Recife': { countryEn: 'Brazil', cityEn: 'Recife' },
  'America/Noronha': {
    countryEn: 'Brazil',
    cityEn: 'Fernando de Noronha',
  },
  'America/Manaus': { countryEn: 'Brazil', cityEn: 'Manaus' },
  'America/Cuiaba': { countryEn: 'Brazil', cityEn: 'Cuiabá' },
  'America/Rio_Branco': { countryEn: 'Brazil', cityEn: 'Rio Branco' },
  'America/Belem': { countryEn: 'Brazil', cityEn: 'Belém' },
  'America/Campo_Grande': { countryEn: 'Brazil', cityEn: 'Campo Grande' },
  'America/Maceio': { countryEn: 'Brazil', cityEn: 'Maceió' },
  'America/Bahia': { countryEn: 'Brazil', cityEn: 'Salvador' },
  'America/Araguaina': { countryEn: 'Brazil', cityEn: 'Araguaína' },
  'America/Eirunepe': { countryEn: 'Brazil', cityEn: 'Eirunepé' },
  'America/Santarem': { countryEn: 'Brazil', cityEn: 'Santarém' },
  'America/Porto_Velho': { countryEn: 'Brazil', cityEn: 'Porto Velho' },
  'America/Boa_Vista': { countryEn: 'Brazil', cityEn: 'Boa Vista' },
  'America/Guyana': { countryEn: 'Guyana', cityEn: 'Georgetown' },
  'America/Paramaribo': { countryEn: 'Suriname', cityEn: 'Paramaribo' },
  'America/Cayenne': { countryEn: 'French Guiana', cityEn: 'Cayenne' },

  // ── Oceania: Australia ─────────────────────────────────────────────
  'Australia/Sydney': { countryEn: 'Australia', cityEn: 'Sydney' },
  'Australia/Melbourne': { countryEn: 'Australia', cityEn: 'Melbourne' },
  'Australia/Brisbane': { countryEn: 'Australia', cityEn: 'Brisbane' },
  'Australia/Perth': { countryEn: 'Australia', cityEn: 'Perth' },
  'Australia/Adelaide': { countryEn: 'Australia', cityEn: 'Adelaide' },
  'Australia/Darwin': { countryEn: 'Australia', cityEn: 'Darwin' },
  'Australia/Hobart': { countryEn: 'Australia', cityEn: 'Hobart' },
  'Australia/Currie': { countryEn: 'Australia', cityEn: 'Currie' },
  'Australia/Lindeman': { countryEn: 'Australia', cityEn: 'Lindeman' },
  'Australia/Broken_Hill': { countryEn: 'Australia', cityEn: 'Broken Hill' },
  'Australia/Lord_Howe': { countryEn: 'Australia', cityEn: 'Lord Howe' },
  'Australia/Eucla': { countryEn: 'Australia', cityEn: 'Eucla' },

  // ── Oceania: Pacific ───────────────────────────────────────────────
  'Pacific/Auckland': { countryEn: 'New Zealand', cityEn: 'Auckland' },
  'Pacific/Chatham': { countryEn: 'New Zealand', cityEn: 'Chatham' },
  'Pacific/Fiji': { countryEn: 'Fiji', cityEn: 'Suva' },
  'Pacific/Tongatapu': { countryEn: 'Tonga', cityEn: 'Nukuʻalofa' },
  'Pacific/Apia': { countryEn: 'Samoa', cityEn: 'Apia' },
  'Pacific/Port_Moresby': {
    countryEn: 'Papua New Guinea',
    cityEn: 'Port Moresby',
  },
  'Pacific/Bougainville': {
    countryEn: 'Papua New Guinea',
    cityEn: 'Bougainville',
  },
  'Pacific/Guadalcanal': {
    countryEn: 'Solomon Islands',
    cityEn: 'Honiara',
  },
  'Pacific/Noumea': { countryEn: 'New Caledonia', cityEn: 'Nouméa' },
  'Pacific/Efate': { countryEn: 'Vanuatu', cityEn: 'Port Vila' },
  'Pacific/Tahiti': { countryEn: 'French Polynesia', cityEn: 'Papeete' },
  'Pacific/Marquesas': { countryEn: 'French Polynesia', cityEn: 'Marquesas' },
  'Pacific/Gambier': { countryEn: 'French Polynesia', cityEn: 'Gambier' },
  'Pacific/Kiritimati': { countryEn: 'Kiribati', cityEn: 'Kiritimati' },
  'Pacific/Tarawa': { countryEn: 'Kiribati', cityEn: 'Tarawa' },
  'Pacific/Enderbury': { countryEn: 'Kiribati', cityEn: 'Enderbury' },
  'Pacific/Kanton': { countryEn: 'Kiribati', cityEn: 'Kanton' },
  'Pacific/Majuro': { countryEn: 'Marshall Islands', cityEn: 'Majuro' },
  'Pacific/Kwajalein': { countryEn: 'Marshall Islands', cityEn: 'Kwajalein' },
  'Pacific/Palau': { countryEn: 'Palau', cityEn: 'Ngerulmud' },
  'Pacific/Chuuk': {
    countryEn: 'Federated States of Micronesia',
    cityEn: 'Chuuk',
  },
  'Pacific/Truk': {
    countryEn: 'Federated States of Micronesia',
    cityEn: 'Chuuk',
  },
  'Pacific/Pohnpei': {
    countryEn: 'Federated States of Micronesia',
    cityEn: 'Pohnpei',
  },
  'Pacific/Ponape': {
    countryEn: 'Federated States of Micronesia',
    cityEn: 'Pohnpei',
  },
  'Pacific/Kosrae': {
    countryEn: 'Federated States of Micronesia',
    cityEn: 'Kosrae',
  },
  'Pacific/Niue': { countryEn: 'Niue', cityEn: 'Alofi' },
  'Pacific/Norfolk': { countryEn: 'Norfolk Island', cityEn: 'Kingston' },
  'Pacific/Pitcairn': {
    countryEn: 'Pitcairn Islands',
    cityEn: 'Adamstown',
  },
  'Pacific/Nauru': { countryEn: 'Nauru', cityEn: 'Yaren' },
  'Pacific/Funafuti': { countryEn: 'Tuvalu', cityEn: 'Funafuti' },
  'Pacific/Rarotonga': { countryEn: 'Cook Islands', cityEn: 'Avarua' },
  'Pacific/Fakaofo': { countryEn: 'Tokelau', cityEn: 'Fakaofo' },
  'Pacific/Wallis': {
    countryEn: 'Wallis and Futuna',
    cityEn: 'Mata-Utu',
  },
  'Pacific/Yap': {
    countryEn: 'Federated States of Micronesia',
    cityEn: 'Yap',
  },

  // ── Atlantic / Indian ──────────────────────────────────────────────
  'Atlantic/Reykjavik': { countryEn: 'Iceland', cityEn: 'Reykjavik' },
  'Atlantic/Azores': { countryEn: 'Portugal', cityEn: 'Azores' },
  'Atlantic/Madeira': { countryEn: 'Portugal', cityEn: 'Madeira' },
  'Atlantic/Canary': { countryEn: 'Spain', cityEn: 'Canary Islands' },
  'Atlantic/Cape_Verde': { countryEn: 'Cape Verde', cityEn: 'Praia' },
  'Atlantic/Faroe': { countryEn: 'Faroe Islands', cityEn: 'Tórshavn' },
  'Atlantic/Faeroe': { countryEn: 'Faroe Islands', cityEn: 'Tórshavn' },
  'Atlantic/St_Helena': { countryEn: 'Saint Helena', cityEn: 'Jamestown' },
  'Atlantic/South_Georgia': {
    countryEn: 'South Georgia',
    cityEn: 'Grytviken',
  },
  'Atlantic/Stanley': { countryEn: 'Falkland Islands', cityEn: 'Stanley' },
  'Atlantic/Bermuda': { countryEn: 'Bermuda', cityEn: 'Hamilton' },
  'Atlantic/Jan_Mayen': { countryEn: 'Norway', cityEn: 'Jan Mayen' },
  'Indian/Mauritius': { countryEn: 'Mauritius', cityEn: 'Port Louis' },
  'Indian/Reunion': { countryEn: 'Réunion', cityEn: 'Saint-Denis' },
  'Indian/Mayotte': { countryEn: 'Mayotte', cityEn: 'Mamoudzou' },
  'Indian/Comoro': { countryEn: 'Comoros', cityEn: 'Moroni' },
  'Indian/Antananarivo': { countryEn: 'Madagascar', cityEn: 'Antananarivo' },
  'Indian/Mahe': { countryEn: 'Seychelles', cityEn: 'Victoria' },
  'Indian/Maldives': { countryEn: 'Maldives', cityEn: 'Malé' },
  'Indian/Chagos': {
    countryEn: 'British Indian Ocean Territory',
    cityEn: 'Diego Garcia',
  },
  'Indian/Cocos': {
    countryEn: 'Cocos (Keeling) Islands',
    cityEn: 'West Island',
  },
  'Indian/Christmas': { countryEn: 'Christmas Island', cityEn: 'Flying Fish Cove' },
  'Indian/Kerguelen': {
    countryEn: 'French Southern Territories',
    cityEn: 'Port-aux-Français',
  },
  'Arctic/Longyearbyen': { countryEn: 'Norway', cityEn: 'Longyearbyen' },
};

const CITY_UNDERSCORE_RE = /_/g;

/**
 * IANA 타임존 식별자를 "Country/City" 영어 라벨로 변환한다.
 * - 매핑된 타임존: `${countryEn}/${cityEn}` 조합
 * - 매핑 없는 IANA이지만 `Region/City` 형식인 경우: 도시 부분의 underscore만 공백으로 치환해
 *   `Region/City Name` 형태로 반환한다 (최소한의 가독성 확보)
 * - 그 외(예: `UTC`, `GMT`): 원문 그대로 반환
 */
export function formatTimezoneLabel(tz: string): string {
  const mapped = TZ_TO_COUNTRY_CITY[tz];
  if (mapped) return `${mapped.countryEn}/${mapped.cityEn}`;
  const slashIdx = tz.indexOf('/');
  if (slashIdx === -1) return tz;
  const region = tz.slice(0, slashIdx);
  const cityRaw = tz.slice(slashIdx + 1);
  return `${region}/${cityRaw.replace(CITY_UNDERSCORE_RE, ' ')}`;
}
