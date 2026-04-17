# Tasks: Codebase Refactoring

**Input**: Design documents from `/specs/010-codebase-refactoring/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: TDD 필수 (Constitution III — NON-NEGOTIABLE). 모든 신규 서비스/컴포넌트에 테스트 선행.

**Organization**: 태스크는 User Story별로 그룹화하여 독립 구현/테스트 가능.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 의존성 없음)
- **[Story]**: 소속 User Story (US1, US2, US3, US4, US5)
- 모든 설명에 정확한 파일 경로 포함

## Path Conventions

- **Backend**: `backend/src/`, `backend/test/`
- **Frontend**: `frontend/src/`, `frontend/__tests__/`

---

## Phase 1: Setup (사전 검증)

**Purpose**: 리팩토링 시작 전 기존 코드 상태 확인

- [X] T001 백엔드 전체 테스트 + 린트 실행으로 현재 상태 기록 (`cd backend && npm test && npm run lint`)
- [X] T002 [P] 프론트엔드 전체 테스트 + 린트 실행으로 현재 상태 기록 (`cd frontend && npm test && npm run lint`)

---

## Phase 2: Foundational (공통 기반)

**Purpose**: 모든 User Story에서 사용하는 공통 상수/유틸 생성. US1이 직접 사용하므로 선행 필수.

**⚠️ CRITICAL**: User Story 작업 전 완료 필수

### 테스트

- [X] T003 [P] `ERROR_CODES` 상수 테스트 작성 — 모든 에러 코드가 상수로 정의되고 문자열 값과 일치하는지 검증 in `backend/test/common/constants/error-codes.spec.ts`
- [X] T004 [P] `DateHelper.getNextDate()` 단위 테스트 작성 — 일반 날짜, 월말, 윤년 케이스 in `backend/test/common/utils/date-helper.spec.ts`

### 구현

- [X] T005 [P] `ERROR_CODES` 상수 객체 생성 — USER_NOT_FOUND, TODO_NOT_FOUND, MEMO_NOT_FOUND, FORBIDDEN, INVALID_STATUS_TRANSITION 등 in `backend/src/common/constants/error-codes.ts`
- [X] T006 [P] `DateHelper` 유틸 생성 — `getNextDate(dateStr: string): string` 메서드 in `backend/src/common/utils/date-helper.ts`
- [X] T007 T003, T004 테스트 통과 확인

**Checkpoint**: 공통 상수/유틸 준비 완료. User Story 구현 시작 가능.

---

## Phase 3: User Story 1 — 백엔드 중복 로직 통합 (Priority: P1) 🎯 MVP

**Goal**: 사용자 검증(13곳) + Todo 소유권 검증(6곳) + DTO 매핑(4곳) + 날짜 계산(2곳) 중복을 서비스/매퍼로 통합

**Independent Test**: 기존 백엔드 테스트 40+개 전체 통과 + 신규 서비스 단위 테스트 통과

### 테스트 (Red 단계 — 먼저 작성, 실패 확인)

- [X] T008 [P] [US1] `UserValidationService.ensureUserExists()` 단위 테스트 작성 — 존재하는 사용자 반환, 미존재 시 NotFoundException 검증 in `backend/test/common/services/user-validation.service.spec.ts`
- [X] T009 [P] [US1] `TodoAuthorizationService.validateOwnership()` 단위 테스트 작성 — Todo 존재+소유자 반환, 미존재 시 NotFoundException, 소유자 불일치 시 ForbiddenException 검증 in `backend/test/todo/application/services/todo-authorization.service.spec.ts`
- [X] T010 [P] [US1] `TodoItemMapper.toDto()` 단위 테스트 작성 — Todo+Memos → TodoItemDto 변환, memos 빈 배열, 날짜 ISO 변환 검증 in `backend/test/todo/application/mappers/todo-item.mapper.spec.ts`

### 구현 (Green 단계)

- [X] T011 [US1] `UserValidationService` 구현 — `ensureUserExists(userAuthId)` 메서드, UserRepository 주입 in `backend/src/common/services/user-validation.service.ts`
- [X] T012 [US1] `TodoAuthorizationService` 구현 — `validateOwnership(todoId, userId)` 메서드, TodoRepository 주입 in `backend/src/todo/application/services/todo-authorization.service.ts`
- [X] T013 [US1] `TodoItemMapper` 구현 — `toDto(todo)` 정적 메서드, 인라인 타입 캐스트를 내부에 격리 in `backend/src/todo/application/mappers/todo-item.mapper.ts`
- [X] T014 [US1] T008, T009, T010 테스트 통과 확인

### Usecase 교체 (Refactor 단계)

- [X] T015 [US1] 13개 usecase에서 사용자 검증 중복을 `UserValidationService.ensureUserExists()` 호출로 교체
- [X] T016 [US1] 6개 usecase에서 Todo 소유권 검증 중복을 `TodoAuthorizationService.validateOwnership()` 호출로 교체
- [X] T017 [US1] 4개 usecase에서 DTO 매핑 중복을 `TodoItemMapper.toDto()` 호출로 교체
- [X] T018 [US1] 2개 usecase에서 `getNextDate()` 중복을 `DateHelper.getNextDate()` 호출로 교체
- [X] T019 [US1] NestJS Module에 신규 서비스 provider 등록 — UserValidationService를 공통 모듈 또는 각 모듈에, TodoAuthorizationService를 Todo/Memo 모듈에 등록
- [X] T020 [US1] 기존 에러 코드 문자열을 `ERROR_CODES` 상수로 교체 — T015~T018에서 교체한 파일 내 에러 코드를 상수 참조로 변경
- [X] T021 [US1] 백엔드 전체 테스트 통과 확인 (`cd backend && npm test && npm run lint`)

**Checkpoint**: 백엔드 중복 19곳 제거 완료. 모든 기존 테스트 + 신규 서비스 테스트 통과.

---

## Phase 4: User Story 2 — 프론트엔드 대형 컴포넌트 분리 (Priority: P2)

**Goal**: SettingsScreen(767줄) 분리 + TodoItem React.memo 적용

**Independent Test**: SettingsScreen 기능 동일, TodoItem 리렌더 감소, 기존 프론트엔드 테스트 통과

### 테스트 (Red 단계)

- [X] T022 [P] [US2] `SettingsIcons` 컴포넌트 테스트 작성 — 각 아이콘이 올바른 SVG를 렌더하는지 검증
- [X] T023 [P] [US2] `NotificationSettings` 컴포넌트 테스트 작성 — 알림 토글, 시간 선택 동작 검증
- [X] T024 [P] [US2] `TodoItem` React.memo 동작 테스트 작성 — props 미변경 시 리렌더 안 됨 검증

### 구현 (Green 단계)

- [X] T025 [P] [US2] `SettingsIcons.tsx` 추출 — 8개 인라인 아이콘 컴포넌트 이동
- [X] T026 [US2] `NotificationSettings.tsx` 분리 — 알림 설정 섹션을 독립 컴포넌트로 추출
- [X] T027 [US2] `LanguagePicker.tsx` 분리 — 언어 선택 섹션을 독립 컴포넌트로 추출
- [X] T028 [US2] `AccountSettings.tsx` 분리 — 계정/로그아웃 섹션을 독립 컴포넌트로 추출
- [X] T029 [US2] `SettingsScreen.tsx` 리팩토링 — 분리된 컴포넌트를 import하여 조합, 767줄 → 236줄로 축소
- [X] T030 [US2] `TodoItem.tsx`에 `React.memo` 래핑 적용
- [X] T031 [US2] 프론트엔드 전체 테스트 통과 확인 (`cd frontend && npm test && npm run lint`)

**Checkpoint**: SettingsScreen 분리 + TodoItem 최적화 완료. 기존 기능 동일 동작.

---

## Phase 5: User Story 3 — 공통 컴포넌트 추출 (Priority: P3)

**Goal**: 체크박스(2곳), 에러 배너(4+곳), 로딩 인디케이터(3+곳) 중복을 공통 컴포넌트로 통합

**Independent Test**: 공통 컴포넌트 단위 테스트 통과 + 사용처에서 동일한 UI/동작 유지

### 테스트 (Red 단계)

- [X] T032 [P] [US3] `Checkbox` 컴포넌트 테스트 작성
- [X] T033 [P] [US3] `ErrorBanner` 컴포넌트 테스트 작성
- [X] T034 [P] [US3] `LoadingSpinner` 컴포넌트 테스트 작성

### 구현 (Green 단계)

- [X] T035 [P] [US3] `Checkbox` 공통 컴포넌트 구현
- [X] T036 [P] [US3] `ErrorBanner` 공통 컴포넌트 구현
- [X] T037 [P] [US3] `LoadingSpinner` 공통 컴포넌트 구현

### 사용처 교체 (Refactor 단계)

- [X] T038 [US3] `TodoItem.tsx`와 `ReviewModeView.tsx`의 체크박스를 `Checkbox` 컴포넌트로 교체
- [X] T039 [US3] `MainScreen`, `CalendarScreen`, `VoiceInputScreen`, `SettingsScreen`, `DayDetailView`의 에러 배너를 `ErrorBanner`로 교체
- [X] T040 [US3] `MainScreen`, `CalendarScreen`, `SettingsScreen`, `DayDetailView`의 로딩 인디케이터를 `LoadingSpinner`로 교체
- [X] T041 [US3] 프론트엔드 전체 테스트 통과 확인 (`cd frontend && npm test && npm run lint`)

**Checkpoint**: 공통 컴포넌트 3개 추출 완료. 중복 13곳 → 각 1곳으로 통합.

---

## Phase 6: User Story 4 — 코드 품질 강화 (Priority: P4)

**Goal**: WHY 주석 44곳 + JSDoc 21개 메서드 추가, 에러 코드 상수 전면 교체

**Independent Test**: 린트 통과 + 전체 테스트 통과 (주석/문서 변경이므로 기능 영향 없음)

### 구현

- [X] T042 [P] [US4] 보안 민감 코드 WHY 주석 추가 (6곳) — `signState/verifyState` in `backend/src/auth/application/usecases/oauth-login.usecase.ts`, `hashToken` in `backend/src/auth/domain/services/token.service.ts`, refresh rotation in `backend/src/auth/application/usecases/token-refresh.usecase.ts`, `sanitizeTimezone` in `backend/src/auth/application/usecases/oauth-callback.usecase.ts`, 동시 갱신 제어 in `frontend/src/services/tokenManager.ts`
- [X] T043 [P] [US4] 비즈니스 로직 WHY 주석 추가 (6곳) — `determineMode` in `backend/src/todo/application/usecases/get-todos.usecase.ts`, `isMidnight` in `backend/src/scheduler/application/usecases/carryover-scheduler.usecase.ts`, CARRIED_OVER 차단 in `backend/src/todo/application/usecases/change-todo-status.usecase.ts`, 배치 트랜잭션 in `backend/src/todo/application/usecases/batch-create-todo.usecase.ts`, TodoItem useEffect in `frontend/src/components/todo/TodoItem.tsx`, Android 13+ 권한 in `frontend/src/features/auth/useAuth.ts`
- [X] T044 [P] [US4] Config/상수 근거 주석 추가 (5곳) — Throttler 설정 in `backend/src/app.module.ts`, tokenRefresh 쓰로틀 in `backend/src/auth/auth.controller.ts`, MIDNIGHT_CHECK_INTERVAL in `frontend/src/features/common/useAppFocusRefresh.ts`, 요일 색상 in `frontend/src/screens/calendar/CalendarScreen.tsx`, 기본 알림 시간 in `frontend/src/screens/settings/SettingsScreen.tsx`
- [X] T045 [P] [US4] 타입 단언 안전성 WHY 주석 추가 (3곳) — memo 인라인 타입 in `backend/src/todo/application/usecases/get-todos.usecase.ts`, enum 캐스팅 in `backend/src/todo/application/usecases/change-todo-status.usecase.ts`, stateData 캐스팅 in `backend/src/auth/application/usecases/oauth-callback.usecase.ts`
- [X] T046 [P] [US4] 프론트엔드 WHY 주석 추가 (4곳) — soundService preload/play 가드 in `frontend/src/features/sound/soundService.ts`, authStore restoreTokens in `frontend/src/store/authStore.ts`, CalendarScreen getTodayDate TODO in `frontend/src/screens/calendar/CalendarScreen.tsx`
- [X] T047 [US4] `todo.controller.ts` JSDoc 추가 (9개 메서드) — getMonthlySummary, getTodos, refineText, batchCreateTodos, createTodo, completeDay, updateTodo, changeTodoStatus, deleteTodo in `backend/src/todo/todo.controller.ts`
- [X] T048 [US4] `auth.controller.ts` JSDoc 추가 (4개 메서드) — oauthLogin, oauthCallback, tokenRefresh, logout in `backend/src/auth/auth.controller.ts`
- [X] T049 [P] [US4] `user.controller.ts` JSDoc 추가 (4개 메서드) — getProfile, completeOnboarding, updateSettings, registerDevice in `backend/src/user/user.controller.ts`
- [X] T050 [P] [US4] `memo.controller.ts` JSDoc 추가 (3개 메서드) — createMemo, updateMemo, deleteMemo in `backend/src/memo/memo.controller.ts`
- [X] T051 [US4] 잔여 에러 코드 문자열을 `ERROR_CODES` 상수로 교체 — Phase 3에서 미처리된 컨트롤러/서비스 파일 전체 스캔
- [X] T052 [US4] 백엔드 + 프론트엔드 전체 테스트 + 린트 통과 확인

**Checkpoint**: WHY 주석 44곳 + JSDoc 21개 메서드 추가 완료. 코드 품질 기준 충족.

---

## Phase 7: User Story 5 — 커스텀 훅 및 성능 최적화 (Priority: P5)

**Goal**: useTimer 훅 추출, Zustand 셀렉터 표준화, Stats 타입 통합, get-todos reduce 최적화

**Independent Test**: 훅 단위 테스트 + 기존 기능 테스트 통과 + 린트 통과

### 테스트 (Red 단계)

- [X] T053 [P] [US5] `useTimer` 훅 테스트 작성 — setTimeout/setInterval 생성, cleanup, 중복 호출 방지 검증 in `frontend/__tests__/features/common/useTimer.test.ts`
- [X] T054 [P] [US5] `get-todos` reduce 최적화 테스트 작성 — 기존 filter 3회와 동일한 결과를 reduce 1회로 반환하는지 검증 in `backend/test/todo/application/usecases/get-todos.usecase.spec.ts` (기존 테스트에 케이스 추가)

### 구현 (Green 단계)

- [X] T055 [US5] `useTimer` 훅 구현 — setTimeout/setInterval 래핑, 자동 cleanup, ref 관리 in `frontend/src/features/common/useTimer.ts`
- [X] T056 [US5] `useSpeechRecognition.ts`, `VoiceControls.tsx`, `useShareTodo.ts`에서 타이머 패턴을 `useTimer` 훅으로 교체 in `frontend/src/features/voice/useSpeechRecognition.ts`, `frontend/src/components/voice/VoiceControls.tsx`, `frontend/src/features/share/useShareTodo.ts`
- [X] T057 [US5] Zustand 셀렉터 표준화 — authStore에 셀렉터 함수 추가, 전체 구독 패턴을 셀렉터로 교체 in `frontend/src/store/authStore.ts` 및 사용처
- [X] T058 [US5] `Stats` 타입 통합 — MainScreen과 ReviewModeView의 중복 정의를 `frontend/src/types/todo.ts`로 이동, 양쪽에서 import
- [X] T059 [US5] `get-todos.usecase.ts` 다중 순회 최적화 — filter 4회를 reduce 1회로 교체 in `backend/src/todo/application/usecases/get-todos.usecase.ts`
- [X] T060 [US5] 백엔드 + 프론트엔드 전체 테스트 + 린트 통과 확인

**Checkpoint**: 커스텀 훅 + 성능 최적화 완료. 모든 기존 기능 정상 동작.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 전체 검증 및 마무리

- [X] T061 [P] quickstart.md 검증 절차 실행 — 백엔드/프론트엔드 전체 테스트 + 린트
- [X] T062 [P] 사용되지 않는 import/코드 정리 — 중복 제거 후 남은 미사용 import 제거
- [X] T063 리팩토링 전후 테스트 결과 비교 — T001/T002 기록과 최종 결과 대조

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음 — 즉시 시작
- **Foundational (Phase 2)**: Setup 완료 후 — 모든 User Story 차단
- **US1 (Phase 3)**: Foundational 완료 후 시작 — 다른 Story 의존 없음
- **US2 (Phase 4)**: Foundational 완료 후 시작 — US1과 독립적으로 병렬 가능
- **US3 (Phase 5)**: US2 완료 후 시작 — SettingsScreen 분리 후 공통 컴포넌트 교체
- **US4 (Phase 6)**: US1 완료 후 시작 — 에러 코드 상수 교체가 US1의 서비스 교체 이후 진행
- **US5 (Phase 7)**: Foundational 완료 후 시작 — US1/US2와 독립적으로 병렬 가능 (get-todos reduce는 US1 후)
- **Polish (Phase 8)**: 모든 User Story 완료 후

### User Story Dependencies

- **US1 (P1)**: Foundational → 즉시 시작 가능. **다른 Story 의존 없음.**
- **US2 (P2)**: Foundational → 즉시 시작 가능. US1과 병렬 가능.
- **US3 (P3)**: US2 → SettingsScreen 분리 후 시작 (공통 컴포넌트 교체 대상에 포함).
- **US4 (P4)**: US1 → ERROR_CODES 상수 전면 교체 위해 서비스 통합 이후 진행.
- **US5 (P5)**: Foundational → 대부분 병렬 가능. T059(get-todos reduce)만 US1 이후.

### Within Each User Story

- 테스트를 먼저 작성하고 실패 확인 (Red)
- 서비스/컴포넌트 구현 (Green)
- 사용처 교체 (Refactor)
- 전체 테스트 통과 확인 후 Checkpoint

### Parallel Opportunities

- T001 ∥ T002 (백엔드/프론트엔드 사전 검증)
- T003 ∥ T004 (Foundational 테스트), T005 ∥ T006 (Foundational 구현)
- T008 ∥ T009 ∥ T010 (US1 서비스 테스트)
- T022 ∥ T023 ∥ T024 (US2 컴포넌트 테스트)
- T032 ∥ T033 ∥ T034 (US3 공통 컴포넌트 테스트), T035 ∥ T036 ∥ T037 (구현)
- T042 ∥ T043 ∥ T044 ∥ T045 ∥ T046 (US4 WHY 주석 — 모두 다른 파일)
- T047 ∥ T049 ∥ T050 (US4 JSDoc — 다른 컨트롤러)
- T053 ∥ T054 (US5 테스트)
- US1 ∥ US2 ∥ US5(일부) 병렬 진행 가능

---

## Parallel Example: User Story 1

```bash
# 테스트 먼저 병렬 작성 (Red):
Task: "UserValidationService 단위 테스트" in backend/test/common/services/
Task: "TodoAuthorizationService 단위 테스트" in backend/test/todo/application/services/
Task: "TodoItemMapper 단위 테스트" in backend/test/todo/application/mappers/

# 서비스 병렬 구현 (Green) — 테스트 실패 확인 후:
Task: "UserValidationService 구현" in backend/src/common/services/
Task: "TodoAuthorizationService 구현" in backend/src/todo/application/services/
Task: "TodoItemMapper 구현" in backend/src/todo/application/mappers/
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 완료: 사전 검증
2. Phase 2 완료: Foundational (ERROR_CODES + DateHelper)
3. Phase 3 완료: US1 — 백엔드 중복 19곳 제거
4. **STOP and VALIDATE**: 백엔드 전체 테스트 통과 확인
5. 가장 큰 효과(19곳 중복 제거)를 먼저 달성

### Incremental Delivery

1. Setup + Foundational → 기반 준비
2. US1 → 백엔드 중복 제거 → 검증 (MVP!)
3. US2 → SettingsScreen 분리 + TodoItem 최적화 → 검증
4. US3 → 공통 컴포넌트 추출 → 검증
5. US4 → WHY 주석 + JSDoc → 검증
6. US5 → 커스텀 훅 + 성능 최적화 → 검증
7. Polish → 최종 검증

---

## Notes

- [P] = 다른 파일, 의존성 없음 → 병렬 가능
- [Story] = 소속 User Story 추적
- TDD 필수: Red → Green → Refactor
- 매 Checkpoint에서 전체 테스트 통과 확인
- 외부 동작 변경 금지: API 응답, DB 스키마 유지
- 단계별 커밋: 각 서비스/컴포넌트 추출 후 독립 커밋
