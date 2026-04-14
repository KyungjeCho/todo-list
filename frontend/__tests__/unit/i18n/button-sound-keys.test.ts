import ko from 'src/i18n/locales/ko.json';
import en from 'src/i18n/locales/en.json';
import ja from 'src/i18n/locales/ja.json';
import es from 'src/i18n/locales/es.json';

describe('i18n — buttonClickSound 번역 키 존재 (US2)', () => {
  const locales = { ko, en, ja, es } as const;

  it.each(Object.entries(locales))(
    '%s.json has non-empty settings.buttonClickSound',
    (_name, bundle) => {
      const value = (bundle as { settings?: { buttonClickSound?: string } })
        .settings?.buttonClickSound;
      expect(typeof value).toBe('string');
      expect(value && value.length > 0).toBe(true);
    },
  );
});
