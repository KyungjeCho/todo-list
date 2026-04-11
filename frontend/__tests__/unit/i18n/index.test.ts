// WHY: i18next는 싱글톤이므로 모듈 격리 + mock 재설정이 필요하다.
// jest.isolateModules 내에서 expo-localization mock을 직접 설정한다.

let mockLanguageCode = 'ko';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: mockLanguageCode, languageTag: `${mockLanguageCode}-XX` }],
  getCalendars: () => [{ timeZone: 'Asia/Seoul' }],
}));

describe('i18n 초기화', () => {
  beforeEach(() => {
    jest.resetModules();
    mockLanguageCode = 'ko';
  });

  it('지원 언어(ko) 감지 시 해당 언어로 설정한다', (done) => {
    mockLanguageCode = 'ko';

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: i18n, SUPPORTED_LANGUAGES } = require('src/i18n');

      expect(SUPPORTED_LANGUAGES).toContain('ko');
      expect(SUPPORTED_LANGUAGES).toContain('en');
      expect(SUPPORTED_LANGUAGES).toContain('ja');
      expect(SUPPORTED_LANGUAGES).toContain('es');
      expect(SUPPORTED_LANGUAGES).toHaveLength(4);
      expect(i18n.language).toBe('ko');
      done();
    });
  });

  it('비지원 언어 감지 시 영어(en) fallback으로 설정한다', (done) => {
    mockLanguageCode = 'fr';

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: i18n } = require('src/i18n');
      expect(i18n.language).toBe('en');
      done();
    });
  });

  it('fallbackLng이 en으로 설정된다', (done) => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: i18n } = require('src/i18n');
      expect(i18n.options.fallbackLng).toEqual(['en']);
      done();
    });
  });

  it('LANGUAGE_LABELS가 원어명으로 정의되어 있다', (done) => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { LANGUAGE_LABELS } = require('src/i18n');
      expect(LANGUAGE_LABELS).toEqual({
        ko: '한국어',
        en: 'English',
        ja: '日本語',
        es: 'Español',
      });
      done();
    });
  });

  it('STT_LOCALE_MAP이 올바르게 매핑된다', (done) => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { STT_LOCALE_MAP } = require('src/i18n');
      expect(STT_LOCALE_MAP).toEqual({
        ko: 'ko-KR',
        en: 'en-US',
        ja: 'ja-JP',
        es: 'es-ES',
      });
      done();
    });
  });

  it('detectDeviceLanguage()가 디바이스 언어를 반환한다', (done) => {
    mockLanguageCode = 'ja';

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectDeviceLanguage } = require('src/i18n');
      expect(detectDeviceLanguage()).toBe('ja');
      done();
    });
  });

  it('detectDeviceLanguage()가 비지원 언어 시 en을 반환한다', (done) => {
    mockLanguageCode = 'ar';

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectDeviceLanguage } = require('src/i18n');
      expect(detectDeviceLanguage()).toBe('en');
      done();
    });
  });
});
