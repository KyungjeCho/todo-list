# 리서치 결과: 다국어(i18n) 지원 및 전 세계 타임존 확장

**브랜치**: `005-i18n-timezone` | **날짜**: 2026-04-10

## 1. i18n 라이브러리 선택

**결정**: `i18next` + `react-i18next` + `expo-localization`

**근거**:
- `i18next`는 React Native에서 가장 널리 사용되는 i18n 라이브러리로, 풍부한 생태계와 안정적인 유지보수를 보장한다.
- `react-i18next`는 `useTranslation` 훅을 제공하여 함수형 컴포넌트에서 자연스럽게 사용 가능하다. 언어 변경 시 리렌더링을 자동 트리거한다.
- `expo-localization`은 Expo SDK에 포함되어 있어 추가 네이티브 설정 없이 디바이스 언어/타임존 감지가 가능하다.
- 번들 크기가 작고(~8KB gzipped), 인터폴레이션, 복수형 등 고급 기능을 지원한다.

**대안 검토**:
- `react-intl` (FormatJS): 날짜/숫자 포맷팅에 강하나, 단순 텍스트 번역에는 i18next가 더 가볍고 React Native 지원이 우수하다.
- `expo-localization` 단독: 번역 관리, fallback, 인터폴레이션 기능이 없어 i18n 프레임워크로 부족하다.

## 2. 번역 파일 구조

**결정**: 단일 네임스페이스, 화면/기능별 네스팅된 JSON

**근거**:
- 앱 규모가 크지 않아(8개 화면, ~15개 컴포넌트) 네임스페이스 분리의 이점이 없다.
- 하나의 JSON 파일로 관리하면 번역 키 동기화가 단순하다.
- 화면/기능별 네스팅(예: `settings.title`, `voice.listening`)으로 키 충돌을 방지한다.

**대안 검토**:
- 화면별 JSON 분리 (`settings.json`, `main.json` 등): 로딩 최적화 가능하나, 앱 규모상 불필요한 복잡성.

## 3. 번역 생성 및 검수 프로세스

**결정**: AI 번역(Claude/Gemini) → 다중 AI 교차 검수

**근거**:
- 한국어 원본(`ko.json`)을 먼저 작성하고, AI를 사용하여 영어, 일본어, 스페인어 번역을 생성한다.
- 생성된 번역을 다른 AI 모델로 교차 검수하여 자연스러운 표현과 문맥 적합성을 확인한다.
- 키 일치 검증은 스크립트로 자동화한다(모든 JSON 파일의 키가 `ko.json`과 동일한지 확인).

**키 일치 검증 방법**:
- 빌드 시 또는 CI에서 각 번역 파일의 키 구조를 `ko.json`과 비교하는 스크립트를 실행한다.
- 누락된 키가 있으면 빌드/CI 실패로 처리한다.

## 4. 타임존 목록 획득 방법

**결정**: `Intl.supportedValuesOf('timeZone')` 우선, 정적 리스트 fallback

**근거**:
- `Intl.supportedValuesOf('timeZone')`는 런타임에 전체 IANA 타임존을 획득하는 표준 API이다.
- 대부분의 최신 디바이스(Android 12+, iOS 16+)에서 지원된다.
- 구형 디바이스 대응을 위해 정적 IANA 타임존 리스트(`timezones.ts`)를 번들에 포함한다.

**UTC 오프셋 계산**:
- `Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' })`으로 동적 계산한다.
- DST(서머타임) 변경 시에도 현재 시점 기준 정확한 오프셋을 표시한다.

**대안 검토**:
- `moment-timezone`: 무거운 라이브러리(~600KB). 현재 프로젝트에 moment 의존성이 없으므로 도입 부적합.
- `date-fns-tz`: 가벼우나, `Intl` API만으로 충분한 기능을 커버할 수 있어 불필요.

## 5. 디바이스 언어/타임존 감지

**결정**: `expo-localization`의 `getLocales()` + `getCalendars()`

**근거**:
- `getLocales()[0].languageCode`로 디바이스 기본 언어를 획득한다.
- `getCalendars()[0].timeZone`으로 디바이스 타임존을 획득한다.
- `Intl.DateTimeFormat().resolvedOptions().timeZone`을 보조 fallback으로 사용한다.
- Expo SDK에 이미 포함되어 있어 추가 설치가 필요 없다(이미 Expo ~55 사용 중).

## 6. 언어 변경 시 즉시 반영 메커니즘

**결정**: `i18n.changeLanguage()` + `react-i18next`의 자동 리렌더링

**근거**:
- `i18n.changeLanguage(lang)`을 호출하면 `react-i18next`가 `useTranslation()` 훅을 사용하는 모든 컴포넌트를 자동으로 리렌더링한다.
- 앱 재시작이 불필요하며, 200ms 이내 전체 UI 반영이 가능하다.
- 서버 저장은 비동기로 처리하여 사용자 경험에 지연을 주지 않는다.

## 7. 언어 감지 우선순위

**결정**: 서버 저장값 → 디바이스 언어 → 영어 fallback

**근거**:
- 로그인 후 서버에 저장된 언어 설정이 있으면 해당 값을 우선 사용한다.
- 로그인 전(첫 실행)에는 디바이스 언어를 감지한다.
- 비지원 언어이면 영어(en)를 기본값으로 사용한다.
- 이 순서는 사용자의 의도적 선택을 최우선으로 존중한다.

## 8. 온보딩 조건 변경 영향 분석

**결정**: `timezone != null` → `planTime != null AND reviewTime != null`

**근거**:
- 현재: `AuthNavigator.tsx:324`에서 `user?.timezone != null`으로 온보딩 완료 여부를 판단한다.
- 변경 후: 타임존은 회원가입 시 자동 설정되므로, 계획/회고 시간 설정 여부로 온보딩 완료를 판단한다.
- 기존 사용자: 이미 타임존이 설정되어 있으므로 planTime/reviewTime도 설정되어 있다. 영향 없음.

## 9. language 컬럼 마이그레이션

**결정**: `'ko-KR'` → `'ko'` 형식 변환, 기본값 `'en'`으로 변경

**근거**:
- 현재 `user.entity.ts`의 `language` 컬럼에 `'ko-KR'` 형식이 저장되어 있다.
- i18next의 표준 언어 코드는 BCP 47 language subtag(`ko`, `en` 등)를 사용한다.
- 마이그레이션에서 `'ko-KR'` → `'ko'`, `'en-US'` → `'en'` 등으로 일괄 변환한다.
- 매핑되지 않는 값은 `'en'`으로 기본 설정한다.

## 10. STT 언어 매핑

**결정**: 사용자 설정 언어 → STT locale 정적 매핑

**근거**:
- 현재 `useSpeechRecognition.ts`의 88행, 111행에서 `'ko-KR'`이 하드코딩되어 있다.
- 사용자 언어 설정에 따라 `{ ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', es: 'es-ES' }` 매핑을 적용한다.
- `i18n.language`에서 현재 언어를 읽어 `STT_LOCALE_MAP`으로 변환한다.

## 11. LLM 프롬프트 언어 분기

**결정**: 언어별 정적 프롬프트 맵 + `refineText` 메서드 시그니처 변경

**근거**:
- 현재 `gemini.service.ts`의 `REFINE_PROMPT`가 한국어로 하드코딩되어 있다.
- 4개 언어별 프롬프트를 `Record<string, string>` 맵으로 정의한다.
- `refineText(rawText, language)` 시그니처로 변경하여 사용자 언어를 받는다.
- `refine-text.usecase.ts`에서 `user.language`를 `geminiService.refineText`에 전달한다.
- `TRANSCRIBE_PROMPT`는 음성→텍스트 변환이므로, STT locale에 따라 결과 언어가 결정된다. 별도 분기 불필요.

## 12. 새 의존성 호환성

**결정**: `i18next` ^24.x, `react-i18next` ^15.x, `expo-localization` ~52.x

**근거**:
- `i18next` ^24.x: React 19 호환. ESM/CJS 모두 지원.
- `react-i18next` ^15.x: React 19의 `use()` 훅 패턴 지원.
- `expo-localization`: Expo SDK ~55에 포함. `npx expo install`로 호환 버전 자동 설치.
- 기존 의존성과의 충돌 없음 확인.
