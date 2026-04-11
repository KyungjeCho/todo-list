import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import ko from './locales/ko.json';
import en from './locales/en.json';
import ja from './locales/ja.json';
import es from './locales/es.json';

export const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  es: 'Español',
};

export const STT_LOCALE_MAP: Record<SupportedLanguage, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP',
  es: 'es-ES',
};

/** 디바이스 언어를 감지하여 지원 언어이면 반환, 아니면 'en'을 반환한다. */
export function detectDeviceLanguage(): SupportedLanguage {
  const deviceLang = getLocales()[0]?.languageCode ?? 'en';
  return isSupportedLanguage(deviceLang) ? deviceLang : 'en';
}

function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
    ja: { translation: ja },
    es: { translation: es },
  },
  lng: detectDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
