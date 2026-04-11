# 구현 계획: 다국어(i18n) 지원 및 전 세계 타임존 확장

**브랜치**: `005-i18n-timezone` | **날짜**: 2026-04-10 | **명세**: [spec.md](./spec.md)
**입력**: `/specs/005-i18n-timezone/spec.md`의 기능 명세

## 요약

현재 앱의 모든 UI 텍스트가 한국어로 하드코딩되어 있고, 타임존 선택이 7개로 제한되어 있다. `i18next` + `react-i18next` + `expo-localization` 기반 다국어 체계(ko, en, ja, es)를 도입하고, 타임존 선택을 전 세계 IANA 타임존으로 확장한다. 백엔드에서는 회원가입 시 디바이스 언어·타임존을 자동 수신하고, `language` 컬럼 형식을 정규화하며, LLM 프롬프트를 언어별로 분기한다.

## 기술 컨텍스트

**언어/버전**: TypeScript 5.x (프론트엔드 & 백엔드)
**프론트엔드**: React Native (Expo ~55), React 19.2, Zustand 5.x
**백엔드**: NestJS 11.x, TypeORM 0.3.28
**저장소**: Supabase (PostgreSQL)
**테스트**: Jest (단위/통합), Maestro MCP + Android 에뮬레이터 (E2E)
**대상 플랫폼**: iOS / Android (크로스 플랫폼 모바일 앱)
**프로젝트 유형**: 모바일 앱 + REST API
**성능 목표**: 언어 전환 200ms 이내, 타임존 검색 필터링 100ms 이내
**제약사항**: 앱 재시작 없이 언어 즉시 전환, `Intl.supportedValuesOf` 미지원 디바이스 fallback

## 헌법 체크

*게이트: Phase 0 리서치 전 통과 필수. Phase 1 설계 후 재검증.*

| # | 원칙 | 상태 | 근거 |
|---|------|------|------|
| I | 한국어 우선 | ✅ 통과 | spec/plan/tasks 모두 한국어 작성. 코드 식별자는 영어 유지 |
| II | 엄격한 TypeScript | ✅ 통과 | `SupportedLanguage` 유니온 타입 사용, `any` 금지. 서버에서 `@IsIn` 검증 |
| III | TDD (NON-NEGOTIABLE) | ✅ 통과 | 각 Phase에서 테스트 선행 작성 후 구현 (Red → Green → Refactor) |
| IV | 계층 분리 | ✅ 통과 | FE: screen → feature → service → infra / BE: controller → application → domain → infra 유지 |
| V | 실패 처리·관측성 | ✅ 통과 | 언어/타임존 감지 실패 fallback, 서버 저장 실패 시 에러 토스트, 빈 검색 결과 상태 |
| VI | 단순성 우선 | ✅ 통과 | i18next는 업계 표준, 단일 네임스페이스 사용. 정적 타임존 리스트는 Intl fallback용으로만 |
| VII | 명세서 중심 | ✅ 통과 | PRD_I18N_TIMEZONE.md, TECH_SPEC_I18N_TIMEZONE.md 참조 |
| VIII | 주석 전략 | ✅ 통과 | WHY 중심 주석만 추가 |
| IX | 브랜치 전략 | ✅ 통과 | `005-i18n-timezone` 브랜치에서 작업, PR 통해 main 병합 |
| X | E2E 테스트 | ✅ 통과 | Maestro YAML로 언어 변경, 타임존 선택 E2E 테스트 작성 |

## 프로젝트 구조

### 문서 (이 기능)

```text
specs/005-i18n-timezone/
├── plan.md              # 이 파일
├── spec.md              # 기능 명세
├── research.md          # Phase 0 리서치 결과
├── data-model.md        # Phase 1 데이터 모델
├── quickstart.md        # Phase 1 빠른 시작 가이드
├── contracts/           # Phase 1 API 계약
│   └── api-changes.md   # API 변경 사항
├── checklists/          # 체크리스트
│   └── requirements.md  # 명세 품질 체크리스트
└── tasks.md             # Phase 2 태스크 (speckit.tasks로 생성)
```

### 소스 코드 (저장소 루트)

```text
backend/
├── src/
│   ├── auth/
│   │   ├── application/
│   │   │   ├── oauth-callback.usecase.ts     # 수정: timezone/language 파라미터 수신
│   │   │   └── dto/
│   │   │       └── oauth-callback.dto.ts     # 수정: timezone/language 필드 추가
│   │   └── auth.controller.ts                # 수정: 쿼리 파라미터 추가
│   ├── user/
│   │   ├── domain/
│   │   │   └── user.entity.ts                # 수정: language 기본값 변경
│   │   └── application/
│   │       └── dto/
│   │           └── update-settings.dto.ts    # 수정: @IsIn 검증 추가
│   ├── todo/
│   │   └── application/
│   │       └── refine-text.usecase.ts        # 수정: 언어 파라미터 전달
│   ├── ai/
│   │   └── infrastructure/
│   │       └── gemini.service.ts             # 수정: 언어별 프롬프트 분기
│   └── migration/
│       └── xxxx-update-language-format.ts    # 신규: DB 마이그레이션
└── test/

frontend/
├── src/
│   ├── i18n/                                 # 신규 디렉토리
│   │   ├── index.ts                          # i18next 초기화, 상수, 헬퍼
│   │   ├── timezones.ts                      # 정적 IANA 타임존 fallback 리스트
│   │   └── locales/
│   │       ├── ko.json                       # 한국어 (원본)
│   │       ├── en.json                       # 영어 (기본/fallback)
│   │       ├── ja.json                       # 일본어
│   │       └── es.json                       # 스페인어
│   ├── screens/
│   │   ├── settings/
│   │   │   ├── SettingsScreen.tsx             # 수정: 언어 선택 추가, 타임존 네비게이션 변경, t() 교체
│   │   │   └── TimezoneSelectScreen.tsx       # 신규: 타임존 검색/선택 전용 화면
│   │   ├── onboarding/
│   │   │   └── OnboardingScreen.tsx           # 수정: t() 교체
│   │   ├── main/
│   │   │   ├── MainScreen.tsx                 # 수정: t() 교체
│   │   │   └── ReviewModeView.tsx             # 수정: t() 교체
│   │   ├── auth/
│   │   │   └── LoginScreen.tsx                # 수정: t() 교체
│   │   ├── calendar/
│   │   │   ├── CalendarScreen.tsx             # 수정: t() 교체
│   │   │   └── DayDetailView.tsx              # 수정: t() 교체
│   │   └── voice/
│   │       └── VoiceInputScreen.tsx           # 수정: t() 교체
│   ├── components/
│   │   ├── todo/
│   │   │   ├── TodoItem.tsx                   # 수정: t() 교체
│   │   │   ├── TodoActionButtons.tsx          # 수정: t() 교체
│   │   │   └── ShareButton.tsx                # 수정: t() 교체
│   │   └── voice/
│   │       └── DraftTodoItem.tsx              # 수정: t() 교체
│   ├── features/
│   │   ├── auth/
│   │   │   └── useAuth.ts                     # 수정: OAuth에 timezone/language 전송
│   │   └── voice/
│   │       └── useSpeechRecognition.ts         # 수정: STT 언어 연동
│   ├── app/navigation/
│   │   ├── AuthNavigator.tsx                  # 수정: 온보딩 조건 변경, i18n 동기화
│   │   ├── RootNavigator.tsx                  # 수정: TimezoneSelect 화면 등록
│   │   └── types.ts                           # 수정: TimezoneSelect 파라미터 추가
│   └── types/
│       └── user.ts                            # 수정: language 타입 제한
└── __tests__/

.maestro/
├── settings/
│   ├── language-change.yaml                   # 신규: 언어 변경 E2E
│   └── timezone-select.yaml                   # 신규: 타임존 선택 E2E
```

**구조 결정**: 기존 `backend/` + `frontend/` 2-프로젝트 구조를 유지한다. 프론트엔드에 `src/i18n/` 디렉토리를 신규 추가하고, 백엔드에 마이그레이션 파일을 추가한다.

## 복잡성 추적

> 헌법 체크에 위반 사항 없음. 이 섹션은 해당 없음.
