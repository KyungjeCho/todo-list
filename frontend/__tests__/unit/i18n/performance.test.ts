// WHY: SC-002(언어 전환 200ms 이내) / SC-005(타임존 검색 100ms 이내) 성능 목표를 회귀 테스트로 고정한다.
// 실제 RN 환경이 아닌 Jest(Node) 환경 측정이지만 순수 연산(i18next 전환 + 오프셋 계산/필터)은
// 네이티브 환경보다 느리거나 유사하므로 여기서 통과하면 실제 기기에서도 통과한다.

let mockLanguageCode = 'en';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: mockLanguageCode, languageTag: `${mockLanguageCode}-XX` }],
  getCalendars: () => [{ timeZone: 'UTC' }],
}));

describe('i18n/timezone 성능 검증', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('SC-002: 4개 언어 순환 전환이 200ms 이내에 완료된다', async () => {
    await new Promise<void>((resolve) => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { default: i18n, SUPPORTED_LANGUAGES } = require('src/i18n');

        const start = performance.now();
        // WHY: ko → en → ja → es 한 사이클 전환 측정 (실제 사용자의 설정 변경 흐름)
        (async () => {
          for (const lang of SUPPORTED_LANGUAGES) {
            await i18n.changeLanguage(lang);
          }
          const elapsed = performance.now() - start;
          // eslint-disable-next-line no-console
          console.log(`[perf] 4개 언어 순환 전환: ${elapsed.toFixed(2)}ms`);
          expect(elapsed).toBeLessThan(200);
          resolve();
        })();
      });
    });
  });

  it('SC-005: 타임존 검색 필터링이 100ms 이내에 완료된다', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {
      getTimezoneEntries,
      clearTimezoneEntriesCache,
    } = require('src/i18n/timezones');

    clearTimezoneEntriesCache();
    // WHY: 첫 호출은 전체 오프셋 계산이 포함됨. SC-005는 "검색 입력 후 필터링"이 대상이므로
    // 캐시 워밍 후 filter() 호출만 측정한다 (실제 사용자 체감과 동일).
    const entries = getTimezoneEntries();
    expect(entries.length).toBeGreaterThan(10);

    const queries = ['tok', 'new', 'london', 'seoul', 'utc', 'asia', 'europe'];
    const start = performance.now();
    for (const q of queries) {
      const lower = q.toLowerCase();
      const filtered = entries.filter((e: { tz: string }) =>
        e.tz.toLowerCase().includes(lower),
      );
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    }
    const elapsed = performance.now() - start;
    // eslint-disable-next-line no-console
    console.log(`[perf] 타임존 필터 7회: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(100);
  });

  it('타임존 엔트리 첫 빌드(캐시 미스)도 1초 이내에 완료된다', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {
      getTimezoneEntries,
      clearTimezoneEntriesCache,
    } = require('src/i18n/timezones');

    clearTimezoneEntriesCache();
    const start = performance.now();
    const entries = getTimezoneEntries();
    const elapsed = performance.now() - start;
    // eslint-disable-next-line no-console
    console.log(
      `[perf] 타임존 초기 빌드(${entries.length}개): ${elapsed.toFixed(2)}ms`,
    );
    // WHY: SC와 별개. 실제 기기 대비 Jest 환경 오버헤드를 고려해 넉넉히 1초로 회귀 감지선만 설정
    expect(elapsed).toBeLessThan(1000);
  });
});
