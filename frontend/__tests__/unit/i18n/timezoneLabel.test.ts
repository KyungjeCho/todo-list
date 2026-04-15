import { formatTimezoneLabel } from 'src/i18n/timezones';

/**
 * T033 [US4] formatTimezoneLabel 단위 테스트
 *
 * WHY(FR-012~014): 타임존 라벨은 앱 언어와 무관하게 영어로 고정되어야 하며,
 * 한국/일본 두 건만 현재 범위로 지원한다. 저장 포맷(IANA)은 변경하지 않으므로
 * 라벨 계산은 i18n 리소스·`t()` 와 분리된 순수 함수여야 한다.
 */
describe('formatTimezoneLabel', () => {
  it('Asia/Seoul → "South Korea/Seoul"', () => {
    expect(formatTimezoneLabel('Asia/Seoul')).toBe('South Korea/Seoul');
  });

  it('Asia/Tokyo → "Japan/Tokyo"', () => {
    expect(formatTimezoneLabel('Asia/Tokyo')).toBe('Japan/Tokyo');
  });

  it('매핑된 주요 국가 타임존은 대륙 대신 국가 이름으로 치환된다', () => {
    expect(formatTimezoneLabel('America/New_York')).toBe(
      'United States/New York',
    );
    expect(formatTimezoneLabel('America/Los_Angeles')).toBe(
      'United States/Los Angeles',
    );
    expect(formatTimezoneLabel('Europe/Paris')).toBe('France/Paris');
    expect(formatTimezoneLabel('Europe/London')).toBe('United Kingdom/London');
    expect(formatTimezoneLabel('Africa/Cairo')).toBe('Egypt/Cairo');
    expect(formatTimezoneLabel('Australia/Sydney')).toBe('Australia/Sydney');
    expect(formatTimezoneLabel('Pacific/Auckland')).toBe(
      'New Zealand/Auckland',
    );
    expect(formatTimezoneLabel('Pacific/Honolulu')).toBe(
      'United States/Honolulu',
    );
  });

  it('매핑이 없는 Region/City 형식은 언더스코어만 공백으로 치환해 반환한다', () => {
    // Antarctica 등 국가 단위 매핑이 의미 없는 영역은 그대로 두되 underscore는 정리
    expect(formatTimezoneLabel('Antarctica/McMurdo')).toBe(
      'Antarctica/McMurdo',
    );
    expect(formatTimezoneLabel('Antarctica/South_Pole')).toBe(
      'Antarctica/South Pole',
    );
  });

  it('UTC/빈 문자열 등 슬래시 없는 입력은 원문 그대로 반환한다', () => {
    expect(formatTimezoneLabel('UTC')).toBe('UTC');
    expect(formatTimezoneLabel('GMT')).toBe('GMT');
    expect(formatTimezoneLabel('')).toBe('');
  });
});
