# Tasks: Todo Mobile Service

**Input**: Design documents from `/specs/001-todo-mobile-service/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: TDD 필수 (헌법 III. TDD 우선 원칙 — NON-NEGOTIABLE). 모든 기능은 실패하는 테스트를 먼저 작성한다.

**Organization**: 사용자 스토리별로 그룹화하여 독립적 구현 및 테스트가 가능하도록 구성한다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 의존성 없음)
- **[Story]**: 해당 사용자 스토리 (US1, US2 등)
- 정확한 파일 경로 포함

## Path Conventions

- **Backend**: `backend/src/`, `backend/test/`
- **Frontend**: `frontend/src/`, `frontend/__tests__/`

---

## Phase 1: Setup (프로젝트 초기화)

**Purpose**: 프로젝트 구조 생성 및 기본 설정

- [X] T001 Backend NestJS 프로젝트 초기화 — `backend/` 디렉토리에 NestJS TypeScript 프로젝트 생성, tsconfig.json strict 설정
- [X] T002 Frontend React Native(Expo) 프로젝트 초기화 — `frontend/` 디렉토리에 Expo TypeScript 프로젝트 생성
- [X] T003 [P] Backend ESLint + Prettier 설정 — `backend/eslint.config.mjs`, `backend/.prettierrc`
- [X] T004 [P] Frontend ESLint + Prettier 설정 — `frontend/.eslintrc.js`, `frontend/.prettierrc`
- [X] T005 [P] Backend Jest 테스트 환경 설정 — `backend/jest.config.ts`, `backend/test/jest-e2e.json`
- [X] T006 [P] Frontend Jest + React Native Testing Library 설정 — `frontend/jest.config.ts`
- [X] T007 [P] Maestro E2E 테스트 환경 설정 — `.maestro/config.yaml` (appId: `com.todolist.app`), `.maestro/` 디렉토리 구조 생성
- [X] T008 Backend 환경 변수 설정 — `backend/.env.example`, `backend/src/common/config/configuration.ts`
- [X] T009 [P] Frontend 환경 변수 설정 — `frontend/.env.example`, `frontend/src/services/config.ts`

---

## Phase 2: Foundational (핵심 인프라)

**Purpose**: 모든 사용자 스토리에 선행하는 핵심 인프라. 이 단계 완료 전까지 사용자 스토리 작업 불가.

**CRITICAL**: 이 단계가 완료되어야 사용자 스토리 구현 시작 가능

### Tests for Foundational

> **NOTE: 테스트를 먼저 작성하고 FAIL 확인 후 구현한다**

- [X] T010 [P] 공통 에러 필터 단위 테스트 — `backend/test/unit/common/filters/http-exception.filter.spec.ts`
- [X] T011 [P] 공통 응답 인터셉터 단위 테스트 — `backend/test/unit/common/interceptors/transform.interceptor.spec.ts`
- [X] T012 [P] Base Entity 단위 테스트 — `backend/test/unit/common/entities/base.entity.spec.ts`
- [X] T013 [P] Frontend API 클라이언트 단위 테스트 — `frontend/__tests__/unit/services/api/client.test.ts`

### Implementation for Foundational

- [X] T014 TypeORM 설정 및 Supabase(PostgreSQL) 연결 — `backend/src/app.module.ts`, `backend/src/common/config/database.config.ts`
- [X] T015 [P] 공통 Base Entity 생성 (audit 컬럼) — `backend/src/common/entities/base.entity.ts`
- [X] T016 [P] 공통 에러 필터 구현 (ErrorResponse 형식) — `backend/src/common/filters/http-exception.filter.ts`
- [X] T017 [P] 공통 응답 변환 인터셉터 — `backend/src/common/interceptors/transform.interceptor.ts`
- [X] T018 [P] 공통 DTO (페이지네이션, 에러 응답) — `backend/src/common/dto/pagination.dto.ts`, `backend/src/common/dto/error-response.dto.ts`
- [X] T019 [P] Frontend API 클라이언트(Axios) 설정 — `frontend/src/services/api/client.ts`
- [X] T020 [P] Frontend 공통 타입 정의 — `frontend/src/types/api.ts`, `frontend/src/types/todo.ts`, `frontend/src/types/user.ts`
- [X] T021 Frontend React Navigation 기본 구조 설정 — `frontend/src/app/navigation/RootNavigator.tsx`, `frontend/src/app/navigation/types.ts`
- [X] T022 [P] Frontend Zustand 스토어 기본 구조 (인터페이스만) — `frontend/src/store/authStore.ts`, `frontend/src/store/todoStore.ts`
- [X] T023 DB 마이그레이션 생성 (전체 DDL) — `backend/src/common/migrations/`

**Checkpoint**: 인프라 준비 완료 — 사용자 스토리 구현 시작 가능

---

## Phase 3: User Story 1 — OAuth 인증 및 온보딩 (Priority: P1) 🎯 MVP

**Goal**: 사용자가 OAuth 소셜 로그인으로 인증하고, 신규 사용자는 온보딩에서 계획/회고 시간을 설정한 후 메인 화면에 진입한다.

**Independent Test**: OAuth 로그인 → 신규/기존 분기 → 온보딩 완료 → 메인 화면 진입 흐름 검증

### Backend Tests for User Story 1 ⚠️

> **NOTE: 테스트를 먼저 작성하고 FAIL 확인 후 구현한다**

- [X] T024 [P] [US1] UserAuth Entity 단위 테스트 — `backend/test/unit/auth/domain/user-auth.entity.spec.ts`
- [X] T025 [P] [US1] UserAuthOauth Entity 단위 테스트 — `backend/test/unit/auth/domain/user-auth-oauth.entity.spec.ts`
- [X] T026 [P] [US1] UserSession Entity 단위 테스트 — `backend/test/unit/auth/domain/user-session.entity.spec.ts`
- [X] T027 [P] [US1] User Entity 단위 테스트 — `backend/test/unit/user/domain/user.entity.spec.ts`
- [X] T028 [P] [US1] UserDevice Entity 단위 테스트 — `backend/test/unit/notification/domain/user-device.entity.spec.ts`
- [X] T029 [P] [US1] OAuth 로그인 usecase 단위 테스트 — `backend/test/unit/auth/application/oauth-login.usecase.spec.ts`
- [X] T030 [P] [US1] OAuth 콜백 usecase 단위 테스트 — `backend/test/unit/auth/application/oauth-callback.usecase.spec.ts`
- [X] T031 [P] [US1] 토큰 갱신 usecase 단위 테스트 — `backend/test/unit/auth/application/token-refresh.usecase.spec.ts`
- [X] T032 [P] [US1] 로그아웃 usecase 단위 테스트 — `backend/test/unit/auth/application/logout.usecase.spec.ts`
- [X] T033 [P] [US1] 프로필 조회 usecase 단위 테스트 — `backend/test/unit/user/application/get-profile.usecase.spec.ts`
- [X] T034 [P] [US1] 설정 변경 usecase 단위 테스트 — `backend/test/unit/user/application/update-settings.usecase.spec.ts`
- [X] T035 [P] [US1] Auth Controller 통합 테스트 — `backend/test/integration/auth/auth.controller.spec.ts`
- [X] T036 [P] [US1] User Controller 통합 테스트 — `backend/test/integration/user/user.controller.spec.ts`

### Frontend Tests for User Story 1 ⚠️

> **NOTE: 테스트를 먼저 작성하고 FAIL 확인 후 구현한다**

- [X] T037 [P] [US1] Frontend 로그인 화면 단위 테스트 (소셜 로그인 버튼 렌더링, 탭 이벤트) — `frontend/__tests__/unit/screens/auth/LoginScreen.test.tsx`
- [X] T038 [P] [US1] Frontend 온보딩 화면 단위 테스트 (시간 설정 UI, 기본값, 완료 버튼) — `frontend/__tests__/unit/screens/onboarding/OnboardingScreen.test.tsx`
- [X] T039 [P] [US1] Frontend Auth Store 단위 테스트 (로그인/로그아웃 상태 전이, 토큰 관리) — `frontend/__tests__/unit/store/authStore.test.ts`
- [X] T040 [P] [US1] Frontend 토큰 매니저 단위 테스트 (저장, 자동 갱신, 만료 처리) — `frontend/__tests__/unit/services/api/tokenManager.test.ts`
- [X] T041 [P] [US1] Frontend Auth API 서비스 단위 테스트 — `frontend/__tests__/unit/services/api/authApi.test.ts`
- [X] T042 [P] [US1] Frontend User API 서비스 단위 테스트 — `frontend/__tests__/unit/services/api/userApi.test.ts`

### Implementation for User Story 1

- [X] T043 [P] [US1] UserAuth Entity 구현 — `backend/src/auth/domain/user-auth.entity.ts`
- [X] T044 [P] [US1] UserAuthOauth Entity 구현 — `backend/src/auth/domain/user-auth-oauth.entity.ts`
- [X] T045 [P] [US1] UserSession Entity 구현 — `backend/src/auth/domain/user-session.entity.ts`
- [X] T046 [P] [US1] User Entity 구현 — `backend/src/user/domain/user.entity.ts`
- [X] T047 [P] [US1] UserDevice Entity 구현 — `backend/src/notification/domain/user-device.entity.ts`
- [X] T048 [P] [US1] Auth DTO 정의 (OAuth 요청/응답, 토큰 갱신, 로그아웃) — `backend/src/auth/application/dto/`
- [X] T049 [P] [US1] User DTO 정의 (프로필 응답, 설정 변경 요청) — `backend/src/user/application/dto/`
- [X] T050 [US1] Auth Repository 구현 (UserAuth, UserAuthOauth, UserSession CRUD) — `backend/src/auth/infrastructure/auth.repository.ts`
- [X] T051 [P] [US1] User Repository 구현 — `backend/src/user/infrastructure/user.repository.ts`
- [X] T052 [P] [US1] UserDevice Repository 구현 — `backend/src/notification/infrastructure/user-device.repository.ts`
- [X] T053 [US1] JWT Strategy + Auth Guard 구현 — `backend/src/auth/infrastructure/jwt.strategy.ts`, `backend/src/auth/infrastructure/jwt-auth.guard.ts`
- [X] T054 [US1] OAuth Strategy 구현 (Google) — `backend/src/auth/infrastructure/strategies/google.strategy.ts`
- [X] T055 [P] [US1] OAuth Strategy 구현 (Naver) — `backend/src/auth/infrastructure/strategies/naver.strategy.ts`
- [X] T056 [P] [US1] OAuth Strategy 구현 (Kakao) — `backend/src/auth/infrastructure/strategies/kakao.strategy.ts`
- [X] T057 [P] [US1] OAuth Strategy 구현 (Apple) — `backend/src/auth/infrastructure/strategies/apple.strategy.ts`
- [X] T058 [US1] OAuth 로그인 Usecase 구현 — `backend/src/auth/application/oauth-login.usecase.ts`
- [X] T059 [US1] OAuth 콜백 Usecase 구현 (토큰 발급, 신규 유저 생성, FCM 디바이스 등록) — `backend/src/auth/application/oauth-callback.usecase.ts`
- [X] T060 [US1] 토큰 갱신 Usecase 구현 — `backend/src/auth/application/token-refresh.usecase.ts`
- [X] T061 [US1] 로그아웃 Usecase 구현 (세션 무효화, FCM 토큰 삭제) — `backend/src/auth/application/logout.usecase.ts`
- [X] T062 [US1] 프로필 조회 Usecase 구현 — `backend/src/user/application/get-profile.usecase.ts`
- [X] T063 [US1] 설정 변경 Usecase 구현 (온보딩 포함) — `backend/src/user/application/update-settings.usecase.ts`
- [X] T064 [US1] Auth Controller 구현 (GET /auth/oauth/:provider, callback, POST token/refresh, logout) — `backend/src/auth/auth.controller.ts`
- [X] T065 [US1] User Controller 구현 (GET /users/me, PATCH /users/me/settings) — `backend/src/user/user.controller.ts`
- [X] T066 [US1] Auth Module 구성 — `backend/src/auth/auth.module.ts`
- [X] T067 [US1] User Module 구성 — `backend/src/user/user.module.ts`
- [X] T068 [P] [US1] Frontend Auth API 서비스 구현 — `frontend/src/services/api/authApi.ts`
- [X] T069 [P] [US1] Frontend User API 서비스 구현 — `frontend/src/services/api/userApi.ts`
- [X] T070 [US1] Frontend OAuth 인증 흐름 구현 (in-app browser, 딥링크 콜백) — `frontend/src/features/auth/useAuth.ts`
- [X] T071 [US1] Frontend 토큰 관리 (저장, 자동 갱신, Axios 인터셉터) — `frontend/src/services/api/tokenManager.ts`
- [X] T072 [US1] Frontend Auth Store 구현 (Zustand, authStore.ts 확장) — `frontend/src/store/authStore.ts`
- [X] T073 [US1] Frontend 로그인 화면 구현 (소셜 로그인 버튼 4종, 접근성 라벨 포함) — `frontend/src/screens/auth/LoginScreen.tsx`
- [X] T074 [US1] Frontend 온보딩 화면 구현 (계획/회고 시간 설정, 기본값 08:00/22:00) — `frontend/src/screens/onboarding/OnboardingScreen.tsx`
- [X] T075 [US1] Frontend 인증 상태 기반 네비게이션 분기 (로그인/온보딩/메인) — `frontend/src/app/navigation/AuthNavigator.tsx`
- [X] T076 [US1] Frontend 로그인/온보딩 화면 loading/error 상태 처리 — `frontend/src/screens/auth/LoginScreen.tsx`, `frontend/src/screens/onboarding/OnboardingScreen.tsx`

### Maestro E2E Tests for User Story 1 ⚠️

> **NOTE: 헌법 X조 — Phase 완료 시 Maestro E2E 테스트 작성 필수 (TDD)**

- [X] T203 [P] [US1] Maestro E2E: OAuth 소셜 로그인 흐름 (로그인 버튼 탭 → 인증 → 앱 복귀) — `.maestro/auth/login.yml`
- [X] T204 [P] [US1] Maestro E2E: 신규 사용자 온보딩 흐름 (계획/회고 시간 설정 → 메인 화면 진입) — `.maestro/auth/onboarding.yml`

**Checkpoint**: OAuth 로그인 → 온보딩 → 메인 화면 진입 흐름 완료. E2E 검증 포함. 독립적으로 테스트 가능.

---

## Phase 4: User Story 2 — 할 일 CRUD 및 일상 관리 (Priority: P1) 🎯 MVP

**Goal**: 메인 화면에서 할 일 추가, 조회, 수정, 완료, 비활성화, 삭제를 수행한다. 시간대별 Plan/Review 모드 자동/수동 전환.

**Independent Test**: 할 일 추가 → 조회 → 수정 → 완료 → 비활성화 → 삭제 전체 CRUD 흐름 검증

### Backend Tests for User Story 2 ⚠️

> **NOTE: 테스트를 먼저 작성하고 FAIL 확인 후 구현한다**

- [X] T077 [P] [US2] Todo Entity 단위 테스트 (상태 전이 규칙: ACTIVE→COMPLETED, ACTIVE→INACTIVE, INACTIVE→ACTIVE, COMPLETED→ACTIVE) — `backend/test/unit/todo/domain/todo.entity.spec.ts`
- [X] T078 [P] [US2] Todo 생성 usecase 단위 테스트 — `backend/test/unit/todo/application/create-todo.usecase.spec.ts`
- [X] T078A [P] [US2] Todo 생성 usecase 보강 — 오늘 날짜 기본값 검증 (jest.useFakeTimers로 시간 고정, todoDate 미전달 시 YYYY-MM-DD 정확 일치 assert) — `backend/test/unit/todo/application/create-todo.usecase.spec.ts`
- [X] T079 [P] [US2] Todo 목록 조회 usecase 단위 테스트 — `backend/test/unit/todo/application/get-todos.usecase.spec.ts`
- [X] T079A [P] [US2] Todo 목록 조회 usecase 보강 — 정렬 순서 고정, CARRIED_OVER 항목 통계 포함/제외 정책 검증 — `backend/test/unit/todo/application/get-todos.usecase.spec.ts`
- [X] T080 [P] [US2] Todo 수정 usecase 단위 테스트 — `backend/test/unit/todo/application/update-todo.usecase.spec.ts`
- [X] T081 [P] [US2] Todo 상태 변경 usecase 단위 테스트 (상태 전이 규칙 포함) — `backend/test/unit/todo/application/change-todo-status.usecase.spec.ts`
- [X] T081A [P] [US2] Todo 상태 변경 usecase 보강 — 유효 전이 시 changeStatus/repository.update 호출·인자 검증, 거부 전이 시 update 미호출 검증 — `backend/test/unit/todo/application/change-todo-status.usecase.spec.ts`
- [X] T082 [P] [US2] Todo 삭제 usecase 단위 테스트 — `backend/test/unit/todo/application/delete-todo.usecase.spec.ts`
- [X] T082A [P] [US2] Todo 삭제 usecase 보강 — 이미 soft-deleted 항목 재삭제 처리, softDelete 실패 시 예외 전파 — `backend/test/unit/todo/application/delete-todo.usecase.spec.ts`
- [X] T083 [P] [US2] Todo Controller 통합 테스트 — `backend/test/integration/todo/todo.controller.spec.ts`
- [X] T083A [P] [US2] Todo Controller 통합 테스트 보강 — 만료 JWT 401, 잘못된 JWT 형식 401, 잘못된 날짜 포맷 400, DTO validation (빈 status, content 누락) 400 — `backend/test/integration/todo/todo.controller.spec.ts`

### Frontend Tests for User Story 2 ⚠️

> **NOTE: 테스트를 먼저 작성하고 FAIL 확인 후 구현한다**

- [X] T084 [P] [US2] Frontend 메인 화면 단위 테스트 (Plan/Review 모드 렌더링, 모드 전환, 진행률 표시) — `frontend/__tests__/unit/screens/main/MainScreen.test.tsx`
- [X] T085 [P] [US2] Frontend Todo Store 단위 테스트 (CRUD 액션, 상태 전이, 옵티미스틱 업데이트) — `frontend/__tests__/unit/store/todoStore.test.ts`
- [X] T085A [P] [US2] Frontend Todo Store 보강 — 옵티미스틱 업데이트 이름 정정, selectedDate 변경 시 todos/isLoading 초기화, 중복 addTodo 방지 — `frontend/__tests__/unit/store/todoStore.test.ts`
- [X] T085B [P] [US2] Frontend Todo Store 리뷰 수정 — 날짜 변경 시 상태 리셋 테스트 방향 수정 (todos/isLoading/error 리셋 검증), 동일 id 중복 방지 테스트 수정 — `frontend/__tests__/unit/store/todoStore.test.ts`
- [X] T086 [P] [US2] Frontend TodoItem 컴포넌트 단위 테스트 (체크박스, 탭 수정, 더블탭 비활성화) — `frontend/__tests__/unit/components/todo/TodoItem.test.tsx`
- [X] T086A [P] [US2] Frontend TodoItem 보강 — 편집 취소 (blur/escape), 빈 문자열 수정 차단, 동일 텍스트 제출 시 콜백 미호출 — `frontend/__tests__/unit/components/todo/TodoItem.test.tsx`
- [X] T087 [P] [US2] Frontend AddTodoInput 컴포넌트 단위 테스트 ("+" 버튼, 입력 필드, 255자 제한) — `frontend/__tests__/unit/components/todo/AddTodoInput.test.tsx`
- [X] T087A [P] [US2] Frontend AddTodoInput 보강 — 로딩 중 제출 무시, trim 후 값 전달, 연속 탭 중복 제출 방지 — `frontend/__tests__/unit/components/todo/AddTodoInput.test.tsx`
- [X] T088 [P] [US2] Frontend Todo API 서비스 단위 테스트 — `frontend/__tests__/unit/services/api/todoApi.test.ts`
- [X] T088A [P] [US2] Frontend Todo API 보강 — 400/401/404 상태별 ApiError 매핑, todoDate optional 전송, 응답 shape 필수 필드 누락 대응 — `frontend/__tests__/unit/services/api/todoApi.test.ts`
- [X] T088B [P] [US2] Frontend 공유 타입 리뷰 수정 — CreateTodoRequest.todoDate optional 변경, Todo 인터페이스에 isCarriedOver/memos 추가, 스텁 ad-hoc DTO 제거 — `frontend/src/types/todo.ts`, `frontend/src/screens/main/MainScreen.tsx`, `frontend/src/components/todo/TodoItem.tsx`

### Implementation for User Story 2

- [X] T089 [US2] Todo Entity 구현 (상태 전이 도메인 로직 포함) — `backend/src/todo/domain/todo.entity.ts`
- [X] T090 [US2] Todo DTO 정의 (생성/수정/상태변경/목록응답, todoDate optional 반영) — `backend/src/todo/application/dto/`
- [X] T091 [US2] Todo Repository 구현 — `backend/src/todo/infrastructure/todo.repository.ts`
- [X] T092 [US2] Todo 목록 조회 Usecase 구현 (날짜별 조회, 이월 포함, 모드 결정, createdAt 오름차순 정렬, CARRIED_OVER 통계 제외) — `backend/src/todo/application/get-todos.usecase.ts`
- [X] T093 [US2] Todo 생성 Usecase 구현 (todoDate 미전달 시 오늘 날짜 기본값) — `backend/src/todo/application/create-todo.usecase.ts`
- [X] T094 [US2] Todo 수정 Usecase 구현 — `backend/src/todo/application/update-todo.usecase.ts`
- [X] T095 [US2] Todo 상태 변경 Usecase 구현 (ACTIVE/INACTIVE/COMPLETED, 전이 규칙 검증, entity.changeStatus 호출, updatedBy 전달) — `backend/src/todo/application/change-todo-status.usecase.ts`
- [X] T096 [US2] Todo 삭제 Usecase 구현 (Soft Delete, 이미 삭제된 항목 재삭제 시 예외) — `backend/src/todo/application/delete-todo.usecase.ts`
- [X] T097 [US2] Todo Controller 구현 (GET /todos, POST /todos, PATCH /todos/:id, PATCH /todos/:id/status, DELETE /todos/:id, JWT 검증 cross-cutting, DTO validation: content 필수/255자, status enum, todoDate 포맷) — `backend/src/todo/todo.controller.ts`
- [X] T098 [US2] Todo Module 구성 — `backend/src/todo/todo.module.ts`
- [X] T099 [P] [US2] Frontend Todo API 서비스 구현 (apiClient 연동, TodoListResponse/DeleteTodoResponse 타입 export) — `frontend/src/services/api/todoApi.ts`
- [X] T100 [US2] Frontend Todo Store 구현 (setSelectedDate 시 todos/isLoading/error 리셋, addTodo 동일 id 중복 방지) — `frontend/src/store/todoStore.ts`
- [X] T101 [US2] Frontend 메인 화면 구현 (Plan/Review 모드, 할 일 목록, 진행률) — `frontend/src/screens/main/MainScreen.tsx`
- [X] T102 [US2] Frontend 할 일 아이템 컴포넌트 (체크박스 완료 토글, 탭→편집 모드, blur→취소/복원, 빈문자열·동일텍스트 차단, longPress 비활성화, INACTIVE 편집 불가, 접근성 라벨) — `frontend/src/components/todo/TodoItem.tsx`
- [X] T103 [US2] Frontend 할 일 추가 컴포넌트 ("+" 버튼, 입력 필드, maxLength 255, trim, 키보드 submitEditing, 로딩 시 비활성화, 연속 탭 방지, 접근성 라벨) — `frontend/src/components/todo/AddTodoInput.tsx`
- [X] T104 [US2] Frontend 길게 누르기 + 드래그 삭제 구현 (하단 휴지통 UI) — `frontend/src/components/todo/TodoDragDelete.tsx`
- [X] T105 [US2] Frontend 모드 전환 컴포넌트 (수동 토글) — `frontend/src/components/todo/ModeToggle.tsx`
- [X] T106 [US2] Frontend 메인 화면 loading/empty/error 상태 처리 (빈 목록 메시지, ActivityIndicator, 에러 재시도, 접근성) — `frontend/src/screens/main/MainScreen.tsx`

### Maestro E2E Tests for User Story 2 ⚠️

> **NOTE: 헌법 X조 — Phase 완료 시 Maestro E2E 테스트 작성 필수 (TDD)**

- [X] T205 [P] [US2] Maestro E2E: 할 일 추가 흐름 ("+" 탭 → 내용 입력 → 목록 표시) — `.maestro/todo/create.yml`
- [X] T206 [P] [US2] Maestro E2E: 할 일 수정 흐름 (항목 탭 → 내용 수정 → 자동 저장) — `.maestro/todo/update.yml`
- [X] T207 [P] [US2] Maestro E2E: 할 일 삭제 흐름 (길게 누르기 → 휴지통 드래그) — `.maestro/todo/delete.yml`

**Checkpoint**: 할 일 CRUD + 모드 전환 완전 동작. E2E 검증 포함. 독립적으로 테스트 가능.

---

## Phase 5: User Story 3 — 하루 회고 및 자동 이월 (Priority: P1)

**Goal**: Review 모드에서 진행률 확인, 일정 완료, 미완료 항목 자동 이월.

**Independent Test**: 회고 모드 → 진행률 확인 → 일정 완료 → 이월 확인 흐름 검증

### Backend Tests for User Story 3 ⚠️

> **NOTE: 테스트를 먼저 작성하고 FAIL 확인 후 구현한다**

- [X] T107 [P] [US3] CarriedOverHistory Entity 단위 테스트 — `backend/test/unit/todo/domain/carried-over-history.entity.spec.ts`
- [X] T108 [P] [US3] 일정 완료 usecase 단위 테스트 (이월 로직 포함: ACTIVE→CARRIED_OVER, 새 Todo ACTIVE 생성, 연속 이월 시나리오) — `backend/test/unit/todo/application/complete-day.usecase.spec.ts`
- [X] T109 [P] [US3] 자동 이월 스케줄러 단위 테스트 (타임존별 자정, 중복 이월 방지, 사용자 타임존 변경 시 자정 기준 재계산) — `backend/test/unit/scheduler/application/carryover-scheduler.usecase.spec.ts`
- [X] T110 [P] [US3] Complete/Report Controller 통합 테스트 — `backend/test/integration/todo/todo-complete.controller.spec.ts`

### Frontend Tests for User Story 3 ⚠️

> **NOTE: 테스트를 먼저 작성하고 FAIL 확인 후 구현한다**

- [X] T111 [P] [US3] Frontend ReviewModeView 단위 테스트 (진행률 표시, 완료/미완료 분리, 상태 변경 시 재계산) — `frontend/__tests__/unit/screens/main/ReviewModeView.test.tsx`
- [X] T112 [P] [US3] Frontend CompleteDayButton 단위 테스트 (일정 완료 API 호출, 이월 결과 표시, 중복 완료 방지) — `frontend/__tests__/unit/components/todo/CompleteDayButton.test.tsx`
- [X] T113 [P] [US3] Frontend 이월 항목 뱃지 테스트 (isCarriedOver 표시) — `frontend/__tests__/unit/components/todo/TodoItem.carriedOver.test.tsx`
- [X] T114 [P] [US3] Frontend useAppFocusRefresh 훅 단위 테스트 (앱 포커스 복귀 시 데이터 새로고침, 포그라운드 자정 경과 시 자동 갱신) — `frontend/__tests__/unit/features/todo/useAppFocusRefresh.test.ts`

### Implementation for User Story 3

- [X] T115 [US3] CarriedOverHistory Entity 구현 — `backend/src/todo/domain/carried-over-history.entity.ts`
- [X] T116 [US3] CarriedOverHistory Repository 구현 — `backend/src/todo/infrastructure/carried-over-history.repository.ts`
- [X] T117 [US3] 일정 완료 Usecase 구현 (미완료 → CARRIED_OVER, 새 Todo ACTIVE 생성, 이력 기록) — `backend/src/todo/application/complete-day.usecase.ts`
- [X] T118 [US3] 일정 완료 DTO 정의 — `backend/src/todo/application/dto/complete-day.dto.ts`
- [X] T119 [US3] Todo Controller에 POST /todos/complete 엔드포인트 추가 — `backend/src/todo/todo.controller.ts`
- [X] T120 [US3] 자동 이월 스케줄러 구현 (사용자별 타임존 자정 기준) — `backend/src/scheduler/application/carryover-scheduler.usecase.ts`
- [X] T121 [US3] Scheduler Module 구성 — `backend/src/scheduler/scheduler.module.ts`
- [X] T122 [US3] Frontend 회고 모드 UI 구현 (진행률 표시, 완료/미완료 분리, 최종 체크) — `frontend/src/screens/main/ReviewModeView.tsx`
- [X] T123 [US3] Frontend "오늘의 일정 완료" 버튼 및 이월 결과 표시 — `frontend/src/components/todo/CompleteDayButton.tsx`
- [X] T124 [US3] Frontend 이월 항목 표시 (isCarriedOver 뱃지) — `frontend/src/components/todo/TodoItem.tsx`
- [X] T125 [US3] Frontend 앱 포커스 복귀 시 데이터 새로고침 (자정 이월 반영) — `frontend/src/features/todo/useAppFocusRefresh.ts`

### Maestro E2E Tests for User Story 3 ⚠️

> **NOTE: 헌법 X조 — Phase 완료 시 Maestro E2E 테스트 작성 필수 (TDD)**

- [X] T208 [US3] Maestro E2E: 하루 회고 및 이월 흐름 (Review 모드 → 진행률 확인 → 일정 완료 → 이월 확인) — `.maestro/review/daily_review.yml`

**Checkpoint**: 회고 → 일정 완료 → 자동 이월 동작 완료. E2E 검증 포함. 독립적으로 테스트 가능.

---

## Phase 6: User Story 4 — 푸시 알림 (Priority: P2)

**Goal**: 설정된 계획/회고 시간에 맞춰 푸시 알림 발송.

**Independent Test**: 계획/회고 시간 설정 → 해당 시간에 알림 수신 검증

### Backend Tests for User Story 4 ⚠️

> **NOTE: 테스트를 먼저 작성하고 FAIL 확인 후 구현한다**

- [X] T126 [P] [US4] NotificationLog Entity 단위 테스트 — `backend/test/unit/notification/domain/notification-log.entity.spec.ts`
- [X] T127 [P] [US4] 알림 발송 usecase 단위 테스트 (FCM 호출, 로그 기록, 실패 재시도) — `backend/test/unit/notification/application/send-notification.usecase.spec.ts`
- [X] T128 [P] [US4] 알림 스케줄러 단위 테스트 (타임존별 발송, NULL 시간 미발송, 타임존 변경 시 알림 시점 재계산) — `backend/test/unit/scheduler/application/notification-scheduler.usecase.spec.ts`
- [X] T129 [P] [US4] FCM 서비스 단위 테스트 (firebase-admin SDK 호출) — `backend/test/unit/notification/infrastructure/fcm.service.spec.ts`

### Frontend Tests for User Story 4 ⚠️

> **NOTE: 테스트를 먼저 작성하고 FAIL 확인 후 구현한다**

- [X] T130 [P] [US4] Frontend 설정 화면 단위 테스트 (계획/회고 시간 변경, NULL 시 알림 해제, 타임존 선택) — `frontend/__tests__/unit/screens/settings/SettingsScreen.test.tsx`
- [X] T131 [P] [US4] Frontend usePushNotification 훅 단위 테스트 (FCM 토큰 등록, 알림 권한 요청) — `frontend/__tests__/unit/features/notification/usePushNotification.test.ts`

### Implementation for User Story 4

- [X] T132 [US4] NotificationLog Entity 구현 — `backend/src/notification/domain/notification-log.entity.ts`
- [X] T133 [US4] NotificationLog Repository 구현 — `backend/src/notification/infrastructure/notification-log.repository.ts`
- [X] T134 [US4] FCM 서비스 구현 (firebase-admin SDK) — `backend/src/notification/infrastructure/fcm.service.ts`
- [X] T135 [US4] 알림 발송 Usecase 구현 (PLAN/REVIEW 타입, 디바이스 조회, FCM 발송, 로그 기록) — `backend/src/notification/application/send-notification.usecase.ts`
- [X] T136 [US4] 알림 스케줄러 구현 (사용자별 planTime/reviewTime 기준, NULL 시 미발송) — `backend/src/scheduler/application/notification-scheduler.usecase.ts`
- [X] T137 [US4] Notification Module 구성 — `backend/src/notification/notification.module.ts`
- [X] T138 [US4] Frontend 푸시 알림 수신 설정 (FCM 토큰 등록, 알림 탭 시 앱 진입) — `frontend/src/features/notification/usePushNotification.ts`
- [X] T139 [US4] Frontend 설정 화면 구현 (계획/회고 시간 변경, 타임존 변경, 알림 해제) — `frontend/src/screens/settings/SettingsScreen.tsx`
- [X] T140 [US4] Frontend 설정 화면 loading/error 상태 처리 — `frontend/src/screens/settings/SettingsScreen.tsx`

### Maestro E2E Tests for User Story 4 ⚠️

> **NOTE: 헌법 X조 — Phase 완료 시 Maestro E2E 테스트 작성 필수 (TDD)**

- [X] T209 [US4] Maestro E2E: 푸시 알림 설정 흐름 (설정 화면 → 시간 변경 → 저장 확인) — `.maestro/notification/push_notification.yml`

**Checkpoint**: 푸시 알림 발송 및 수신 동작 완료. E2E 검증 포함. 독립적으로 테스트 가능.

---

## Phase 7: User Story 5 — 메모 첨부 (Priority: P2)

**Goal**: 개별 할 일에 메모 추가, 수정, 삭제.

**Independent Test**: 메모 추가 → 수정 → 삭제 흐름 검증

### Backend Tests for User Story 5 ⚠️

> **NOTE: 테스트를 먼저 작성하고 FAIL 확인 후 구현한다**

- [X] T141 [P] [US5] TodoMemo Entity 단위 테스트 — `backend/test/unit/memo/domain/todo-memo.entity.spec.ts`
- [X] T142 [P] [US5] 메모 생성 usecase 단위 테스트 — `backend/test/unit/memo/application/create-memo.usecase.spec.ts`
- [X] T143 [P] [US5] 메모 수정 usecase 단위 테스트 — `backend/test/unit/memo/application/update-memo.usecase.spec.ts`
- [X] T144 [P] [US5] 메모 삭제 usecase 단위 테스트 — `backend/test/unit/memo/application/delete-memo.usecase.spec.ts`
- [X] T145 [P] [US5] Memo Controller 통합 테스트 — `backend/test/integration/memo/memo.controller.spec.ts`

### Frontend Tests for User Story 5 ⚠️

> **NOTE: 테스트를 먼저 작성하고 FAIL 확인 후 구현한다**

- [X] T146 [P] [US5] Frontend MemoSection 컴포넌트 단위 테스트 (메모 입력/표시/수정/삭제 UI) — `frontend/__tests__/unit/components/todo/MemoSection.test.tsx`
- [X] T147 [P] [US5] Frontend Memo API 서비스 단위 테스트 — `frontend/__tests__/unit/services/api/memoApi.test.ts`

### Implementation for User Story 5

- [X] T148 [US5] TodoMemo Entity 구현 — `backend/src/memo/domain/todo-memo.entity.ts`
- [X] T149 [US5] Memo DTO 정의 (생성/수정/응답) — `backend/src/memo/application/dto/`
- [X] T150 [US5] Memo Repository 구현 — `backend/src/memo/infrastructure/memo.repository.ts`
- [X] T151 [US5] 메모 추가 Usecase 구현 — `backend/src/memo/application/create-memo.usecase.ts`
- [X] T152 [US5] 메모 수정 Usecase 구현 — `backend/src/memo/application/update-memo.usecase.ts`
- [X] T153 [US5] 메모 삭제 Usecase 구현 (Soft Delete) — `backend/src/memo/application/delete-memo.usecase.ts`
- [X] T154 [US5] Memo Controller 구현 (POST /todos/:id/memos, PATCH /todos/:id/memos/:memoId, DELETE /todos/:id/memos/:memoId) — `backend/src/memo/memo.controller.ts`
- [X] T155 [US5] Memo Module 구성 — `backend/src/memo/memo.module.ts`
- [X] T156 [P] [US5] Frontend Memo API 서비스 구현 — `frontend/src/services/api/memoApi.ts`
- [X] T157 [US5] Frontend 메모 UI 컴포넌트 (입력/표시/수정/삭제) — `frontend/src/components/todo/MemoSection.tsx`
- [X] T158 [US5] Frontend TodoItem에 메모 섹션 통합 — `frontend/src/components/todo/TodoItem.tsx`

### Maestro E2E Tests for User Story 5 ⚠️

> **NOTE: 헌법 X조 — Phase 완료 시 Maestro E2E 테스트 작성 필수 (TDD)**

- [X] T210 [US5] Maestro E2E: 메모 CRUD 흐름 (메모 추가 → 수정 → 삭제) — `.maestro/memo/memo_crud.yml`

**Checkpoint**: 메모 CRUD 동작 완료. E2E 검증 포함. 독립적으로 테스트 가능.

---

## Phase 8: User Story 6 — 음성 인식 할 일 추가 (Priority: P3)

**Goal**: 마이크 버튼으로 음성 입력 → STT + LLM → 할 일 텍스트 변환 후 목록 추가.

**Independent Test**: 마이크 탭 → 음성 녹음 → 변환 → 목록 추가 흐름 검증

### Backend Tests for User Story 6 ⚠️

> **NOTE: 테스트를 먼저 작성하고 FAIL 확인 후 구현한다**

- [ ] T159 [P] [US6] STT 서비스 단위 테스트 (외부 API 호출, 오디오 포맷 검증, 실패 처리) — `backend/test/unit/ai/infrastructure/stt.service.spec.ts`
- [ ] T160 [P] [US6] LLM 서비스 단위 테스트 (프롬프트 전달, 텍스트 다듬기, 실패 처리) — `backend/test/unit/ai/infrastructure/llm.service.spec.ts`
- [ ] T161 [P] [US6] 음성 할 일 생성 usecase 단위 테스트 (오디오→STT→LLM→Todo 파이프라인) — `backend/test/unit/todo/application/create-voice-todo.usecase.spec.ts`
- [ ] T162 [P] [US6] Voice Todo Controller 통합 테스트 — `backend/test/integration/todo/todo-voice.controller.spec.ts`

### Frontend Tests for User Story 6 ⚠️

> **NOTE: 테스트를 먼저 작성하고 FAIL 확인 후 구현한다**

- [ ] T163 [P] [US6] Frontend useVoiceRecording 훅 단위 테스트 (녹음 시작/중지, 오디오 데이터 반환) — `frontend/__tests__/unit/features/todo/useVoiceRecording.test.ts`
- [ ] T164 [P] [US6] Frontend VoiceTodoButton 단위 테스트 (녹음 UI 상태, 로딩, STT/LLM 실패 안내) — `frontend/__tests__/unit/components/todo/VoiceTodoButton.test.tsx`

### Implementation for User Story 6

- [ ] T165 [US6] STT 서비스 구현 (외부 STT API 클라이언트) — `backend/src/ai/infrastructure/stt.service.ts`
- [ ] T166 [US6] LLM 서비스 구현 (외부 LLM API 클라이언트, 프롬프트 관리) — `backend/src/ai/infrastructure/llm.service.ts`
- [ ] T167 [US6] 음성 할 일 생성 Usecase 구현 (오디오 → STT → LLM 다듬기 → Todo 생성) — `backend/src/todo/application/create-voice-todo.usecase.ts`
- [ ] T168 [US6] Voice Todo DTO 정의 (multipart/form-data 요청, rawText 포함 응답) — `backend/src/todo/application/dto/voice-todo.dto.ts`
- [ ] T169 [US6] Todo Controller에 POST /todos/voice 엔드포인트 추가 — `backend/src/todo/todo.controller.ts`
- [ ] T170 [US6] AI Module 구성 — `backend/src/ai/ai.module.ts`
- [ ] T171 [US6] Frontend 음성 녹음 기능 구현 (expo-av) — `frontend/src/features/todo/useVoiceRecording.ts`
- [ ] T172 [US6] Frontend 마이크 버튼 컴포넌트 (녹음 UI, 로딩 상태) — `frontend/src/components/todo/VoiceTodoButton.tsx`
- [ ] T173 [US6] Frontend 음성 인식 error 상태 처리 (STT/LLM 실패 안내, 오디오 포맷 에러) — `frontend/src/components/todo/VoiceTodoButton.tsx`

**Checkpoint**: 음성 인식 할 일 추가 동작 완료. 독립적으로 테스트 가능.

---

## Phase 9: User Story 7 — 캘린더 조회 (Priority: P3)

**Goal**: 캘린더 페이지에서 날짜별 할 일 조회, 월별 요약 확인.

**Independent Test**: 캘린더 진입 → 월별 요약 → 특정 날짜 선택 → 할 일 목록 표시 검증

### Backend Tests for User Story 7 ⚠️

> **NOTE: 테스트를 먼저 작성하고 FAIL 확인 후 구현한다**

- [X] T174 [P] [US7] 월별 요약 usecase 단위 테스트 (날짜별 완료/전체 건수 집계) — `backend/test/unit/todo/application/get-monthly-summary.usecase.spec.ts`
- [X] T175 [P] [US7] Report Controller 통합 테스트 — `backend/test/integration/todo/todo-report.controller.spec.ts`

### Frontend Tests for User Story 7 ⚠️

> **NOTE: 테스트를 먼저 작성하고 FAIL 확인 후 구현한다**

- [X] T176 [P] [US7] Frontend CalendarScreen 단위 테스트 (월별 뷰 렌더링, 날짜별 요약 표시, 빈 월 처리) — `frontend/__tests__/unit/screens/calendar/CalendarScreen.test.tsx`
- [X] T177 [P] [US7] Frontend DayDetailView 단위 테스트 (날짜 선택 시 할 일 목록 표시) — `frontend/__tests__/unit/screens/calendar/DayDetailView.test.tsx`
- [X] T178 [P] [US7] Frontend Report API 서비스 단위 테스트 — `frontend/__tests__/unit/services/api/reportApi.test.ts`

### Implementation for User Story 7

- [X] T179 [US7] 월별 요약 Usecase 구현 — `backend/src/todo/application/get-monthly-summary.usecase.ts`
- [X] T180 [US7] Report DTO 정의 — `backend/src/todo/application/dto/monthly-summary.dto.ts`
- [X] T181 [US7] Todo Controller에 GET /todos/report/summary 엔드포인트 추가 — `backend/src/todo/todo.controller.ts`
- [X] T182 [P] [US7] Frontend Report API 서비스 구현 — `frontend/src/services/api/reportApi.ts`
- [X] T183 [US7] Frontend 캘린더 화면 구현 (월별 뷰, 날짜별 요약 표시) — `frontend/src/screens/calendar/CalendarScreen.tsx`
- [X] T184 [US7] Frontend 날짜 선택 시 할 일 목록 표시 — `frontend/src/screens/calendar/DayDetailView.tsx`
- [X] T185 [US7] Frontend 캘린더 화면 loading/empty/error 상태 처리 — `frontend/src/screens/calendar/CalendarScreen.tsx`
- [X] T186 [US7] Frontend Bottom Tab에 캘린더 탭 추가 — `frontend/src/app/navigation/MainTabNavigator.tsx`

**Checkpoint**: 캘린더 조회 동작 완료. 독립적으로 테스트 가능.

---

## Phase 10: User Story 8 — TodoList 공유 (Priority: P4)

**Goal**: 할 일 목록을 SNS/메신저로 공유. "나에게 전송" 최상단 배치.

**Independent Test**: 날짜 선택 → 공유 버튼 → 공유 채널 선택 흐름 검증

### Frontend Tests for User Story 8 ⚠️

> **NOTE: 테스트를 먼저 작성하고 FAIL 확인 후 구현한다**

- [X] T187 [P] [US8] Frontend useShareTodo 훅 단위 테스트 (공유 데이터 생성, OS 공유 시트 호출) — `frontend/__tests__/unit/features/share/useShareTodo.test.ts`
- [X] T188 [P] [US8] Frontend ShareButton 컴포넌트 단위 테스트 ("나에게 전송" UI, 공유 버튼) — `frontend/__tests__/unit/components/todo/ShareButton.test.tsx`
- [X] T189 [P] [US8] Frontend formatShareData 단위 테스트 (할 일 목록 → 텍스트 포맷 변환) — `frontend/__tests__/unit/features/share/formatShareData.test.ts`

### Implementation for User Story 8

- [X] T190 [US8] Frontend 공유 기능 구현 (OS 기본 공유 시트, expo-sharing) — `frontend/src/features/share/useShareTodo.ts`
- [X] T191 [US8] Frontend 공유 버튼 컴포넌트 ("나에게 전송" 최상단) — `frontend/src/components/todo/ShareButton.tsx`
- [X] T192 [US8] Frontend 공유 데이터 포맷팅 (할 일 목록 → 텍스트/이미지) — `frontend/src/features/share/formatShareData.ts`

**Checkpoint**: 공유 기능 동작 완료. 독립적으로 테스트 가능.

---

## Phase 11: P3-P4 외부 API 연동 및 E2E 테스트

**Purpose**: P3-P4(US6~US8) 기능의 외부 API key 등록 및 Maestro E2E 테스트 (헌법 X조)

**Prerequisites**: Phase 8~10 (US6~US8) 구현 완료

### 외부 API Key 등록

- [ ] T211 STT 외부 API key 등록 및 연결 검증 — `backend/.env`, `backend/src/ai/infrastructure/stt.service.ts`
- [ ] T212 [P] LLM 외부 API key 등록 및 연결 검증 — `backend/.env`, `backend/src/ai/infrastructure/llm.service.ts`

### Maestro E2E Tests for P3-P4 ⚠️

> **NOTE: 헌법 X조 — P3-P4 기능은 이 Phase에서 E2E 테스트 작성 (TDD)**

- [ ] T213 [US6] Maestro E2E: 음성 인식 할 일 추가 흐름 (마이크 탭 → 녹음 → STT/LLM 변환 → 목록 추가) — `.maestro/voice/voice_todo.yml`
- [ ] T214 [US7] Maestro E2E: 캘린더 조회 흐름 (캘린더 진입 → 월별 요약 → 날짜 선택 → 할 일 목록) — `.maestro/calendar/calendar_view.yml`
- [X] T215 [US8] Maestro E2E: TodoList 공유 흐름 (날짜 선택 → 공유 버튼 → 채널 선택) — `.maestro/share/share_todo.yml`

**Checkpoint**: P3-P4 외부 API 연동 완료 및 E2E 검증 통과.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: 전체 품질 개선 및 배포 준비

- [ ] T193 [P] Backend Health Check 엔드포인트 구현 (GET /health, DB 연결 확인) — `backend/src/app.controller.ts`
- [ ] T194 [P] Backend Dockerfile 작성 (AWS Lambda Container Image) — `backend/Dockerfile`
- [ ] T195 [P] Backend Lambda 핸들러 래핑 (@codegenie/serverless-express) — `backend/src/lambda.ts`
- [ ] T196 [P] GitHub Actions CI 파이프라인 (Backend lint + test) — `.github/workflows/backend-ci.yml`
- [ ] T197 [P] GitHub Actions CI 파이프라인 (Frontend lint + test) — `.github/workflows/frontend-ci.yml`
- [ ] T198 Backend E2E 테스트 (온보딩 → 할 일 CRUD → 회고 → 이월 전체 흐름) — `backend/test/e2e/full-flow.e2e-spec.ts`
- [ ] T199 Maestro E2E 전체 흐름 통합 테스트 (로그인 → 온보딩 → 할 일 추가 → 회고 → 이월, iOS 15+/Android 12+ 대상) — `.maestro/full_flow.yml`
- [ ] T200 TypeScript 타입 오류 전체 점검 (`npx tsc --noEmit` backend + frontend)
- [ ] T201 ESLint 전체 점검 및 수정
- [ ] T202 quickstart.md 기반 전체 설정 검증

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 의존성 없음 — 즉시 시작
- **Phase 2 (Foundational)**: Phase 1 완료 후 시작 — **모든 사용자 스토리 차단**
- **Phase 3 (US1 인증/온보딩)**: Phase 2 완료 후 시작 — 다른 스토리의 인증 의존. Maestro E2E 포함.
- **Phase 4 (US2 할 일 CRUD)**: Phase 3 완료 후 시작 (인증 필요). Maestro E2E 포함.
- **Phase 5 (US3 회고/이월)**: Phase 4 완료 후 시작 (Todo CRUD 필요). Maestro E2E 포함.
- **Phase 6 (US4 알림)**: Phase 3 완료 후 시작 (인증/사용자 필요, US2와 병렬 가능). Maestro E2E 포함.
- **Phase 7 (US5 메모)**: Phase 4 완료 후 시작 (Todo 필요). Maestro E2E 포함.
- **Phase 8 (US6 음성)**: Phase 4 완료 후 시작 (Todo CRUD 필요)
- **Phase 9 (US7 캘린더)**: Phase 4 완료 후 시작 (Todo 데이터 필요)
- **Phase 10 (US8 공유)**: Phase 4 완료 후 시작 (Todo 데이터 필요)
- **Phase 11 (P3-P4 E2E)**: Phase 8~10 완료 후 시작. 외부 API key 등록 + Maestro E2E (US6~US8)
- **Phase 12 (Polish)**: 원하는 스토리 + Phase 11 완료 후 시작

### Within Each User Story

- 테스트를 먼저 작성하고 FAIL 확인 (Red)
- Entity → DTO → Repository → Usecase → Controller (Backend)
- API 서비스 → Store → Screen/Component (Frontend)
- loading/empty/error 상태 처리 필수

### Parallel Opportunities

- Phase 1: T003-T009 [P] 병렬 가능
- Phase 2: T010-T013 [P] 테스트 병렬, T015-T022 [P] 구현 병렬
- Phase 3-10: 각 Phase 내 [P] 표시된 테스트/구현 태스크 병렬 가능
- Phase 3-7: 각 Phase 마지막에 Maestro E2E 테스트 병렬 작성 가능
- Phase 6 (US4)과 Phase 4 (US2)는 Phase 3 완료 후 동시 시작 가능
- Phase 11: T211-T212 API key 등록 병렬, T213-T215 E2E 테스트 병렬

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Phase 1: Setup 완료
2. Phase 2: Foundational 완료 (CRITICAL — 모든 스토리 차단)
3. Phase 3: US1 (인증/온보딩) 완료 → **독립 테스트**
4. Phase 4: US2 (할 일 CRUD) 완료 → **독립 테스트 → MVP 배포 가능**

### Incremental Delivery

1. Setup + Foundational → 기반 완료
2. US1 (인증) → 테스트 → 배포
3. US2 (CRUD) → 테스트 → 배포 (MVP!)
4. US3 (회고/이월) → 테스트 → 배포 (루틴 완성)
5. US4~5 → 각 스토리별 Maestro E2E 포함 배포
6. US6~8 → 구현 후 Phase 11에서 API key 등록 + E2E 일괄 검증
7. Phase 12 → 전체 품질 점검 및 배포 준비
