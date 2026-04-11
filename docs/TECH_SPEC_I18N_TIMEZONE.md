> **문서 버전:** v1.0
**작성일:** 2026-04-10
**상태:** Draft
**관련 PRD:** `PRD_I18N_TIMEZONE.md`
**피처 브랜치:** feature/005-i18n-timezone

---

## 1. 요약

현재 앱의 모든 UI 텍스트가 한국어로 하드코딩되어 있고, 타임존 설정이 7개로 제한되어 있다. 이를 `i18next` + `react-i18next` 기반 다국어 체계(ko, en, ja, es)로 전환하고, 타임존 선택을 전 세계 IANA 타임존으로 확장한다.

주요 변경:
- 프론트엔드: i18n 라이브러리 도입, 전체 하드코딩 텍스트를 번역 키로 교체, 타임존 전용 선택 화면 신규 생성, 언어 선택 UI 추가
- 백엔드: OAuth 콜백에 `timezone`/`language` 파라미터 추가, `language` 컬럼 기본값 및 형식 변경, LLM 프롬프트 언어 분기
- 온보딩 흐름: 타임존을 회원가입 시 자동 감지로 전환, 진입 조건을 `planTime == null AND reviewTime == null`로 변경

---

## 2. 배경

### 2.1 현재 상태 분석

| 항목 | 현재 구현 | 위치 |
| --- | --- | --- |
| UI 텍스트 | 한국어 하드코딩 | 전체 화면/컴포넌트 |
| 기본 언어 | `'ko-KR'` | `oauth-callback.usecase.ts:55` |
| `language` 컬럼 | `varchar(10)`, NOT NULL, 값 `'ko-KR'` | `user.entity.ts` |
| `language` 필드 | `UserProfile`, `UpdateSettingsRequest`에 이미 존재 | `frontend/src/types/user.ts` |
| 언어 설정 API | `PATCH /users/me/settings`에서 `language` 수신 가능 (미사용) | `update-settings.dto.ts` |
| 타임존 선택 | 7개 하드코딩 (`TIMEZONE_OPTIONS` 배열) | `SettingsScreen.tsx` |
| 타임존 초기값 | `null` → 온보딩에서 수동 선택 | `oauth-callback.usecase.ts:50` |
| 온보딩 조건 | `user?.timezone != null` | `AuthNavigator.tsx:324` |
| STT 언어 | `'ko-KR'` 하드코딩 | `useSpeechRecognition.ts:88,110` |
| LLM 프롬프트 | 한국어 고정 | `gemini.service.ts` |

### 2.2 이미 준비된 인프라

- `UserProfile` 타입에 `language: string` 필드 존재
- `UpdateSettingsRequest`에 `language?: string` 필드 존재
- `PATCH /users/me/settings` API에서 `language` 업데이트 가능
- `user.entity.ts`에 `language` 컬럼 존재 (형식만 변경 필요)

---

## 3. 목표

- `i18next` + `react-i18next` + `expo-localization`으로 4개 언어(ko, en, ja, es) 동적 전환을 구현한다.
- 기본(fallback) 언어를 영어(en)로 변경하여 비지원 언어권 사용자도 자연스럽게 이용할 수 있도록 한다.
- 전체 하드코딩 한국어 텍스트를 번역 키 호출(`t('key')`)로 교체한다.
- 타임존 선택을 전 세계 IANA 타임존으로 확장하고, 실시간 검색이 가능한 전용 선택 화면을 구현한다.
- 회원가입 시 디바이스 타임존과 언어를 자동 감지하여 서버에 전송한다.
- 온보딩 진입 조건을 `planTime == null AND reviewTime == null`로 변경한다.

---

## 4. 목표가 아닌 것

- **RTL(Right-to-Left) 레이아웃 지원**: 아랍어, 히브리어 등 RTL 언어는 이번 범위에 포함하지 않는다.
- **서버 사이드 다국어**: 에러 메시지 등 서버 응답의 다국어 처리는 포함하지 않는다. 프론트엔드 표시용 텍스트만 다국어를 적용한다.
- **날짜/시간/통화 로케일 자동 전환**: `MM/DD` vs `DD/MM` 등 로케일별 포맷 차이는 다루지 않는다.
- **5개 이상 언어 추가**: 향후 확장 가능하나 본 버전에서는 4개(ko, en, ja, es)만 지원한다.
- **번역 크라우드소싱**: 앱 내 번역 편집/제안 기능은 포함하지 않는다.

---

## 5. 설계

### 5.1 아키텍처 변경

**기존 (AS-IS)**
```
[앱 실행] → 한국어 하드코딩 UI 표시
[회원가입] → timezone: null, language: 'ko-KR'
[온보딩] → 타임존 수동 선택 (7개 옵션)
[설정] → 타임존 드롭다운 (7개 옵션), 언어 설정 없음
[STT] → 'ko-KR' 고정
[LLM] → 한국어 프롬프트 고정
```

**신규 (TO-BE)**
```
[앱 실행] → expo-localization으로 디바이스 언어 감지
         → i18next 초기화 (서버값 → 디바이스값 → 'en' fallback)
         → 감지된 언어로 UI 표시
[회원가입] → timezone: 디바이스 감지값, language: 디바이스 감지값 (ko/en/ja/es)
[온보딩] → 타임존 설정 제거, planTime/reviewTime만 설정
[설정] → 타임존 전용 선택 화면 (전 세계 IANA, 검색), 언어 선택 항목 추가
[STT] → 사용자 언어 설정 연동 (ko-KR, en-US, ja-JP, es-ES)
[LLM] → 사용자 언어에 따른 프롬프트 분기
```

### 5.2 Sequence Diagram — 첫 구동 언어 감지 + 회원가입

```
사용자          App              expo-localization    i18next    AuthNavigator    Server
  │              │                      │               │            │              │
  │  앱 최초 실행 │                      │               │            │              │
  │─────────────>│  getLocales()        │               │            │              │
  │              │─────────────────────>│               │            │              │
  │              │  [{ languageCode }]  │               │            │              │
  │              │<─────────────────────│               │            │              │
  │              │                      │               │            │              │
  │              │  지원 언어 매칭        │               │            │              │
  │              │  (ko/en/ja/es 중 하나 or 'en' fallback)           │              │
  │              │                      │               │            │              │
  │              │  i18n.changeLanguage(detectedLang)    │            │              │
  │              │─────────────────────────────────────>│            │              │
  │              │                      │               │            │              │
  │  감지된 언어로 │                      │               │            │              │
  │  로그인 화면   │                      │               │            │              │
  │<─────────────│                      │               │            │              │
  │              │                      │               │            │              │
  │  OAuth 로그인 │                      │               │            │              │
  │─────────────>│  getCalendars()[0].timeZone           │            │              │
  │              │─────────────────────>│               │            │              │
  │              │  'Asia/Seoul'        │               │            │              │
  │              │<─────────────────────│               │            │              │
  │              │                      │               │            │              │
  │              │  OAuth callback + timezone=Asia/Seoul&language=ko  │              │
  │              │──────────────────────────────────────────────────────────────────>│
  │              │                      │               │            │  User 생성    │
  │              │                      │               │            │  timezone/lang│
  │              │  { tokens, isNewUser: true }          │            │              │
  │              │<──────────────────────────────────────────────────────────────────│
  │              │                      │               │            │              │
  │              │                      │  온보딩 조건 확인│            │              │
  │              │                      │  planTime==null│            │              │
  │              │                      │  AND           │            │              │
  │              │                      │  reviewTime==null           │              │
  │              │                      │               │  → 온보딩   │              │
  │              │                      │               │            │              │
```

### 5.3 Sequence Diagram — 설정에서 언어 변경

```
사용자          SettingsScreen    i18next    authStore    Server
  │                  │               │          │           │
  │  "언어" 탭       │               │          │           │
  │─────────────────>│               │          │           │
  │  언어 목록 표시   │               │          │           │
  │<─────────────────│               │          │           │
  │                  │               │          │           │
  │  "English" 선택  │               │          │           │
  │─────────────────>│               │          │           │
  │                  │  changeLanguage('en')    │           │
  │                  │──────────────>│          │           │
  │  UI 즉시 영어 전환│               │          │           │
  │<─ ─ ─ ─ ─ ─ ─ ─│               │          │           │
  │                  │               │          │           │
  │                  │  PATCH /users/me/settings            │
  │                  │  { language: 'en' }      │           │
  │                  │─────────────────────────────────────>│
  │                  │               │          │           │
  │                  │  200 OK       │  user 갱신│           │
  │                  │<─────────────────────────────────────│
  │                  │               │          │           │
  │                  │               │  setUser()│          │
  │                  │──────────────────────────>│          │
  │                  │               │          │           │
```

### 5.4 프론트엔드 설계

#### 5.4.1 i18n 초기화

```typescript
// frontend/src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import ko from './locales/ko.json';
import en from './locales/en.json';
import ja from './locales/ja.json';
import es from './locales/es.json';

export const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'es'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  es: 'Español',
};

/** STT locale 매핑 */
export const STT_LOCALE_MAP: Record<SupportedLanguage, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP',
  es: 'es-ES',
};

function detectDeviceLanguage(): SupportedLanguage {
  const locales = getLocales();
  const deviceLang = locales[0]?.languageCode ?? 'en';
  if (SUPPORTED_LANGUAGES.includes(deviceLang as SupportedLanguage)) {
    return deviceLang as SupportedLanguage;
  }
  return 'en';
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
    escapeValue: false, // React Native에서는 XSS 위험 없음
  },
});

export default i18n;
```

**언어 감지 우선순위 (앱 시작 시):**
1. `authStore.user?.language` (서버 저장값) → `i18n.changeLanguage()`
2. `detectDeviceLanguage()` (초기화 시점, 로그인 전)
3. `'en'` fallback

`App.tsx` 또는 `AuthNavigator`에서 사용자 프로필 로드 후:
```typescript
// 서버 저장값이 있으면 i18n 언어 동기화
useEffect(() => {
  if (user?.language) {
    i18n.changeLanguage(user.language);
  }
}, [user?.language]);
```

#### 5.4.2 번역 파일 구조

```
frontend/src/i18n/
├── index.ts              # i18next 초기화, 헬퍼 함수
├── locales/
│   ├── ko.json           # 한국어 (원본)
│   ├── en.json           # 영어 (기본/fallback)
│   ├── ja.json           # 일본어
│   └── es.json           # 스페인어
```

번역 키는 화면/기능 단위로 네스팅한다. PRD 섹션 5.3의 구조를 따르되, 실제 앱에서 사용하는 모든 하드코딩 텍스트를 포함한다.

```json
{
  "common": {
    "save": "저장",
    "cancel": "취소",
    "delete": "삭제",
    "confirm": "확인",
    "loading": "로딩 중...",
    "networkError": "네트워크 연결을 확인해주세요",
    "retry": "다시 시도"
  },
  "auth": {
    "loginWith": "{{provider}}로 로그인"
  },
  "main": {
    "planMode": "계획",
    "reviewMode": "회고",
    "addTodo": "할 일 추가",
    "todayComplete": "오늘의 일정 완료",
    "completionRate": "{{completed}}/{{total}} 완료",
    "emptyTodo": "할 일이 없습니다",
    "noCarryOver": "이월할 할 일이 없습니다"
  },
  "todo": {
    "placeholder": "할 일을 입력하세요",
    "deleteConfirm": "이 할 일을 삭제하시겠습니까?",
    "shareTitle": "일정 공유",
    "copyToClipboard": "클립보드 복사",
    "copiedToast": "클립보드에 복사되었습니다"
  },
  "settings": {
    "title": "설정",
    "notification": "알림 설정",
    "planTime": "계획 시간",
    "reviewTime": "회고 시간",
    "regional": "지역 설정",
    "timezone": "타임존",
    "language": "언어",
    "info": "정보",
    "openSource": "오픈소스 라이센스",
    "privacy": "개인정보 처리방침",
    "contact": "문의하기",
    "logout": "로그아웃",
    "logoutConfirm": "로그아웃 하시겠습니까?"
  },
  "onboarding": {
    "welcome": "환영합니다!",
    "setPlanTime": "계획 시간을 설정하세요",
    "setReviewTime": "회고 시간을 설정하세요",
    "routineTitle": "루틴 설정",
    "start": "시작하기"
  },
  "voice": {
    "title": "음성 할 일 입력",
    "listening": "말씀하세요...",
    "recording": "녹음 중",
    "noResult": "인식된 할 일이 없습니다",
    "discardConfirm": "입력 중인 할 일 {{count}}개가 삭제됩니다",
    "createFailed": "할 일 생성에 실패했습니다",
    "micPermissionRequired": "마이크 권한이 필요합니다"
  },
  "timezone": {
    "title": "타임존 선택",
    "searchPlaceholder": "도시 또는 타임존 검색",
    "noResults": "검색 결과가 없습니다"
  },
  "calendar": {
    "title": "캘린더"
  },
  "memo": {
    "title": "메모",
    "placeholder": "메모를 입력하세요"
  },
  "error": {
    "serverSaveFailed": "서버 저장에 실패했습니다",
    "loadFailed": "데이터를 불러올 수 없습니다"
  }
}
```

> 최종 키 목록은 전체 화면/컴포넌트 스캔 후 확정한다. 위는 주요 키의 구조 예시이다.

#### 5.4.3 번역 생성 및 검수 프로세스

| 단계 | 설명 |
| --- | --- |
| 1. 원본 작성 | `ko.json`을 먼저 작성 (전체 화면 하드코딩 텍스트 수집) |
| 2. AI 번역 | `ko.json`을 기반으로 AI(Claude, Gemini 등)가 `en.json`, `ja.json`, `es.json` 생성 |
| 3. 교차 검수 | 생성된 번역을 다른 AI 모델로 검수 (자연스러운 표현, 문맥 적합성) |
| 4. 키 일치 검증 | 모든 JSON 파일의 키가 `ko.json`과 동일한지 스크립트로 자동 확인 |
| 5. 통합 | 검수 완료된 번역 파일을 프로젝트에 반영 |

#### 5.4.4 하드코딩 텍스트 교체 패턴

```typescript
// 변경 전
<Text>설정</Text>

// 변경 후
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
<Text>{t('settings.title')}</Text>
```

보간(interpolation) 사용 예:
```typescript
// 변경 전
<Text>{`${completed}/${total} 완료`}</Text>

// 변경 후
<Text>{t('main.completionRate', { completed, total })}</Text>
```

#### 5.4.5 설정 화면 — 언어 선택 UI

`SettingsScreen.tsx`에 언어 선택 항목을 추가한다. 기존 타임존 설정 아래에 위치한다.

```typescript
// 언어 선택 — 드롭다운 방식 (PRD 4.2)
// 현재 선택된 언어를 원어명으로 표시, 탭 시 목록 펼침

interface LanguageOption {
  code: SupportedLanguage;
  label: string;  // 원어명: '한국어', 'English', '日本語', 'Español'
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'es', label: 'Español' },
];
```

**언어 변경 처리 흐름:**
1. 사용자가 새 언어 선택
2. `i18n.changeLanguage(selectedLang)` → UI 즉시 반영 (재시작 불필요)
3. `userApi.updateSettings({ language: selectedLang })` → 서버 저장 (비동기)
4. `authStore.setUser(...)` → 로컬 상태 갱신
5. 서버 저장 실패 시 → 에러 토스트 표시, 로컬에는 이미 반영됨

#### 5.4.6 타임존 전용 선택 화면 (TimezoneSelectScreen)

기존 `SettingsScreen` 내 7개 드롭다운을 제거하고, 전용 화면으로 분리한다.

```typescript
// frontend/src/screens/settings/TimezoneSelectScreen.tsx

interface TimezoneItem {
  name: string;      // 'Asia/Seoul'
  offset: string;    // 'UTC+09:00'
  offsetMinutes: number; // 540 (정렬용)
}
```

**타임존 목록 획득:**
```typescript
function getAllTimezones(): TimezoneItem[] {
  const timezones = Intl.supportedValuesOf('timeZone');
  return timezones.map((tz) => {
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    // UTC 오프셋 파싱 및 정렬값 계산
    // ...
    return { name: tz, offset, offsetMinutes };
  }).sort((a, b) => a.offsetMinutes - b.offsetMinutes);
}
```

**`Intl.supportedValuesOf` 호환성 fallback:**
```typescript
function getAllTimezones(): TimezoneItem[] {
  if (typeof Intl.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('timeZone').map(toTimezoneItem)
      .sort((a, b) => a.offsetMinutes - b.offsetMinutes);
  }
  // fallback: 정적 IANA 타임존 리스트 (번들 포함)
  return STATIC_TIMEZONE_LIST.map(toTimezoneItem)
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes);
}
```

> `STATIC_TIMEZONE_LIST`는 `frontend/src/i18n/timezones.ts`에 IANA 타임존 문자열 배열로 번들한다. `Intl.supportedValuesOf`를 지원하지 않는 구형 기기에서만 사용한다.

**화면 구조:**
```
TimezoneSelectScreen
├── Header (← 뒤로 + "타임존 선택")
├── SearchField (검색 입력 + ✕ 초기화 버튼)
└── FlatList<TimezoneItem>
    └── TimezoneRow × N
        ├── ✓ (현재 선택 시)
        ├── 타임존 이름 (Asia/Seoul)
        └── UTC 오프셋 (UTC+09:00)
```

**검색 필터링:**
```typescript
// 대소문자 무관 부분 일치, 입력 즉시 필터링
const filteredTimezones = useMemo(() => {
  if (!searchQuery) return allTimezones;
  const query = searchQuery.toLowerCase();
  return allTimezones.filter((tz) =>
    tz.name.toLowerCase().includes(query)
  );
}, [searchQuery, allTimezones]);
```

**현재 선택 항목 최상단 고정:**
```typescript
const sortedTimezones = useMemo(() => {
  if (!currentTimezone) return filteredTimezones;
  const current = filteredTimezones.find((tz) => tz.name === currentTimezone);
  const rest = filteredTimezones.filter((tz) => tz.name !== currentTimezone);
  return current ? [current, ...rest] : filteredTimezones;
}, [filteredTimezones, currentTimezone]);
```

**선택 확정:**
1. 항목 탭 → 체크마크 표시
2. `userApi.updateSettings({ timezone: selectedTz })` → 서버 저장
3. `authStore.setUser(...)` → 로컬 상태 갱신
4. `navigation.goBack()` → 설정 화면 복귀
5. 서버에서 알림 스케줄 재설정 (기존 로직 활용)

#### 5.4.7 네비게이션 변경

```typescript
// navigation/types.ts
export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
  Settings: undefined;
  VoiceInput: { todoDate: string };
  TimezoneSelect: undefined;  // 추가
};
```

```typescript
// RootNavigator.tsx 또는 AuthNavigator.tsx
<Stack.Screen
  name="TimezoneSelect"
  component={TimezoneSelectScreen}
  options={{ headerShown: false }}
/>
```

#### 5.4.8 온보딩 조건 변경

```typescript
// AuthNavigator.tsx
// 변경 전
const isOnboarded = user?.timezone != null;

// 변경 후
const isOnboarded = user?.planTime != null && user?.reviewTime != null;
```

온보딩 화면에서 타임존 설정 단계를 제거하고, 계획 시간/회고 시간 설정만 유지한다.

#### 5.4.9 회원가입 시 디바이스 정보 전송

```typescript
// features/auth/useAuth.ts
import { getLocales, getCalendars } from 'expo-localization';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/i18n';

function getDeviceTimezone(): string {
  const calendars = getCalendars();
  return calendars[0]?.timeZone
    ?? Intl.DateTimeFormat().resolvedOptions().timeZone
    ?? 'UTC';
}

function getDeviceLanguage(): SupportedLanguage {
  const locales = getLocales();
  const lang = locales[0]?.languageCode ?? 'en';
  if (SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
    return lang as SupportedLanguage;
  }
  return 'en';
}

// OAuth 콜백 URL에 timezone, language 쿼리 파라미터 추가
const redirectUri = `${BASE_URL}/auth/google/callback`
  + `?fcmToken=${fcmToken}`
  + `&deviceType=${deviceType}`
  + `&timezone=${encodeURIComponent(getDeviceTimezone())}`
  + `&language=${getDeviceLanguage()}`;
```

#### 5.4.10 STT 언어 연동

```typescript
// features/voice/useSpeechRecognition.ts
import { STT_LOCALE_MAP } from '@/i18n';
import { useTranslation } from 'react-i18next';

// 변경 전
ExpoSpeechRecognitionModule.start({ lang: 'ko-KR', ... });

// 변경 후
const { i18n } = useTranslation();
const sttLocale = STT_LOCALE_MAP[i18n.language as SupportedLanguage] ?? 'en-US';
ExpoSpeechRecognitionModule.start({ lang: sttLocale, ... });
```

#### 5.4.11 프론트엔드 타입 변경

```typescript
// types/user.ts
// 변경 전
interface UserProfile {
  // ...
  language: string;
}

// 변경 후
import { SupportedLanguage } from '@/i18n';

interface UserProfile {
  // ...
  language: SupportedLanguage;  // 'ko' | 'en' | 'ja' | 'es'
}
```

### 5.5 백엔드 설계

#### 5.5.1 User 엔티티 변경

```typescript
// user/domain/user.entity.ts
// 변경: language 기본값 및 형식
@Column({ name: 'language', type: 'varchar', length: 10 })
language!: string;
// 저장 형식: 'ko-KR' → 'ko' (BCP 47 language subtag)
// 기본값: 'ko-KR' → 'en' (OAuth 콜백에서 설정)
```

#### 5.5.2 OAuth 콜백 변경

```typescript
// auth/application/dto/oauth-callback.dto.ts
// timezone, language 파라미터 추가
export class OAuthCallbackDto {
  // ... 기존 필드
  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  language?: string;
}
```

```typescript
// auth/auth.controller.ts
// 콜백 핸들러에서 query 파라미터 수신
@Get('google/callback')
async googleCallback(@Query() query: OAuthCallbackQueryDto) {
  // timezone, language를 usecase에 전달
}
```

```typescript
// auth/application/oauth-callback.usecase.ts
// 변경 전
const user = await this.userRepository.create({
  userAuthId: userAuth.id,
  userName: providerUserName,
  timezone: null,           // ← 변경
  language: 'ko-KR',       // ← 변경
  // ...
});

// 변경 후
const VALID_LANGUAGES = ['ko', 'en', 'ja', 'es'];

const language = VALID_LANGUAGES.includes(input.language ?? '')
  ? input.language!
  : 'en';

const timezone = this.isValidTimezone(input.timezone)
  ? input.timezone!
  : null;

const user = await this.userRepository.create({
  userAuthId: userAuth.id,
  userName: providerUserName,
  timezone,                 // 디바이스 감지값 또는 null
  language,                 // 디바이스 감지값 또는 'en'
  // ...
});

// 타임존 유효성 검증 (기존 update-settings.usecase.ts의 로직 재사용)
private isValidTimezone(tz?: string): boolean {
  if (!tz) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
```

#### 5.5.3 Update Settings DTO — 언어 유효성 검증 강화

```typescript
// user/application/dto/update-settings.dto.ts
import { IsIn } from 'class-validator';

// 변경 전
@IsString()
@IsOptional()
language?: string;

// 변경 후
@IsString()
@IsOptional()
@IsIn(['ko', 'en', 'ja', 'es'])
language?: string;
```

#### 5.5.4 Gemini 서비스 — 언어별 프롬프트 분기

```typescript
// ai/infrastructure/gemini.service.ts

private static readonly REFINE_PROMPTS: Record<string, string> = {
  ko: '다음 음성 인식 텍스트를 간결한 할 일(todo) 형태로 정리해줘. 부연 설명 없이 할 일 내용만 반환해.',
  en: 'Refine the following speech-to-text result into a concise todo item. Return only the todo content without any explanation.',
  ja: '次の音声認識テキストを簡潔なToDo形式に整理してください。説明なしでToDoの内容のみ返してください。',
  es: 'Refina el siguiente texto de reconocimiento de voz en un elemento de tarea conciso. Devuelve solo el contenido de la tarea sin explicación.',
};

// refineText 메서드 시그니처 변경
async refineText(rawText: string, language: string = 'ko'): Promise<string> {
  const prompt = GeminiService.REFINE_PROMPTS[language]
    ?? GeminiService.REFINE_PROMPTS['en'];

  // ... 기존 retry 로직 동일, 프롬프트만 교체
  const result = await this.model.generateContent([
    `${prompt}\n\n"${rawText}"`,
  ]);
  // ...
}
```

```typescript
// todo/application/refine-text.usecase.ts
// 사용자 언어를 GeminiService에 전달
async execute(input: RefineTextInput): Promise<RefineTextResponse> {
  const user = await this.userRepository.findByUserAuthId(input.userAuthId);
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  const refinedText = await this.geminiService.refineText(
    input.text,
    user.language,  // 추가: 사용자 언어 전달
  );
  return { refinedText };
}
```

#### 5.5.5 DB 마이그레이션

```sql
-- language 컬럼: 'ko-KR' → 'ko' 형식 일괄 변환
UPDATE todolist_user SET language = 'ko' WHERE language = 'ko-KR';
UPDATE todolist_user SET language = 'en' WHERE language = 'en-US';
UPDATE todolist_user SET language = 'ja' WHERE language = 'ja-JP';
UPDATE todolist_user SET language = 'es' WHERE language = 'es-ES';

-- 매핑되지 않는 값은 'en'으로 기본 설정
UPDATE todolist_user SET language = 'en'
  WHERE language NOT IN ('ko', 'en', 'ja', 'es');

-- 기본값 변경 (TypeORM 엔티티에서 처리, DDL 레벨에서도 반영)
ALTER TABLE todolist_user ALTER COLUMN language SET DEFAULT 'en';
```

TypeORM 마이그레이션 파일로 생성:
```typescript
// migration/xxxx-update-language-format.ts
export class UpdateLanguageFormat implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE todolist_user SET language = 'ko' WHERE language = 'ko-KR'`);
    await queryRunner.query(`UPDATE todolist_user SET language = 'en' WHERE language NOT IN ('ko', 'en', 'ja', 'es')`);
    await queryRunner.query(`ALTER TABLE todolist_user ALTER COLUMN language SET DEFAULT 'en'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE todolist_user SET language = 'ko-KR' WHERE language = 'ko'`);
    await queryRunner.query(`ALTER TABLE todolist_user ALTER COLUMN language SET DEFAULT 'ko-KR'`);
  }
}
```

### 5.6 의존성

| 패키지 | 버전 | 위치 | 용도 |
| --- | --- | --- | --- |
| `i18next` | ^24.x | 프론트엔드 | 다국어 프레임워크 |
| `react-i18next` | ^15.x | 프론트엔드 | React/React Native i18n 바인딩 |
| `expo-localization` | ~52.x | 프론트엔드 | 디바이스 언어/타임존 감지 |

> `expo-localization`은 Expo SDK에 포함되어 있으며 `npx expo install`로 호환 버전 설치.

---

## 6. 에러 처리 상세

### 6.1 프론트엔드

| 시나리오 | 처리 |
| --- | --- |
| 디바이스 언어 감지 실패 | `'en'` fallback 적용, 앱 정상 동작 |
| 번역 키 누락 | `i18next` fallbackLng 설정에 의해 영어 텍스트 표시. 영어도 누락 시 키 이름 노출 방지 (`returnNull: false`, `returnEmptyString: false` 설정) |
| 언어 변경 서버 저장 실패 | 로컬 i18n 언어는 이미 변경됨, 에러 토스트 표시. 다음 앱 실행 시 서버 값으로 복원 |
| 타임존 감지 실패 | `'UTC'` fallback 적용, 설정 화면에서 수동 변경 유도 |
| `Intl.supportedValuesOf` 미지원 | 정적 IANA 리스트로 fallback |
| 타임존 검색 결과 없음 | `t('timezone.noResults')` 빈 상태 메시지 표시 |
| 타임존 변경 서버 저장 실패 | 에러 토스트 표시, 선택 화면 유지 (재시도 가능) |

### 6.2 백엔드

| 시나리오 | HTTP | Code | 처리 |
| --- | --- | --- | --- |
| OAuth 콜백 timezone 유효하지 않음 | - | - | `null`로 저장, 설정에서 수동 변경 |
| OAuth 콜백 language 유효하지 않음 | - | - | `'en'`으로 저장 |
| `PATCH /settings` language 유효하지 않음 | 400 | `BAD_REQUEST` | `@IsIn` 검증 실패 |
| `PATCH /settings` timezone 유효하지 않음 | 400 | `INVALID_TIMEZONE` | 기존 `Intl.DateTimeFormat` 검증 |
| `refineText` 언어 미지원 | - | - | 영어 프롬프트 fallback |

---

## 7. 테스트 전략

### 7.1 백엔드 단위 테스트

| 대상 | 테스트 케이스 |
| --- | --- |
| `OAuthCallbackUsecase` | 유효한 timezone/language 전달 시 저장, 무효한 timezone 시 null, 무효한 language 시 'en' fallback, timezone/language 미전달 시 기본값 |
| `UpdateSettingsUsecase` | language 'ko'/'en'/'ja'/'es' 정상 업데이트, 미지원 언어 400 에러 |
| `UpdateSettingsDto` | `@IsIn` 검증 — 유효/무효 언어 코드 |
| `GeminiService.refineText` | 각 언어별 프롬프트 사용 확인, 미지원 언어 시 영어 fallback |
| `RefineTextUsecase` | 사용자 언어를 GeminiService에 전달하는지 확인 |
| DB 마이그레이션 | `'ko-KR'` → `'ko'` 변환, 미매핑 값 → `'en'` 변환 |

### 7.2 프론트엔드 단위 테스트

| 대상 | 테스트 케이스 |
| --- | --- |
| `i18n/index.ts` | 지원 언어 감지 시 해당 언어 설정, 비지원 언어 시 'en' fallback |
| `SettingsScreen` (언어) | 언어 목록 표시, 선택 시 `i18n.changeLanguage` 호출, 서버 API 호출 |
| `TimezoneSelectScreen` | 타임존 목록 렌더링, 검색 필터링, 현재 선택 최상단 고정, 빈 결과 메시지, 선택 시 API 호출 및 goBack |
| `useSpeechRecognition` | 사용자 언어에 따른 STT locale 매핑 |
| `useAuth` | OAuth 리다이렉트 URL에 timezone/language 포함 확인 |
| 주요 화면 컴포넌트 | `t()` 호출이 올바른 키를 사용하는지 스냅샷 테스트 |

### 7.3 E2E 테스트 (Maestro)

```yaml
# .maestro/settings/language-change.yaml
- launchApp
- tapOn: "설정"                    # 또는 설정 아이콘
- assertVisible: "언어"            # 언어 항목 존재 확인
- tapOn: "언어"
- assertVisible: "English"
- tapOn: "English"
- assertVisible: "Language"        # UI가 영어로 전환됨

# .maestro/settings/timezone-select.yaml
- launchApp
- tapOn: "설정"
- tapOn: "타임존"
- assertVisible: "타임존 선택"      # 전용 화면 진입
- tapOn: "검색"
- inputText: "Tokyo"
- assertVisible: "Asia/Tokyo"
- tapOn: "Asia/Tokyo"
- assertNotVisible: "타임존 선택"   # 설정 화면 복귀
```

---

## 8. 변경 파일 목록

### 프론트엔드

| 유형 | 파일 경로 | 설명 |
| --- | --- | --- |
| 신규 | `src/i18n/index.ts` | i18next 초기화, 헬퍼 함수, 상수 |
| 신규 | `src/i18n/locales/ko.json` | 한국어 번역 (원본) |
| 신규 | `src/i18n/locales/en.json` | 영어 번역 (기본/fallback) |
| 신규 | `src/i18n/locales/ja.json` | 일본어 번역 |
| 신규 | `src/i18n/locales/es.json` | 스페인어 번역 |
| 신규 | `src/i18n/timezones.ts` | 정적 IANA 타임존 리스트 (Intl fallback) |
| 신규 | `src/screens/settings/TimezoneSelectScreen.tsx` | 타임존 검색/선택 전용 화면 |
| 수정 | `src/screens/settings/SettingsScreen.tsx` | 언어 선택 항목 추가, 타임존을 전용 화면 네비게이션으로 변경, `TIMEZONE_OPTIONS` 하드코딩 제거, 하드코딩 텍스트 → `t()` |
| 수정 | `src/screens/onboarding/OnboardingScreen.tsx` | 하드코딩 텍스트 → `t()` |
| 수정 | `src/screens/main/MainScreen.tsx` | 하드코딩 텍스트 → `t()` |
| 수정 | `src/app/navigation/AuthNavigator.tsx` | 온보딩 조건 변경 (`planTime == null AND reviewTime == null`), 서버 언어값으로 i18n 동기화 |
| 수정 | `src/app/navigation/RootNavigator.tsx` | `TimezoneSelect` 화면 등록 |
| 수정 | `src/app/navigation/types.ts` | `TimezoneSelect` 파라미터 추가 |
| 수정 | `src/features/auth/useAuth.ts` | OAuth 리다이렉트에 timezone/language 파라미터 추가 |
| 수정 | `src/features/voice/useSpeechRecognition.ts` | STT 언어를 사용자 설정에 연동 |
| 수정 | `src/types/user.ts` | `language` 타입을 `SupportedLanguage`로 변경 |
| 수정 | 전체 화면/컴포넌트 | 하드코딩 한국어 텍스트를 `t('key')` 호출로 교체 |

### 백엔드

| 유형 | 파일 경로 | 설명 |
| --- | --- | --- |
| 신규 | `migration/xxxx-update-language-format.ts` | language 컬럼 형식 변환 + 기본값 변경 |
| 수정 | `src/user/domain/user.entity.ts` | language 기본값 문서화 (실제 기본값은 OAuth 콜백에서 설정) |
| 수정 | `src/user/application/dto/update-settings.dto.ts` | language 필드에 `@IsIn` 검증 추가 |
| 수정 | `src/auth/application/oauth-callback.usecase.ts` | timezone/language 파라미터 수신 및 검증 후 저장 |
| 수정 | `src/auth/application/dto/oauth-callback.dto.ts` | timezone, language 필드 추가 |
| 수정 | `src/auth/auth.controller.ts` | OAuth 콜백에 timezone, language 쿼리 파라미터 추가 수신 |
| 수정 | `src/ai/infrastructure/gemini.service.ts` | `refineText`에 language 파라미터 추가, 언어별 프롬프트 분기 |
| 수정 | `src/todo/application/refine-text.usecase.ts` | 사용자 언어를 GeminiService에 전달 |

### 테스트

| 유형 | 파일 경로 | 설명 |
| --- | --- | --- |
| 신규 | `frontend/__tests__/i18n/index.test.ts` | i18n 초기화, 언어 감지 테스트 |
| 신규 | `frontend/__tests__/screens/settings/TimezoneSelectScreen.test.tsx` | 타임존 선택 화면 테스트 |
| 수정 | `frontend/__tests__/screens/settings/SettingsScreen.test.tsx` | 언어 선택 UI 테스트 추가 |
| 수정 | `frontend/__tests__/features/auth/useAuth.test.ts` | timezone/language 전송 테스트 추가 |
| 수정 | `frontend/__tests__/features/voice/useSpeechRecognition.test.ts` | STT 언어 연동 테스트 추가 |
| 신규 | `backend/test/unit/auth/oauth-callback-i18n.spec.ts` | OAuth timezone/language 처리 테스트 |
| 수정 | `backend/test/unit/user/update-settings.usecase.spec.ts` | 언어 검증 테스트 추가 |
| 수정 | `backend/test/unit/ai/gemini.service.spec.ts` | 언어별 프롬프트 테스트 추가 |
| 신규 | `.maestro/settings/language-change.yaml` | 언어 변경 E2E |
| 신규 | `.maestro/settings/timezone-select.yaml` | 타임존 선택 E2E |

---

## 9. 마일스톤

| 단계 | 범위 | 산출물 |
| --- | --- | --- |
| M1: i18n 기반 구축 | `i18next` 설치 및 초기화, 번역 파일 구조 생성, `ko.json` 원본 작성, 디바이스 언어 감지 | i18n 모듈 + 한국어 번역 파일 |
| M2: 번역 파일 생성 | `en.json`, `ja.json`, `es.json` AI 번역 + 교차 검수 + 키 일치 검증 | 4개 언어 번역 파일 |
| M3: 하드코딩 텍스트 교체 | 전체 화면/컴포넌트의 한국어 하드코딩을 `t()` 호출로 교체 | 다국어 지원 UI |
| M4: 백엔드 변경 | DB 마이그레이션, OAuth 콜백 파라미터 추가, 언어 검증, LLM 프롬프트 분기 | API 변경 + 단위 테스트 |
| M5: 타임존 확장 | `TimezoneSelectScreen` 구현, IANA 타임존 목록, 검색/필터, 설정 화면 연동 | 타임존 전용 화면 |
| M6: 온보딩/인증 흐름 | 온보딩 조건 변경, 회원가입 시 자동 감지 전송, 설정 언어 변경 UI | 통합 흐름 완성 |
| M7: STT/음성 연동 | STT 언어 매핑, 서버 언어 동기화 | 음성 기능 다국어 |
| M8: E2E 검증 | Maestro 테스트, 수동 언어 전환 테스트, 레이아웃 검증 (es 긴 텍스트) | 테스트 통과 |
