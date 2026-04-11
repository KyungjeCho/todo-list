# 빠른 시작 가이드: 다국어(i18n) 지원 및 전 세계 타임존 확장

**브랜치**: `005-i18n-timezone` | **날짜**: 2026-04-10

## 사전 준비

### 의존성 설치

```bash
# 프론트엔드 — i18n 패키지 설치
cd frontend
npx expo install expo-localization
npm install i18next react-i18next

# 백엔드 — 추가 의존성 없음
```

## 개발 순서

### Phase 1: i18n 기반 구축 + 번역 파일

1. `frontend/src/i18n/index.ts` — i18next 초기화, `SUPPORTED_LANGUAGES`, `STT_LOCALE_MAP`, `LANGUAGE_LABELS` 상수 정의
2. `frontend/src/i18n/locales/ko.json` — 한국어 원본 번역 파일 작성 (전체 화면 하드코딩 텍스트 수집)
3. `frontend/src/i18n/locales/en.json` — 영어 번역 (AI 생성 + 교차 검수)
4. `frontend/src/i18n/locales/ja.json` — 일본어 번역 (AI 생성 + 교차 검수)
5. `frontend/src/i18n/locales/es.json` — 스페인어 번역 (AI 생성 + 교차 검수)
6. `frontend/src/i18n/timezones.ts` — 정적 IANA 타임존 fallback 리스트

### Phase 2: 하드코딩 텍스트 교체

모든 화면/컴포넌트의 한국어 하드코딩 텍스트를 `t('key')` 호출로 교체:

- `LoginScreen.tsx`, `MainScreen.tsx`, `ReviewModeView.tsx`
- `SettingsScreen.tsx`, `OnboardingScreen.tsx`
- `VoiceInputScreen.tsx`, `CalendarScreen.tsx`, `DayDetailView.tsx`
- `TodoItem.tsx`, `TodoActionButtons.tsx`, `ShareButton.tsx`, `DraftTodoItem.tsx`
- `AuthNavigator.tsx`, `useAuth.ts`, `useSpeechRecognition.ts`

### Phase 3: 백엔드 변경

1. DB 마이그레이션: `language` 형식 변환 + 기본값 변경
2. `OAuthCallbackDto` — `timezone`/`language` 필드 추가
3. `oauth-callback.usecase.ts` — 파라미터 수신 및 검증
4. `update-settings.dto.ts` — `@IsIn` 검증 추가
5. `gemini.service.ts` — `refineText(rawText, language)` 언어별 프롬프트 분기
6. `refine-text.usecase.ts` — 사용자 언어 전달

### Phase 4: 프론트엔드 기능 추가

1. `TimezoneSelectScreen.tsx` — 전용 타임존 선택 화면 (검색, 필터, 정렬)
2. `SettingsScreen.tsx` — 언어 선택 UI 추가, 타임존을 전용 화면으로 변경
3. `AuthNavigator.tsx` — 온보딩 조건 변경, i18n 서버값 동기화
4. `RootNavigator.tsx` + `types.ts` — TimezoneSelect 화면 등록
5. `useAuth.ts` — OAuth 리다이렉트에 timezone/language 추가
6. `useSpeechRecognition.ts` — STT 언어 연동
7. `user.ts` — language 타입 제한

### Phase 5: E2E 테스트

1. `.maestro/settings/language-change.yaml`
2. `.maestro/settings/timezone-select.yaml`

## 핵심 패턴

### 번역 사용법

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

// 단순 텍스트
<Text>{t('settings.title')}</Text>

// 인터폴레이션
<Text>{t('main.completionRate', { completed: 3, total: 5 })}</Text>
```

### 언어 변경

```typescript
import i18n from '@/i18n';

// 즉시 전환 (앱 재시작 불필요)
await i18n.changeLanguage('en');
```

### 디바이스 언어/타임존 감지

```typescript
import { getLocales, getCalendars } from 'expo-localization';

const deviceLang = getLocales()[0]?.languageCode ?? 'en';
const deviceTz = getCalendars()[0]?.timeZone ?? 'UTC';
```

## 테스트 실행

```bash
# 백엔드 단위 테스트
cd backend && npm test

# 프론트엔드 단위 테스트
cd frontend && npm test

# E2E 테스트 (Android 에뮬레이터 필요)
maestro test .maestro/settings/language-change.yaml
maestro test .maestro/settings/timezone-select.yaml
```
