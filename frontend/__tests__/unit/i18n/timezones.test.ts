import {
  getTimezoneEntries,
  clearTimezoneEntriesCache,
} from 'src/i18n/timezones';

describe('getTimezoneEntries', () => {
  beforeEach(() => {
    clearTimezoneEntriesCache();
  });

  it('UTC가 항상 목록에 포함된다 (Intl.supportedValuesOf 미포함 환경 대응)', () => {
    const entries = getTimezoneEntries();

    const utc = entries.find((e) => e.tz === 'UTC');
    expect(utc).toBeTruthy();
    expect(utc?.offsetMinutes).toBe(0);
  });

  it('오프셋 오름차순으로 정렬되어 있다', () => {
    const entries = getTimezoneEntries();

    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].offsetMinutes).toBeGreaterThanOrEqual(
        entries[i - 1].offsetMinutes,
      );
    }
  });

  it('TTL 내 두 번 호출 시 동일 참조를 반환(캐시 히트)한다', () => {
    const first = getTimezoneEntries();
    const second = getTimezoneEntries();

    expect(second).toBe(first);
  });

  it('clearTimezoneEntriesCache 이후에는 새 배열을 반환한다', () => {
    const first = getTimezoneEntries();
    clearTimezoneEntriesCache();
    const second = getTimezoneEntries();

    expect(second).not.toBe(first);
  });

  it('TTL이 경과하면 캐시가 무효화되어 재계산된다 (DST 대응)', () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    try {
      jest.setSystemTime(new Date('2026-04-01T00:00:00Z'));
      const first = getTimezoneEntries();

      // 1시간 + 1초 경과
      jest.setSystemTime(new Date('2026-04-01T01:00:01Z'));
      const second = getTimezoneEntries();

      expect(second).not.toBe(first);
    } finally {
      jest.useRealTimers();
    }
  });
});
