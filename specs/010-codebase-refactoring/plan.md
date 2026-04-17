# Implementation Plan: Codebase Refactoring

**Branch**: `010-codebase-refactoring` | **Date**: 2026-04-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-codebase-refactoring/spec.md`

## Summary

REFACTORING_REPORT.md에서 식별된 백엔드/프론트엔드 코드 중복, 대형 컴포넌트, 코드 품질 이슈를 체계적으로 리팩토링한다. 외부 동작(API 응답, DB 스키마)을 변경하지 않으면서 내부 코드 구조를 개선하여 유지보수성, 일관성, 성능을 높인다.

## Technical Context

**Language/Version**: TypeScript 5.9 (Frontend), TypeScript 5.7 (Backend)  
**Primary Dependencies**: React Native (Expo ~55), NestJS v11, Zustand, TypeORM  
**Storage**: Supabase (PostgreSQL) — 스키마 변경 없음  
**Testing**: Jest (백엔드 단위 40+, 통합 6, 프론트엔드 60+), Maestro E2E 25개  
**Target Platform**: iOS/Android (React Native), Linux Server (NestJS)  
**Project Type**: Mobile App + Backend API  
**Performance Goals**: TodoItem FlatList 스크롤 리렌더 감소  
**Constraints**: 모든 기존 테스트 100% 통과, API 계약 유지  
**Scale/Scope**: Frontend 71개 파일, Backend 89개 파일 (총 ~5,350줄)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 상태 | 비고 |
|------|------|------|
| I. 한국어 우선 | ✅ 통과 | 문서 한국어, 코드 식별자 영어 유지 |
| II. 엄격한 TypeScript | ✅ 통과 | any 제거 포함, 인라인 캐스트 정리 |
| III. TDD 우선 | ✅ 통과 | 리팩토링 전후 전체 테스트 통과 필수, 새 서비스에 단위 테스트 추가 |
| IV. 계층 분리 | ✅ 통과 | 계층 구조 유지하며 중복만 추출 |
| V. 실패 처리와 관측성 | ✅ 통과 | 에러 코드 통합으로 관측성 개선 |
| VI. 단순성 우선 | ✅ 통과 | 중복 제거는 정당한 추상화, 새 라이브러리 추가 없음 |
| VII. 명세서 중심 개발 | ✅ 통과 | REFACTORING_REPORT.md 기반 |
| VIII. 주석 전략 | ✅ 통과 | WHY 주석 + JSDoc 추가 포함 |
| IX. 브랜치 전략 | ✅ 통과 | feature/010 브랜치에서 작업, PR 필수 |
| X. E2E 테스트 | ✅ 통과 | 기존 Maestro E2E 25개 통과 확인 |

**Gate 결과: 모든 원칙 통과. 진행 가능.**

### Phase 1 설계 후 재검증

| 원칙 | 재검증 | 비고 |
|------|--------|------|
| II. TypeScript | ✅ | 인라인 캐스트 → TodoItemMapper 내부로 격리 |
| IV. 계층 분리 | ✅ | UserValidationService(공통), TodoAuthorizationService(application), TodoItemMapper(application) — 계층 준수 |
| VI. 단순성 | ✅ | 13곳 중복 → 1 서비스는 정당한 추상화 |

## Project Structure

### Documentation (this feature)

```text
specs/010-codebase-refactoring/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── common/
│   │   ├── constants/
│   │   │   └── error-codes.ts          # [신규] ERROR_CODES 상수
│   │   ├── services/
│   │   │   └── user-validation.service.ts  # [신규] 사용자 검증 서비스
│   │   └── utils/
│   │       └── date-helper.ts          # [신규] 날짜 계산 유틸
│   ├── todo/
│   │   └── application/
│   │       ├── services/
│   │       │   └── todo-authorization.service.ts  # [신규] 소유권 검증
│   │       ├── mappers/
│   │       │   └── todo-item.mapper.ts            # [신규] DTO 매퍼
│   │       └── usecases/                          # [수정] 중복 제거
│   ├── auth/                                      # [수정] JSDoc + WHY 주석
│   ├── user/                                      # [수정] JSDoc
│   └── memo/                                      # [수정] JSDoc
└── test/                                          # [수정] 신규 서비스 테스트 추가

frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Checkbox.tsx             # [신규] 공통 체크박스
│   │   │   ├── ErrorBanner.tsx          # [신규] 공통 에러 배너
│   │   │   └── LoadingSpinner.tsx       # [신규] 공통 로딩
│   │   ├── settings/
│   │   │   ├── SettingsIcons.tsx        # [신규] 아이콘 분리
│   │   │   ├── NotificationSettings.tsx # [신규] 알림 섹션
│   │   │   ├── LanguagePicker.tsx       # [신규] 언어 선택
│   │   │   └── AccountSettings.tsx      # [신규] 계정 섹션
│   │   └── todo/
│   │       └── TodoItem.tsx             # [수정] React.memo 적용
│   ├── features/
│   │   └── common/
│   │       └── useTimer.ts             # [신규] 타이머 훅
│   ├── screens/
│   │   └── settings/
│   │       └── SettingsScreen.tsx       # [수정] 분리 후 축소
│   ├── store/                           # [수정] 셀렉터 표준화
│   └── types/
│       └── todo.ts                      # [수정] Stats 타입 통합
└── __tests__/                           # [수정] 신규 컴포넌트 테스트
```

**Structure Decision**: 기존 프로젝트 구조(backend/frontend 분리)를 그대로 유지. 신규 파일은 기존 디렉토리 관례에 따라 배치.

## Implementation Phases

### Phase 1: 백엔드 중복 제거 (P1 — 가장 큰 효과)

> **목표**: 19곳 중복 → 2개 서비스 + 1개 매퍼 + 1개 유틸로 통합

| 단계 | 작업 | 영향 파일 |
|------|------|----------|
| 1-1 | `UserValidationService` 작성 + 테스트 | user-validation.service.ts, user-validation.service.spec.ts |
| 1-2 | 13개 usecase에서 중복 코드를 서비스 호출로 교체 | create-todo, change-todo-status, delete-todo, create-memo, update-memo, delete-memo, update-todo, get-todos, get-monthly-summary, batch-create-todo, refine-text, update-settings, complete-onboarding |
| 1-3 | `TodoAuthorizationService` 작성 + 테스트 | todo-authorization.service.ts, todo-authorization.service.spec.ts |
| 1-4 | 6개 usecase에서 중복 코드를 서비스 호출로 교체 | change-todo-status, delete-todo, update-todo, create-memo, update-memo, delete-memo |
| 1-5 | `TodoItemMapper` 작성 + 테스트 | todo-item.mapper.ts, todo-item.mapper.spec.ts |
| 1-6 | 4개 usecase에서 매핑 중복을 매퍼 호출로 교체 | create-todo, change-todo-status, update-todo, get-todos |
| 1-7 | `DateHelper.getNextDate()` 추출 + 테스트 | date-helper.ts, date-helper.spec.ts |
| 1-8 | 2개 usecase에서 중복 함수를 유틸 호출로 교체 | carryover-scheduler, complete-day |
| 1-9 | 전체 백엔드 테스트 통과 확인 | 전체 |

### Phase 2: 프론트엔드 대형 컴포넌트 분리 (P2)

> **목표**: SettingsScreen 767줄 분리, TodoItem 최적화

| 단계 | 작업 | 영향 파일 |
|------|------|----------|
| 2-1 | `SettingsIcons.tsx` 추출 (9개 인라인 아이콘) | SettingsScreen, SettingsIcons |
| 2-2 | `NotificationSettings`, `LanguagePicker`, `AccountSettings` 분리 | SettingsScreen, 신규 3개 파일 |
| 2-3 | `TodoItem`에 `React.memo` 래핑 | TodoItem.tsx |
| 2-4 | 프론트엔드 테스트 통과 확인 | 전체 |

### Phase 3: 공통 컴포넌트 추출 (P3)

> **목표**: 중복 UI 패턴 13곳 → 3개 공통 컴포넌트

| 단계 | 작업 | 영향 파일 |
|------|------|----------|
| 3-1 | `Checkbox` 컴포넌트 추출 + 테스트 | TodoItem, ReviewModeView |
| 3-2 | `ErrorBanner` 컴포넌트 추출 + 테스트 | MainScreen, CalendarScreen, VoiceInputScreen, SettingsScreen |
| 3-3 | `LoadingSpinner` 컴포넌트 추출 + 테스트 | MainScreen, CalendarScreen, SettingsScreen |
| 3-4 | 프론트엔드 테스트 통과 확인 | 전체 |

### Phase 4: 코드 품질 강화 (P4)

> **목표**: 에러 코드 통합, WHY 주석/JSDoc 추가, 타입 정리

| 단계 | 작업 | 영향 파일 |
|------|------|----------|
| 4-1 | `ERROR_CODES` 상수 객체 작성 | error-codes.ts |
| 4-2 | 전체 usecase/controller 에러 코드를 상수로 교체 | 20+ 파일 |
| 4-3 | 보안 민감 코드 WHY 주석 추가 (6곳) | oauth-login, token.service, token-refresh, oauth-callback |
| 4-4 | 비즈니스 로직 WHY 주석 추가 (6곳) | get-todos, carryover-scheduler, change-todo-status, batch-create-todo |
| 4-5 | Config/상수 근거 주석 추가 (5곳) | app.module, auth.controller, useAppFocusRefresh, CalendarScreen, SettingsScreen |
| 4-6 | 타입 단언 안전성 주석 추가 (3곳) | get-todos, change-todo-status, oauth-callback |
| 4-7 | 프론트엔드 WHY 주석 추가 (9곳) | tokenManager, TodoItem, useAuth, soundService, authStore, CalendarScreen |
| 4-8 | 컨트롤러 JSDoc 추가 (21개 메서드) | todo.controller, auth.controller, user.controller, memo.controller |
| 4-9 | 전체 테스트 + 린트 통과 확인 | 전체 |

### Phase 5: 커스텀 훅 및 성능 최적화 (P5)

> **목표**: 코드 재사용성 + 렌더링 성능 개선

| 단계 | 작업 | 영향 파일 |
|------|------|----------|
| 5-1 | `useTimer` 훅 추출 + 테스트 | useSpeechRecognition, VoiceControls, useShareTodo |
| 5-2 | Zustand 셀렉터 표준화 | authStore, 사용처 전체 |
| 5-3 | `Stats` 타입 통합 | MainScreen, ReviewModeView, types/todo.ts |
| 5-4 | `get-todos` reduce 최적화 (filter 4회 → reduce 1회) | get-todos.usecase.ts |
| 5-5 | 전체 테스트 통과 확인 | 전체 |

## Risk & Mitigation

| 리스크 | 영향도 | 대응 |
|--------|--------|------|
| usecase 교체 시 기존 테스트 실패 | 높음 | 단계별 교체 + 매 단계 테스트 실행 |
| SettingsScreen 분리 시 상태 공유 누락 | 중간 | props 체인 검증 + E2E 테스트 |
| 에러 코드 교체 시 프론트엔드 에러 핸들링 영향 | 중간 | 프론트엔드에서 사용하는 에러 코드 사전 조사 |
| React.memo 적용 시 props 비교 비용 | 낮음 | 프로파일링으로 효과 검증 |

## Complexity Tracking

> 모든 Constitution 원칙 통과. 위반 사항 없음.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
