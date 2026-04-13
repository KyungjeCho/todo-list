import ko from 'src/i18n/locales/ko.json';
import en from 'src/i18n/locales/en.json';
import ja from 'src/i18n/locales/ja.json';
import es from 'src/i18n/locales/es.json';

/**
 * JSON 객체의 모든 키를 플랫하게 추출한다.
 * 예: { a: { b: 'v' } } → ['a.b']
 */
function extractKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return extractKeys(value as Record<string, unknown>, fullKey);
    }
    return [fullKey];
  });
}

describe('번역 키 일치 검증', () => {
  const koKeys = extractKeys(ko).sort();

  it('ko.json과 en.json의 키 구조가 동일하다', () => {
    const enKeys = extractKeys(en).sort();
    expect(enKeys).toEqual(koKeys);
  });

  it('ko.json과 ja.json의 키 구조가 동일하다', () => {
    const jaKeys = extractKeys(ja).sort();
    expect(jaKeys).toEqual(koKeys);
  });

  it('ko.json과 es.json의 키 구조가 동일하다', () => {
    const esKeys = extractKeys(es).sort();
    expect(esKeys).toEqual(koKeys);
  });

  it('모든 번역 파일에 빈 문자열 값이 없다', () => {
    const allLocales = { ko, en, ja, es };
    const emptyKeys: string[] = [];

    for (const [locale, data] of Object.entries(allLocales)) {
      const keys = extractKeys(data);
      for (const key of keys) {
        const value = key.split('.').reduce<unknown>(
          (obj, k) => (obj as Record<string, unknown>)?.[k],
          data,
        );
        if (typeof value === 'string' && value.trim() === '') {
          emptyKeys.push(`${locale}:${key}`);
        }
      }
    }

    expect(emptyKeys).toEqual([]);
  });
});
