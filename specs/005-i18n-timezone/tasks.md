# Tasks: 다국어(i18n) 지원 및 전 세계 타임존 확장

**입력**: `/specs/005-i18n-timezone/`의 설계 문서
**필수 문서**: plan.md, spec.md, research.md, data-model.md, contracts/api-changes.md, quickstart.md

**테스트**: 헌법 원칙 III(TDD NON-NEGOTIABLE)에 따라 모든 Phase에 테스트 태스크 포함. Red → Green → Refactor 순서를 준수한다.

**구성**: 태스크는 사용자 스토리 단위로 구성되어 독립적 구현 및 테스트가 가능하다.

## 형식: `[ID] [P?] [Story] 설명`

- **[P]**: 병렬 실행 가능 (다른 파일, 의존성 없음)
- **[Story]**: 해당 사용자 스토리 (예: US1, US2, US3)
- 정확한 파일 경로 포함

---

## Phase 1: 셋업 (공유 인프라)

**목적**: i18n 라이브러리 설치 및 프로젝트 구조 초기화

- [x] T001 프론트엔드 i18n 의존성 설치 — `cd frontend && npx expo install expo-localization && npm install i18next react-i18next`
- [x] T002 [P] i18n 디렉토리 구조 생성 — `frontend/src/i18n/`, `frontend/src/i18n/locales/`

---

## Phase 2: 기반 (i18n 인프라 — 모든 스토리의 전제 조건)

**목적**: i18next 초기화, 한국어 원본 번역 파일, fallback 언어 설정. US1(자동 감지) + US6(영어 fallback)의 기반.

**⚠️ 중요**: 이 Phase가 완료되어야 모든 사용자 스토리 작업이 시작 가능

### 테스트 (Red 단계 — 먼저 작성, 실패 확인)

- [x] T003 [P] i18n 초기화 테스트 — `frontend/__tests__/i18n/index.test.ts` (지원 언어 감지 시 해당 언어 설정, 비지원 언어 시 'en' fallback, fallbackLng이 'en'인지)
- [x] T004 [P] 번역 키 일치 검증 테스트 — `frontend/__tests__/i18n/locale-keys.test.ts` (ko/en/ja/es 4개 파일의 키 구조가 동일한지)

### 구현 (Green 단계)

- [x] T005 i18next 초기화 모듈 구현 — `frontend/src/i18n/index.ts` (`SUPPORTED_LANGUAGES`, `SupportedLanguage`, `LANGUAGE_LABELS`, `STT_LOCALE_MAP`, `detectDeviceLanguage()`, i18n 설정: `fallbackLng: 'en'`)
- [x] T006 한국어 원본 번역 파일 작성 — `frontend/src/i18n/locales/ko.json` (전체 화면/컴포넌트의 하드코딩 텍스트 수집)
- [x] T007 영어 번역 파일 생성 — `frontend/src/i18n/locales/en.json` (AI 번역 + 교차 검수: 최소 2개 AI 모델로 번역 생성 후 교차 비교, 문맥 부적합 표현 수정)
- [x] T008 [P] 일본어 번역 파일 생성 — `frontend/src/i18n/locales/ja.json` (AI 번역 + 교차 검수: 최소 2개 AI 모델로 번역 생성 후 교차 비교, 문맥 부적합 표현 수정)
- [x] T009 [P] 스페인어 번역 파일 생성 — `frontend/src/i18n/locales/es.json` (AI 번역 + 교차 검수: 최소 2개 AI 모델로 번역 생성 후 교차 비교, 문맥 부적합 표현 수정)
- [x] T010 정적 IANA 타임존 fallback 리스트 — `frontend/src/i18n/timezones.ts` (`Intl.supportedValuesOf` 미지원 디바이스용)
- [x] T011 앱 진입점에 i18n import 추가 — `frontend/App.tsx` 또는 최상위 진입점에 `import '@/i18n'`
- [x] T012 [P] 프론트엔드 language 타입 제한 — `frontend/src/types/user.ts` (`language: string` → `language: SupportedLanguage`)

**체크포인트**: i18n 초기화 완료, `t('key')` 호출 가능, 영어 fallback 동작 확인, `SupportedLanguage` 타입 적용

---

## Phase 3: US1+US6 — 첫 구동 자동 언어 감지 + 기본 언어 영어 전환 (P1) 🎯 MVP

**목표**: 앱 첫 실행 시 디바이스 언어를 자동 감지하여 UI에 반영하고, 모든 하드코딩 한국어 텍스트를 번역 키로 교체한다. 비지원 언어는 영어로 fallback.

**독립 테스트**: 일본어 디바이스에서 앱 실행 시 UI가 일본어로 표시. 아랍어 디바이스에서는 영어로 표시. 스페인어 번역 누락 키는 영어로 표시.

### 테스트 (Red 단계)

- [x] T013 [P] [US1] 화면별 t() 호출 스냅샷 테스트 — `frontend/__tests__/screens/settings/SettingsScreen.test.tsx` (한국어 하드코딩 텍스트가 없는지, t() 키가 올바른지)
- [x] T014 [P] [US1] 화면별 t() 호출 스냅샷 테스트 — `frontend/__tests__/screens/main/MainScreen.test.tsx`
- [x] T015 [P] [US6] fallback 동작 테스트 — `frontend/__tests__/i18n/fallback.test.ts` (번역 키 누락 시 영어 표시, 영어도 누락 시 키 이름 미노출)
- [x] T016 [P] [US1] 디바이스 언어 변경 무시 테스트 — `frontend/__tests__/i18n/device-language-change.test.ts` (앱 실행 중 디바이스 언어 변경 시 앱 내 설정 언어 유지, 서버 저장값 우선 확인)

### 구현 (Green 단계)

- [x] T017 [P] [US1] 하드코딩 텍스트 교체 — `frontend/src/screens/settings/SettingsScreen.tsx` (12개 한국어 문자열 → `t()`)
- [x] T018 [P] [US1] 하드코딩 텍스트 교체 — `frontend/src/screens/main/MainScreen.tsx`
- [x] T019 [P] [US1] 하드코딩 텍스트 교체 — `frontend/src/screens/main/ReviewModeView.tsx`
- [x] T020 [P] [US1] 하드코딩 텍스트 교체 — `frontend/src/screens/onboarding/OnboardingScreen.tsx`
- [x] T021 [P] [US1] 하드코딩 텍스트 교체 — `frontend/src/screens/auth/LoginScreen.tsx`
- [x] T022 [P] [US1] 하드코딩 텍스트 교체 — `frontend/src/screens/voice/VoiceInputScreen.tsx`
- [x] T023 [P] [US1] 하드코딩 텍스트 교체 — `frontend/src/screens/calendar/CalendarScreen.tsx`
- [x] T024 [P] [US1] 하드코딩 텍스트 교체 — `frontend/src/screens/calendar/DayDetailView.tsx`
- [x] T025 [P] [US1] 하드코딩 텍스트 교체 — `frontend/src/components/todo/TodoItem.tsx`
- [x] T026 [P] [US1] 하드코딩 텍스트 교체 — `frontend/src/components/todo/TodoActionButtons.tsx`
- [x] T027 [P] [US1] 하드코딩 텍스트 교체 — `frontend/src/components/todo/ShareButton.tsx`
- [x] T028 [P] [US1] 하드코딩 텍스트 교체 — `frontend/src/components/voice/DraftTodoItem.tsx`
- [x] T029 [P] [US1] 하드코딩 텍스트 교체 — `frontend/src/features/auth/useAuth.ts` (에러 메시지 3개)
- [x] T030 [P] [US1] 하드코딩 텍스트 교체 — `frontend/src/features/voice/useSpeechRecognition.ts` (에러 메시지 2개)
- [x] T031 [P] [US1] 하드코딩 텍스트 교체 — `frontend/src/app/navigation/AuthNavigator.tsx` (에러 메시지)
- [x] T032 [US1] 서버 언어값 i18n 동기화 — `frontend/src/app/navigation/AuthNavigator.tsx` (useEffect로 `user?.language` 변경 시 `i18n.changeLanguage()` 호출)

### E2E 테스트

- [x] T033 [US1] Maestro E2E — `.maestro/settings/language-display.yaml` (앱 실행 시 언어가 올바르게 표시되는지 확인)

**체크포인트**: 모든 하드코딩 한국어 텍스트가 `t()` 호출로 교체. 디바이스 언어에 따라 자동 전환. 비지원 언어는 영어 fallback.

---

## Phase 4: US2 — 설정에서 언어 수동 변경 (P1)

**목표**: 설정 화면의 타임존 아래에 언어 선택 항목을 추가하고, 선택 시 앱 전체 UI가 즉시 전환된다.

**독립 테스트**: 설정 → 언어 → "Español" 선택 → 전체 UI가 스페인어로 즉시 전환. 앱 재시작 후에도 유지.

### 테스트 (Red 단계)

- [x] T034 [P] [US2] 언어 선택 UI 테스트 — `frontend/__tests__/unit/screens/settings/SettingsScreen.language.test.tsx` (언어 목록 표시, 원어명 표시, 선택 시 `i18n.changeLanguage` 호출, 서버 API 호출, 서버 저장 실패 시 로컬 UI 유지 + 에러 토스트 표시, 재시작 시 서버 저장값 복원)
- [x] T035 [P] [US2] 백엔드 언어 검증 테스트 — `backend/test/unit/user/application/update-settings.usecase.spec.ts` (`@IsIn` 검증: 유효 언어 성공, 비지원 언어 400 에러)

### 구현 (Green 단계)

- [x] T036 [US2] 백엔드 언어 검증 추가 — `backend/src/user/application/dto/update-settings.dto.ts` (`language` 필드에 `@IsIn(['ko', 'en', 'ja', 'es'])` 추가)
- [x] T037 [US2] 설정 화면에 언어 선택 UI 추가 — `frontend/src/screens/settings/SettingsScreen.tsx` (타임존 아래에 언어 항목 추가, 드롭다운 목록, 원어명 표시, `i18n.changeLanguage()` + API 호출 + authStore 갱신)

### E2E 테스트

- [x] T038 [US2] Maestro E2E — `.maestro/settings/language-change.yaml` (설정 → 언어 → English 선택 → UI 영어 전환 확인)

**체크포인트**: 설정에서 4개 언어 전환 가능, 즉시 반영, 서버 저장, 앱 재시작 시 유지

---

## Phase 5: US3+US7 — 회원가입 시 언어·타임존 자동 감지 + 서버 저장 (P1)

**목표**: OAuth 회원가입 시 디바이스 타임존과 언어를 자동 감지하여 서버에 전송. 온보딩 조건을 `planTime == null AND reviewTime == null`로 변경.

**독립 테스트**: 스페인어, America/Buenos_Aires 디바이스에서 가입 → 서버에 language="es", timezone="America/Buenos_Aires" 저장. 온보딩에서 타임존 선택 없이 계획/회고 시간만 설정.

### 테스트 (Red 단계)

- [x] T039 [P] [US7] 백엔드 OAuth 콜백 테스트 — `backend/test/unit/auth/oauth-callback-i18n.spec.ts` (유효한 timezone/language 저장, 무효한 timezone → null, 무효한 language → 'en', 미전달 시 기본값)
- [x] T040 [P] [US3] 프론트엔드 useAuth 테스트 — `frontend/__tests__/features/auth/useAuth.test.ts` (OAuth 리다이렉트 URL에 timezone/language 파라미터 포함 확인)
- [x] T041 [P] [US3] 온보딩 조건 테스트 — `frontend/__tests__/app/navigation/AuthNavigator.test.tsx` (planTime/reviewTime null → 온보딩 표시, 둘 다 설정됨 → 메인 표시)

### 구현 (Green 단계)

- [x] T042 [US7] 백엔드 OAuthCallbackDto 수정 — `backend/src/auth/application/dto/oauth-callback.dto.ts` (`timezone?: string`, `language?: string` 필드 추가)
- [x] T043 [US7] 백엔드 auth.controller 수정 — `backend/src/auth/auth.controller.ts` (OAuth 콜백에서 timezone/language 쿼리 파라미터 수신 후 usecase에 전달)
- [x] T044 [US7] 백엔드 oauth-callback.usecase 수정 — `backend/src/auth/application/oauth-callback.usecase.ts` (language 유효성 검증 `['ko','en','ja','es']`, timezone `Intl.DateTimeFormat` 검증, 신규 사용자 생성 시 적용)
- [x] T045 [US3] 프론트엔드 useAuth 수정 — `frontend/src/features/auth/useAuth.ts` (OAuth 리다이렉트 URL에 `timezone=` + `language=` 쿼리 파라미터 추가, `getLocales()` + `getCalendars()` 사용)
- [x] T046 [US3] 온보딩 조건 변경 — `frontend/src/app/navigation/AuthNavigator.tsx` (`user?.timezone != null` → `user?.planTime != null && user?.reviewTime != null`)

### DB 마이그레이션

- [x] T047 [US7] DB 마이그레이션 생성 — `backend/src/common/migrations/1744502400000-UpdateLanguageFormat.ts` (`'ko-KR'` → `'ko'` 변환, 미매핑 값 → `'en'`, 기본값 `'en'`으로 변경)

**체크포인트**: 신규 가입 시 timezone/language 자동 전송, 온보딩에서 타임존 단계 제거, 기존 사용자 language 데이터 마이그레이션 완료

---

## Phase 6: US4 — 설정에서 전 세계 타임존 선택 (P1)

**목표**: 기존 7개 하드코딩 타임존 드롭다운을 전 세계 IANA 타임존 검색/선택 전용 화면으로 교체.

**독립 테스트**: 설정 → 타임존 → 전용 화면 → "Tokyo" 검색 → Asia/Tokyo 선택 → 설정에 반영.

### 테스트 (Red 단계)

- [x] T048 [P] [US4] TimezoneSelectScreen 테스트 — `frontend/__tests__/unit/screens/settings/TimezoneSelectScreen.test.tsx` (목록 렌더링, 현재 선택 최상단 고정, 검색 필터링, 빈 결과 메시지, ✕ 초기화, 선택 시 onSelect/onClose 호출, 서버 저장 실패 시 에러 Alert + 화면 유지)

### 구현 (Green 단계)

- [x] T049 [US4] 네비게이션 타입에 TimezoneSelect 추가 — `frontend/src/app/navigation/types.ts`
- [x] T050 [US4] TimezoneSelectScreen 구현 — `frontend/src/screens/settings/TimezoneSelectScreen.tsx` (IANA 타임존 목록 `Intl.supportedValuesOf` + fallback, UTC 오프셋 계산, FlatList, 검색 필드, ✕ 초기화, 현재 선택 ✓ 최상단, 빈 결과 상태, 선택 시 서버 저장 + goBack)
- [x] T051 [US4] AuthNavigator에 TimezoneSelect 등록 — `frontend/src/app/navigation/AuthNavigator.tsx` (`TimezoneSelectWrapper`로 authStore+userApi 연결, modal presentation)
- [x] T052 [US4] SettingsScreen 타임존 UI 변경 — `frontend/src/screens/settings/SettingsScreen.tsx` (`TIMEZONE_OPTIONS` 하드코딩 제거, 타임존 항목 탭 시 `navigation.navigate('TimezoneSelect', { current })`)

### E2E 테스트

- [x] T053 [US4] Maestro E2E — `.maestro/settings/timezone-select.yaml` (설정 → 타임존 → 검색 "Tokyo" → Asia/Tokyo 선택 → 설정 복귀 확인)

**체크포인트**: 전 세계 타임존 검색/선택 가능, 현재 선택 최상단 고정, 서버 저장 완료

---

## Phase 7: US5 — 음성 입력 언어 연동 (P2)

**목표**: STT 언어를 사용자 설정 언어에 연동하고, LLM refine 프롬프트를 언어별로 분기한다.

**독립 테스트**: 언어를 스페인어로 설정 → 음성 입력 → STT가 es-ES로 인식 → refine 프롬프트가 스페인어로 실행.

### 테스트 (Red 단계)

- [ ] T054 [P] [US5] STT 언어 연동 테스트 — `frontend/__tests__/features/voice/useSpeechRecognition.test.ts` (사용자 언어에 따른 STT locale 매핑: ko→ko-KR, en→en-US, ja→ja-JP, es→es-ES)
- [ ] T055 [P] [US5] 백엔드 GeminiService 테스트 — `backend/test/unit/ai/gemini.service.spec.ts` (`refineText` 언어별 프롬프트 사용 확인, 미지원 언어 시 영어 fallback)
- [ ] T056 [P] [US5] 백엔드 RefineTextUsecase 테스트 — `backend/test/unit/todo/refine-text.usecase.spec.ts` (사용자 language를 GeminiService에 전달 확인)

### 구현 (Green 단계)

- [ ] T057 [US5] 프론트엔드 STT 언어 연동 — `frontend/src/features/voice/useSpeechRecognition.ts` (88행, 111행의 `'ko-KR'` → `STT_LOCALE_MAP[i18n.language]`)
- [ ] T058 [US5] 백엔드 GeminiService 언어별 프롬프트 — `backend/src/ai/infrastructure/gemini.service.ts` (`REFINE_PROMPTS` Record 추가, `refineText(rawText, language)` 시그니처 변경)
- [ ] T059 [US5] 백엔드 RefineTextUsecase 언어 전달 — `backend/src/todo/application/refine-text.usecase.ts` (`user.language`를 `geminiService.refineText(input.text, user.language)`에 전달)

**체크포인트**: 4개 언어 모두 STT 인식 + LLM refine 동작 확인

---

## Phase 8: 마무리 및 전체 검증

**목적**: 전체 스토리 통합 검증, 코드 정리, 문서 동기화

- [ ] T060 [P] 번역 키 일치 최종 검증 — 4개 JSON 파일의 키 구조 일치 확인 스크립트 실행
- [ ] T061 [P] 성능 검증 — 언어 전환 200ms 이내 확인 (SC-002: 설정에서 4개 언어 순환 전환 시 UI 반영 시간 측정)
- [ ] T062 [P] 성능 검증 — 타임존 검색 필터링 100ms 이내 확인 (SC-005: TimezoneSelectScreen에서 입력 후 필터링 응답 시간 측정)
- [ ] T063 [P] 스페인어(긴 텍스트) 기준 레이아웃 검증 — 전체 화면에서 텍스트 오버플로/레이아웃 깨짐 없는지 확인
- [ ] T064 TypeScript 타입 오류 및 린트 확인 — `cd frontend && npm run lint && cd ../backend && npm run lint`
- [ ] T065 전체 단위 테스트 통과 확인 — `cd frontend && npm test && cd ../backend && npm test`
- [ ] T066 quickstart.md 검증 — quickstart.md의 모든 단계를 실행하여 동작 확인
- [ ] T067 [P] CLAUDE.md 업데이트 — 005-i18n-timezone 기술 스택 정보 추가

---

## 의존성 및 실행 순서

### Phase 의존성

- **Phase 1 (셋업)**: 의존성 없음 — 즉시 시작 가능
- **Phase 2 (기반)**: Phase 1 완료 필요 — **모든 스토리를 차단**
- **Phase 3 (US1+US6)**: Phase 2 완료 필요 — MVP 핵심
- **Phase 4 (US2)**: Phase 3 완료 필요 (t() 교체된 SettingsScreen 필요)
- **Phase 5 (US3+US7)**: Phase 3 완료 필요 — AuthNavigator.tsx 동시 수정 방지 (T031/T032 → T046)
- **Phase 6 (US4)**: Phase 3 완료 필요 (t() 교체된 SettingsScreen 필요)
- **Phase 7 (US5)**: Phase 2 완료 필요 — Phase 3~6과 병렬 가능
- **Phase 8 (마무리)**: 모든 Phase 완료 필요

### 사용자 스토리 의존성

```
Phase 1 → Phase 2 → Phase 3 (US1+US6) ─┬→ Phase 4 (US2)
                                         ├→ Phase 5 (US3+US7)
                                         ├→ Phase 6 (US4)
                    Phase 2 → Phase 7 (US5)      [Phase 3과 병렬 가능]
                                         └→ Phase 8 (마무리)
```

### 각 스토리 내부 순서

- 테스트를 먼저 작성하고 실패를 확인한다 (Red)
- 모델/타입 → 서비스/usecase → 화면/컴포넌트 순으로 구현한다 (Green)
- 스토리 완료 후 다음 우선순위로 이동한다

### 병렬 기회

- Phase 2: T003, T004 병렬 / T008, T009 병렬
- Phase 3: T013~T016 병렬 (테스트) / T017~T031 모두 병렬 (서로 다른 파일)
- Phase 5: T039, T040, T041 병렬 (서로 다른 파일/프로젝트)
- Phase 7: T054, T055, T056 병렬 (서로 다른 파일/프로젝트)

---

## 병렬 실행 예시: Phase 3 (US1+US6)

```bash
# 테스트 먼저 (Red):
Task: T013 "SettingsScreen 스냅샷 테스트"
Task: T014 "MainScreen 스냅샷 테스트"
Task: T015 "fallback 동작 테스트"
Task: T016 "디바이스 언어 변경 무시 테스트"

# 구현 (Green) — 모두 서로 다른 파일이므로 병렬 실행:
Task: T017 "SettingsScreen.tsx 텍스트 교체"
Task: T018 "MainScreen.tsx 텍스트 교체"
Task: T019 "ReviewModeView.tsx 텍스트 교체"
Task: T020 "OnboardingScreen.tsx 텍스트 교체"
Task: T021 "LoginScreen.tsx 텍스트 교체"
...
```

---

## 구현 전략

### MVP 우선 (Phase 1~3만)

1. Phase 1 완료: 의존성 설치
2. Phase 2 완료: i18n 인프라 + 번역 파일
3. Phase 3 완료: 전체 하드코딩 텍스트 교체 + 자동 언어 감지
4. **중단 및 검증**: 4개 언어로 앱 실행 테스트
5. 배포/데모 가능

### 점진적 전달

1. Phase 1~3 → i18n 기반 완성 (MVP!)
2. Phase 4 추가 → 언어 수동 변경 가능
3. Phase 5 추가 → 회원가입 시 자동 감지
4. Phase 6 추가 → 전 세계 타임존 선택
5. Phase 7 추가 → 음성 입력 언어 연동
6. 각 단계에서 이전 기능을 깨뜨리지 않고 가치를 추가

---

## 비고

- [P] 태스크 = 서로 다른 파일, 의존성 없음
- [Story] 라벨은 spec.md의 사용자 스토리에 매핑
- 각 사용자 스토리는 독립적으로 완성 및 테스트 가능
- 테스트가 실패하는 것을 확인한 후 구현 시작
- 각 태스크 또는 논리적 그룹 단위로 커밋
- 모든 체크포인트에서 독립적 스토리 검증 가능
