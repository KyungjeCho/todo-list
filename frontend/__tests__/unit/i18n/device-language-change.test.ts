/**
 * T016 [US1] 디바이스 언어 변경 무시 테스트
 * - 앱 실행 중 디바이스 언어 변경 시 앱 내 설정 언어 유지
 * - 서버 저장값 우선 확인
 */

let mockLanguageCode = 'ko';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: mockLanguageCode, languageTag: `${mockLanguageCode}-XX` }],
  getCalendars: () => [{ timeZone: 'Asia/Seoul' }],
}));

describe('디바이스 언어 변경 시 앱 언어 유지', () => {
  beforeEach(() => {
    jest.resetModules();
    mockLanguageCode = 'ko';
  });

  it('i18n 초기화 후 디바이스 언어가 변경되어도 앱 언어는 유지된다', (done) => {
    mockLanguageCode = 'ja';

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: i18n } = require('src/i18n');

      expect(i18n.language).toBe('ja');

      // 디바이스 언어가 변경됨 (시뮬레이션)
      mockLanguageCode = 'es';

      // WHY: i18n은 초기화 시점에 디바이스 언어를 읽고, 이후에는 detectDeviceLanguage()를
      // 자동으로 호출하지 않는다. 따라서 앱 실행 중 디바이스 언어 변경은 무시된다.
      expect(i18n.language).toBe('ja');
      done();
    });
  });

  it('서버에서 사용자 언어를 받으면 changeLanguage()로 명시적 전환한다', (done) => {
    mockLanguageCode = 'ko';

    jest.isolateModules(async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: i18n } = require('src/i18n');

      expect(i18n.language).toBe('ko');

      // 서버에서 사용자가 'en'으로 설정했다고 가정
      await i18n.changeLanguage('en');
      expect(i18n.language).toBe('en');

      // 디바이스 언어는 여전히 ko이지만 앱은 en 유지
      mockLanguageCode = 'ko';
      expect(i18n.language).toBe('en');
      done();
    });
  });

  it('changeLanguage() 후에도 디바이스 언어 변경은 무시된다', (done) => {
    mockLanguageCode = 'en';

    jest.isolateModules(async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: i18n } = require('src/i18n');

      expect(i18n.language).toBe('en');

      // 사용자가 설정에서 스페인어로 변경
      await i18n.changeLanguage('es');
      expect(i18n.language).toBe('es');

      // 디바이스 언어가 일본어로 변경
      mockLanguageCode = 'ja';

      // 앱은 여전히 스페인어
      expect(i18n.language).toBe('es');
      done();
    });
  });
});
