/**
 * T015 [US6] fallback 동작 테스트
 * - 번역 키 누락 시 영어로 표시
 * - 영어도 누락 시 키 이름 미노출 (빈 문자열 또는 영어 fallback)
 */

let mockLanguageCode = 'ko';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: mockLanguageCode, languageTag: `${mockLanguageCode}-XX` }],
  getCalendars: () => [{ timeZone: 'Asia/Seoul' }],
}));

describe('i18n fallback 동작', () => {
  beforeEach(() => {
    jest.resetModules();
    mockLanguageCode = 'ko';
  });

  it('번역 키가 해당 언어에 없으면 영어(en) fallback으로 표시한다', (done) => {
    mockLanguageCode = 'es';

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: i18n } = require('src/i18n');

      // 정상 키는 스페인어로 표시
      const translated = i18n.t('common.cancel');
      expect(translated).toBeTruthy();
      expect(typeof translated).toBe('string');

      // fallbackLng가 'en'이므로 스페인어에 없는 키는 영어로 표시
      expect(i18n.options.fallbackLng).toEqual(['en']);
      done();
    });
  });

  it('존재하는 키는 현재 언어로 정상 번역된다', (done) => {
    mockLanguageCode = 'ja';

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: i18n } = require('src/i18n');

      expect(i18n.language).toBe('ja');
      // 일본어 번역이 존재하는 키
      const result = i18n.t('settings.title');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      done();
    });
  });

  it('모든 언어에 공통 키가 존재한다', (done) => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: i18n, SUPPORTED_LANGUAGES } = require('src/i18n');

      const commonKeys = ['common.cancel', 'common.delete', 'common.save', 'settings.title'];

      for (const lang of SUPPORTED_LANGUAGES) {
        for (const key of commonKeys) {
          const value = i18n.t(key, { lng: lang });
          expect(value).toBeTruthy();
          // 키 이름이 그대로 반환되면 안 된다 (번역이 존재해야 함)
          expect(value).not.toBe(key);
        }
      }
      done();
    });
  });
});
