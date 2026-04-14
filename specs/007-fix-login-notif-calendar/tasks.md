---
description: "Task list for 007 로그인 라우팅 · 알림 · 캘린더 동기화 결함 수정"
---

# Tasks: 로그인 라우팅 · 알림 · 캘린더 동기화 결함 수정

**Input**: Design documents from `/specs/007-fix-login-notif-calendar/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 필수 포함 — 헌법 III(TDD 우선 원칙 NON-NEGOTIABLE)과 X(Maestro E2E)에 따라 모든 변경에 대해 실패 테스트를 먼저 작성한 뒤 구현한다.

**Organization**: 태스크는 spec.md 의 User Story (P1=Group A, P2=Group B, P3=Group C) 별로 그룹화되어 있으며, 각 스토리는 독립 구현·독립 검증이 가능하다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일이며 선행 태스크 의존성이 없어 병렬 실행 가능
- **[Story]**: US1=Group A(온보딩), US2=Group B(FCM/iOS 방어), US3=Group C(캘린더)
- 파일 경로는 리포 루트 기준 상대 경로

## Path Conventions

- Backend: `backend/src/...`, 테스트는 `backend/test/...`
- Frontend: `frontend/src/...`, 테스트는 `frontend/__tests__/...`
- Docs: `docs/...`
- Maestro E2E: `.maestro/...`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 기존 모노레포/툴체인 점검. 본 feature 는 신규 라이브러리 도입이 없으므로 설치 작업은 최소.

- [X] T001 현재 브랜치가 `007-fix-login-notif-calendar` 인지 확인하고 `backend/`, `frontend/`, `.maestro/`, `docs/` 디렉토리 존재를 점검 (`git rev-parse --abbrev-ref HEAD`, `ls backend frontend .maestro docs`)
- [X] T002 [P] Maestro 설치·MCP 연결 상태를 `.maestro/config.yaml` 기준으로 확인하고 `appId: com.todolist.app` 일치 점검
- [X] T003 [P] 백엔드 Jest/Supertest, 프론트엔드 Jest+RNTL 실행 명령이 `backend/package.json`, `frontend/package.json` 에서 그린 상태로 동작하는지 스모크(`cd backend && npm test -- --listTests`, `cd frontend && npm test -- --listTests`)

**Checkpoint**: 빌드/테스트 툴체인 준비 완료.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 본 feature 는 세 그룹이 서로 다른 영역을 수정하여 **스토리 간 차단 의존이 없다**. 공통 인프라 변경도 없으므로 Foundational 은 문서 동기화 지점 확인만 수행한다.

- [X] T004 `docs/DDL.sql`, `docs/API_SPEC.md` 현재 버전 스냅샷을 확인(변경 예정 지점 식별): `TODOLIST_USER` 테이블 정의 위치와 User 엔드포인트 섹션 확인
- [X] T005 `specs/007-fix-login-notif-calendar/contracts/users-onboarding-complete.md` 최신 내용이 `POST /users/me/onboarding/complete` 계약과 일치하는지 재확인

**Checkpoint**: 모든 User Story 가 병렬로 진입 가능.

---

## Phase 3: User Story 1 - 온보딩 완료 상태 구조 개선 (Priority: P1) 🎯 MVP

**Goal**: `hasCompletedOnboarding` 을 도메인 1급 속성으로 도입하고, 전용 멱등 엔드포인트 + 플리커 방지 로딩 화면으로 Issue 1/3/4/5 를 구조적으로 해결.

**Independent Test**: (1) Android 실기기에서 온보딩 완료 계정 로그인 → 플리커 없이 Main 단일 렌더, (2) 설정에서 모든 알림 OFF → Main 유지, (3) 미완료 계정 재로그인 → Onboarding 진입, (4) 기존 사용자는 마이그레이션 직후 재온보딩 없이 Main 진입.

### Tests for User Story 1 (Red — 실패 확인 필수)

- [X] T006 [P] [US1] Backend 단위 테스트: `backend/test/user/complete-onboarding.usecase.spec.ts` 신규 — 케이스 C1(FALSE → TRUE), C2(멱등 재호출), C4(NotFound) 작성. 실행 시 아직 usecase 미구현으로 **실패해야 한다**
- [X] T007 [P] [US1] Backend E2E 계약 테스트: `backend/test/user/user.controller.e2e-spec.ts` 에 `POST /users/me/onboarding/complete` 블록 추가 — 케이스 C1/C2/C3(401)/C4(404)/C5(추가 필드 무시) 검증. **실패해야 한다**
- [X] T008 [P] [US1] Backend 회귀 테스트: `backend/test/user/get-profile.usecase.spec.ts` 의 응답 DTO 단언에 `hasCompletedOnboarding: boolean` 검증 추가. **실패해야 한다**
- [X] T009 [P] [US1] Backend 회귀 테스트: `backend/test/user/update-settings.usecase.spec.ts` 의 응답 DTO 단언에 `hasCompletedOnboarding: boolean` 검증 추가(알림 OFF 후에도 값 유지). **실패해야 한다**
- [X] T010 [P] [US1] Frontend 단위 테스트: `frontend/__tests__/app/navigation/isUserOnboarded.test.ts` 신규 — `hasCompletedOnboarding === true` 만 true, 다른 조합은 false. **실패해야 한다**
- [X] T011 [P] [US1] Frontend 컴포넌트 테스트: `frontend/__tests__/app/navigation/AuthNavigator.test.tsx` 신규/갱신 — isLoading 중 LoadingSplash 단독 렌더, 로딩 종료 후 Main/Onboarding 1회 전환, 알림 OFF 후 Main 유지, 완료자 Onboarding 접근 시 가드. **실패해야 한다**
- [X] T012 [P] [US1] Maestro E2E: `.maestro/auth/onboarding-complete.yml` 신규 — 신규 가입 → 온보딩 통과 → 재시작 → Main 진입(재온보딩 없음)
- [X] T013 [P] [US1] Maestro E2E: `.maestro/auth/onboarding-guard.yml` 신규 — 두 시나리오 검증: (1) **재로그인 가드**: 이미 온보딩 완료된 계정으로 재로그인 시 어떤 경로(딥링크/내비게이션)로도 Onboarding 스택이 렌더되지 않는다, (2) **완료 직후 전이**: 미완료 사용자가 온보딩 마지막 스텝에서 완료 버튼 탭 → `completeOnboardingApi` 성공 → 동일 세션 내에서 즉시 Main 스택으로 전환(가드 역전이가 1회만 발생)
- [X] T014 [P] [US1] Maestro E2E: `.maestro/home/no-flicker-after-login.yml` 신규 — 로그인 직후 Main 1회 렌더, 중간 Onboarding 프레임 감지 시 fail

### Implementation for User Story 1 (Green → Refactor)

- [X] T015 [US1] DB 스키마 문서화: `docs/DDL.sql` 의 `TODOLIST_USER` 정의에 `has_completed_onboarding BOOLEAN NOT NULL DEFAULT FALSE` 컬럼 추가 및 백필 `UPDATE TODOLIST_USER SET has_completed_onboarding = TRUE;` 기록. 실제 DB 반영은 T016 의 TypeORM 마이그레이션으로 수행하며, 본 태스크는 **문서 소스 오브 트루스**만 동기화한다(상단에 "실행은 `npm run migration:run` 을 통해 이루어짐" 주석 추가)
- [X] T016 [US1] TypeORM 마이그레이션 스크립트: `backend/src/common/migrations/{UNIX_MS}-AddHasCompletedOnboardingToUser.ts` 신규 (프로젝트 기존 규약의 UNIX ms 타임스탬프 네이밍 준수, 예: `1744848000000-AddHasCompletedOnboardingToUser.ts`). `MigrationInterface` 구현:
  - `up(queryRunner)`: `await queryRunner.query('ALTER TABLE "TODOLIST_USER" ADD COLUMN "has_completed_onboarding" BOOLEAN NOT NULL DEFAULT FALSE;');` 후 `await queryRunner.query('UPDATE "TODOLIST_USER" SET "has_completed_onboarding" = TRUE;');`
  - `down(queryRunner)`: `await queryRunner.query('ALTER TABLE "TODOLIST_USER" DROP COLUMN "has_completed_onboarding";');`
- [X] T016a [US1] 마이그레이션 CLI 스크립트: `backend/package.json` 의 `scripts` 블록에 `"migration:run": "typeorm-ts-node-commonjs migration:run -d src/data-source.ts"`, `"migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/data-source.ts"` 추가(기존에 동일 스크립트가 없는 경우). `backend/src/data-source.ts` 가 없으면 `backend/src/common/migrations/` 를 참조하는 DataSource 파일을 신규로 생성(기존 ORM 설정과 동일한 Supabase connection 옵션 재사용)
- [X] T016b [US1] 마이그레이션 실행·검증: 로컬 개발 DB 에서 `cd backend && npm run migration:run` 실행 → `TODOLIST_USER` 에 `has_completed_onboarding` 컬럼이 생성되고 기존 행 전원 `TRUE` 로 백필되었는지 `SELECT has_completed_onboarding, COUNT(*) FROM "TODOLIST_USER" GROUP BY has_completed_onboarding;` 로 확인. `npm run migration:revert` 1회 → 컬럼 제거 확인 → 다시 `migration:run` 으로 원복(FR-008 SC-003 회귀 증빙)
- [X] T017 [P] [US1] 백엔드 엔티티: `backend/src/user/domain/user.entity.ts` 에 `@Column({ name: 'has_completed_onboarding', type: 'boolean', default: false }) hasCompletedOnboarding!: boolean;` 추가
- [X] T018 [P] [US1] 백엔드 DTO: `backend/src/user/application/dto/user-profile.dto.ts` 에 `@IsBoolean() hasCompletedOnboarding!: boolean;` 추가 (class-validator)
- [X] T019 [P] [US1] 프론트 타입: `frontend/src/types/user.ts` 의 `UserProfile` 인터페이스에 `hasCompletedOnboarding: boolean` 필드 추가
- [X] T020 [US1] 유스케이스 신규: `backend/src/user/application/complete-onboarding.usecase.ts` 작성 — `execute({ userAuthId })` 로 findByUserAuthId → NotFound 처리 → 이미 true면 즉시 DTO 반환(멱등) → false면 true 세팅 후 update → toProfileDto 반환. 구조화 로그 `user.onboarding.completed` 이벤트 포함
- [X] T021 [US1] 모듈 등록: `backend/src/user/user.module.ts` 에 `CompleteOnboardingUsecase` provider 추가
- [X] T022 [US1] 컨트롤러 엔드포인트: `backend/src/user/user.controller.ts` 에 `@Post('me/onboarding/complete') completeOnboarding(@Req() req)` 메소드 추가 — `AuthGuard` 적용, `req.user.userAuthId` 를 usecase 로 전달
- [X] T023 [P] [US1] 응답 매핑: `backend/src/user/application/get-profile.usecase.ts` 의 `toProfileDto` 또는 응답 매핑 함수에 `hasCompletedOnboarding` 포함
- [X] T024 [P] [US1] 응답 매핑: `backend/src/user/application/update-settings.usecase.ts` 의 응답 매핑에 `hasCompletedOnboarding` 포함(알림 시간 변경과 무관함 보장)
- [X] T025 [US1] 판별 로직: `frontend/src/app/navigation/isUserOnboarded.ts` 를 `return user?.hasCompletedOnboarding === true;` 로 교체
- [X] T026 [P] [US1] 공통 로딩 컴포넌트: `frontend/src/app/navigation/LoadingSplash.tsx` 신규 — `SafeAreaView` + 앱 아이콘/로고 + `ActivityIndicator` 로 구성(헌법 V: loading 상태 설계)
- [X] T027 [US1] 라우팅 재구성: `frontend/src/app/navigation/AuthNavigator.tsx` 를 다음 4 단계로 수정:
  1. **로딩 단락**: `if (isAuthenticated && isLoading) return <LoadingSplash />;` 를 최상단에 배치(FR-003).
  2. **상태 계산**: `const showMain = isAuthenticated && user?.hasCompletedOnboarding === true;` / `const showOnboarding = isAuthenticated && user?.hasCompletedOnboarding !== true;` 로 상호 배타 플래그 산출.
  3. **구조적 가드(FR-007)**: Stack 내부에서 `{showMain && <Stack.Screen name="Main" ... />}`, `{showOnboarding && <Stack.Screen name="Onboarding" ... />}` 형태로 **라우트 자체를 조건부 렌더**한다. 완료 사용자 세션에서는 Onboarding 스크린이 네비게이션 트리에 존재하지 않아 딥링크·복원 모두 구조적으로 차단됨.
  4. **정리**: 기존 `(isLoading || isOnboarded)` 임시방편 로직과 관련 주석, 명령형 `navigation.reset` 후처리 제거.
- [X] T028 [P] [US1] API 클라이언트: `frontend/src/services/api/userApi.ts` 에 `completeOnboarding(): Promise<UserProfile>` 메소드 추가 (`POST /users/me/onboarding/complete`, 빈 본문)
- [X] T029 [P] [US1] Feature 레이어: `frontend/src/features/onboarding/completeOnboardingApi.ts` 신규 — `userApi.completeOnboarding()` 호출 후 `useAuthStore.setUser(profile)` 로 상태 갱신. 에러 시 사용자 재시도 가능한 에러 상태 반환
- [X] T030 [US1] 온보딩 플로우 연결: 온보딩 완료 버튼/마지막 스텝 화면(`frontend/src/features/onboarding/` 또는 해당 스크린)에서 기존 시간 저장 성공 이후 `completeOnboardingApi()` 호출하고 결과 프로필로 상태 갱신. 실패 시 에러 토스트 + 재시도 버튼
- [X] T031 [US1] 문서 동기화: `docs/API_SPEC.md` 의 User 섹션에 `POST /users/me/onboarding/complete` 계약(`contracts/users-onboarding-complete.md` 기반) 반영
- [X] T032 [US1] 회귀 검증: Jest backend/frontend 전체 통과 + Maestro US1 3종(`.maestro/auth/onboarding-complete.yml`, `onboarding-guard.yml`, `home/no-flicker-after-login.yml`) 그린 확인

**Checkpoint**: US1 이 독립적으로 완전히 동작(Issue 1/3/4/5 해결). Android 실기기에서 회귀 테스트 가능.

---

## Phase 4: User Story 2 - iOS/Android 알림 수신 (Priority: P2)

**Goal**: Android 13+ 실기기에서 FCM 도달을 회복하고, iOS 는 APNs 미구성(Apple Developer Out of Scope) 상태에서 방어적 no-op 으로 크래시 없이 동작하도록 코드 레벨 준비.

**Independent Test**: Android 13 이상 실기기 개발 빌드 재설치 → 최초 실행 권한 프롬프트 → 허용 → 백엔드 수동 트리거로 알림 발송 → 알림 센터 표시 비율 ≥ 95%. iOS 빌드는 실기기/시뮬레이터 구동 시 크래시 없이 Group A/C 기능이 정상 동작.

### Tests for User Story 2 (Red — 실패 확인 필수)

- [X] T033 [P] [US2] Frontend 단위: `frontend/__tests__/features/notification/usePushNotification.test.ts` 신규/갱신 — Android 분기: (1) 채널 등록이 권한 요청보다 먼저 호출, (2) 권한 허용 시 리스너 연결, (3) 권한 거부 시 크래시 없이 조기 반환. **실패해야 한다**
- [X] T034 [P] [US2] Frontend 단위: `frontend/__tests__/features/notification/ensureIOSPushSafety.test.ts` 신규 — iOS 분기: APNs 의존 호출이 throw 해도 상위로 전파되지 않고 dev 로그만 남김. **실패해야 한다**
- [X] T035 [P] [US2] Maestro E2E: `.maestro/notification/android-permission.yml` 신규 — 최초 실행 시 `POST_NOTIFICATIONS` 시스템 프롬프트가 표시되고 허용 후 앱이 메인 플로우로 진입

### Implementation for User Story 2 (Green → Refactor)

- [X] T036 [US2] 매니페스트 권한: `frontend/app.json` 의 `expo.android.permissions` 배열에 `"android.permission.POST_NOTIFICATIONS"` 추가 (기존 RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, FOREGROUND_SERVICE, FOREGROUND_SERVICE_MEDIA_PLAYBACK 유지)
- [X] T037 [P] [US2] 기본 채널 등록 모듈: `frontend/src/features/notification/setupNotificationChannel.ts` 신규 — `Platform.OS === 'android'` 일 때 `Notifications.setNotificationChannelAsync('default', { name: 'Default', importance: Notifications.AndroidImportance.MAX })` 호출을 export
- [X] T038 [P] [US2] iOS 방어 모듈: `frontend/src/features/notification/ensureIOSPushSafety.ts` 신규 — `Platform.OS === 'ios'` 일 때 APNs 의존 호출(예: `messaging().getAPNSToken()`, `messaging().registerDeviceForRemoteMessages()`)을 try/catch 로 감싸 에러 시 dev 로그만 남기고 resolve(null) 반환. JSDoc 에 "Apple Developer 미등록으로 APNs 미구성 환경에서 앱 크래시 방지" WHY 주석
- [X] T039 [US2] 훅 재구성: `frontend/src/features/notification/usePushNotification.ts` 를 다음 4 단계 초기화 순서로 수정:
  1. **채널 등록 선행(Android)**: `setupNotificationChannel()` 을 권한 요청보다 먼저 호출(O+ 에서 채널 없는 알림이 조용히 드롭되는 문제 방지).
  2. **권한 요청**: 플랫폼별 권한 프롬프트. iOS 경로는 `ensureIOSPushSafety()` 로 위임(APNs 호출 try/catch).
  3. **토큰 + 포그라운드 리스너**: 권한 허용 시 FCM 토큰 획득·업로드 + `messaging().onMessage` 포그라운드 수신 핸들러 연결.
  4. **거부 처리**: 권한 거부 시 조기 반환, 사용자 UI 에 차단 에러 노출 금지(헌법 V).
  주의: 백그라운드/종료 상태 수신은 이 훅이 아니라 T039a 의 엔트리 등록이 담당한다.
- [X] T039a [US2] 백그라운드 핸들러 엔트리 등록: `frontend/index.ts` 의 `registerRootComponent(App)` **호출 이전**에 `import messaging from '@react-native-firebase/messaging';` 후 `messaging().setBackgroundMessageHandler(async (remoteMessage) => { /* 로깅 + 필요 시 로컬 노티 표시 */ });` 를 등록. 훅 수명주기로는 종료 상태 수신이 보장되지 않으므로 엔트리 등록이 필수(FR-012).
- [X] T039b [P] [US2] 백그라운드 핸들러 회귀 테스트: `frontend/__tests__/entry/backgroundHandler.test.ts` 신규 — `frontend/index.ts` import 시점에 `messaging().setBackgroundMessageHandler` 가 `registerRootComponent` 보다 먼저 호출되는지 mock 으로 순서 검증. **실패해야 한다**(T039a 구현 전)
- [X] T040 [US2] 회귀 검증: Jest frontend 전체 통과 + Maestro `.maestro/notification/android-permission.yml` 그린. EAS dev 빌드 재생성 후 Android 13+ 실기기에서 권한 허용 → 백엔드 수동 트리거 → 알림 센터 표시 확인(SC-005 ≥ 95% 스모크). 앱을 **종료 상태**로 두고 트리거 → 알림 센터 표시 + 탭 시 딥링크 동작 확인(FR-012). iOS 시뮬레이터에서 앱 구동 시 크래시 없음 확인(SC-008)

**Checkpoint**: Android FCM 도달 회복, iOS 는 APNs 부재 하에서도 크래시 없이 구동. US1 과 독립 검증 가능.

---

## Phase 5: User Story 3 - 캘린더 즉시 반영 (Priority: P3)

**Goal**: 홈 탭 mutation 직후 캘린더 탭 전환/재포커스 시 월간 요약이 최신 값으로 갱신되도록 `useFocusEffect` 재조회 도입.

**Independent Test**: 로그인 → 홈 탭에서 오늘 날짜 todo 1건 추가 → 캘린더 탭 전환 → 오늘 날짜 셀 카운트가 추가 전 대비 1 증가.

### Tests for User Story 3 (Red — 실패 확인 필수)

- [X] T041 [P] [US3] Frontend 컴포넌트 테스트: `frontend/__tests__/app/navigation/MainTabNavigator.test.tsx` 신규/갱신 — CalendarTab 이 포커스를 얻을 때 `fetchMonthlySummary(year, month)` 가 호출되는지, 블러 시 중복 호출되지 않는지 검증. **실패해야 한다**
- [X] T042 [P] [US3] Maestro E2E: `.maestro/calendar/focus-refetch.yml` 신규 — 홈 탭에서 오늘 날짜 todo 추가 → 캘린더 탭 전환 → 오늘 날짜 셀 카운트 증가 확인

### Implementation for User Story 3 (Green → Refactor)

- [X] T043 [US3] 포커스 재조회: `frontend/src/app/navigation/MainTabNavigator.tsx` 의 `CalendarTab` 내부에 `useFocusEffect(useCallback(() => { void fetchMonthlySummary(year, month); }, [year, month, fetchMonthlySummary]));` 추가. 기존 `useEffect([year, month])` 는 유지(월 변경 케이스). 에러 상태는 기존 값 유지 + 사용자 방해 없는 처리(헌법 V)
- [X] T044 [US3] 회귀 검증: Jest frontend 전체 통과 + Maestro `.maestro/calendar/focus-refetch.yml` 그린. 수동 스모크로 빠른 연속 추가 시에도 요약이 일관되게 갱신되는지 확인

**Checkpoint**: 모든 User Story 가 독립적으로 동작.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 전체 품질 게이트 통과, 문서 동기화, Definition of Done 확인.

- [X] T045 [P] 문서 최종 검수: `docs/DDL.sql`(T015), `docs/API_SPEC.md`(T031), `specs/007-fix-login-notif-calendar/spec.md` 간 일관성 교차 확인
- [X] T046 [P] TypeScript strict + lint: `cd backend && npm run lint && npx tsc --noEmit`, `cd frontend && npm run lint && npx tsc --noEmit` 각각 에러 0
- [X] T047 [P] 전체 Jest: `cd backend && npm test`, `cd frontend && npm test` 전 스위트 그린
- [X] T048 전체 Maestro E2E: `.maestro/auth/onboarding-complete.yml`, `auth/onboarding-guard.yml`, `home/no-flicker-after-login.yml`, `calendar/focus-refetch.yml`, `notification/android-permission.yml` 일괄 실행 그린
- [X] T049 EAS dev 빌드 재생성 및 Android 13+ 실기기 전체 시나리오 스모크(온보딩 → 알림 OFF 유지 → todo 추가·캘린더 → 알림 수신 ≥ 95%)
- [X] T050 iOS 시뮬레이터(가능 시 실기기) 구동 스모크 — 크래시 0, Group A/C UI 정상, 알림 초기화 경로에서 방어적 no-op 확인
- [X] T051 `specs/007-fix-login-notif-calendar/quickstart.md` §5 검증 체크리스트 전 항목 체크
- [X] T052 헌법 Definition of Done 7개 항목 셀프 점검 후 PR 본문 초안 작성(각 Group 별 증빙 포함)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: 즉시 시작 가능, 의존 없음.
- **Phase 2 Foundational**: Setup 완료 후. 본 feature 는 공통 차단 태스크가 없으므로 Phase 3~5 가 병렬 진입 가능.
- **Phase 3 US1 (P1, MVP)**: Foundational 완료 후 시작. Group A 는 내부적으로 DB → 엔티티/DTO → usecase → controller → 프론트 순서 의존 있음(아래 Within 참조).
- **Phase 4 US2 (P2)**: Foundational 완료 후 시작. US1 과 독립(사용자 프로필 타입에 신규 필드가 있다고 해도 US2 코드는 해당 필드를 참조하지 않음).
- **Phase 5 US3 (P3)**: Foundational 완료 후 시작. US1/US2 와 완전 독립.
- **Phase 6 Polish**: 모든 US 완료 후.

### User Story Dependencies

- **US1 (P1)**: Foundational 직후 착수 가능. 다른 스토리와 독립.
- **US2 (P2)**: Foundational 직후 착수 가능. US1 과 독립 — 단, EAS 재빌드가 필요하므로 실제 실기기 회귀는 US1 머지 뒤에 묶어 1회 빌드로 마감하는 것을 권장(spec 구현 순서 제안 준수).
- **US3 (P3)**: Foundational 직후 착수 가능. 파일 변경 범위가 가장 작음(1개 파일).

### Within Each User Story

- **TDD 순서 강제(헌법 III)**: 해당 스토리의 모든 Red 태스크(T006~T014, T033~T035, T041~T042)가 실패 확인 후에 구현 태스크(Green) 진입.
- **US1 내부 의존**:
  - T015(DDL 문서) → T016(마이그레이션 파일) → T016a(npm 스크립트) → T016b(실행·검증) 순서.
  - T017/T018/T019 (엔티티/DTO/타입) 는 [P], T020(usecase) 은 T017/T018 이후.
  - T021(모듈 등록) → T022(컨트롤러) 순서.
  - T023/T024 (응답 매핑) 는 T018 이후 [P].
  - T025(프론트 판별) 는 T019 이후.
  - T027(AuthNavigator) 은 T025, T026 이후.
  - T028/T029 는 T019 이후 [P].
  - T030 은 T029 이후.
- **US2 내부 의존**: T037, T038 은 [P]. T039 는 T037/T038 이후. T036 은 단독이므로 언제든. T039a(엔트리 백그라운드 핸들러 등록)는 T033~T035 Red 이후·T040 이전 아무 시점이나 가능하며 다른 구현 태스크와 **독립** 파일(`frontend/index.ts`). T039b(Red 테스트)는 T039a 구현 **전**에 작성·실패 확인.
- **US3 내부 의존**: T043 단일 구현 태스크.

### Parallel Opportunities

- Phase 1 의 T002, T003 [P] 병렬.
- Phase 3 의 Red 태스크 T006~T014 전원 [P] 병렬(각기 다른 파일).
- Phase 3 구현 중 T017/T018/T019/T023/T024/T028 [P] 병렬.
- Phase 4 의 Red 태스크 T033~T035 [P] 병렬. 구현의 T037/T038 [P] 병렬.
- Phase 5 의 Red 태스크 T041/T042 [P] 병렬.
- Phase 6 의 T045/T046/T047 [P] 병렬.
- 팀 인력이 충분하면 US1/US2/US3 세 스토리를 **세 개발자가 병렬** 진행 가능.

---

## Parallel Example: User Story 1

```bash
# Red 단계 — 실패 테스트를 한 번에 작성/실행
Task: "T006 complete-onboarding.usecase.spec.ts 신규"
Task: "T007 user.controller.e2e-spec.ts POST 블록 추가"
Task: "T008 get-profile.usecase.spec.ts 회귀 추가"
Task: "T009 update-settings.usecase.spec.ts 회귀 추가"
Task: "T010 isUserOnboarded.test.ts 신규"
Task: "T011 AuthNavigator.test.tsx 플리커/가드 테스트 신규"
Task: "T012 .maestro/auth/onboarding-complete.yml 신규"
Task: "T013 .maestro/auth/onboarding-guard.yml 신규"
Task: "T014 .maestro/home/no-flicker-after-login.yml 신규"

# Green 단계 — 엔티티/DTO/타입 병렬 전파
Task: "T017 user.entity.ts @Column 추가"
Task: "T018 user-profile.dto.ts 필드 추가"
Task: "T019 frontend/src/types/user.ts 필드 추가"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup 완료.
2. Phase 2: Foundational 완료(본 feature 는 경량).
3. Phase 3: US1(Group A) 완료 — `hasCompletedOnboarding` 도메인 승격 + 전용 엔드포인트 + 플리커 방지.
4. **STOP and VALIDATE**: US1 독립 검증(Maestro 3종 + Android 실기기 스모크). Issue 1/3/4/5 즉시 해소 확인.
5. 필요 시 MVP 배포 또는 내부 데모.

### Incremental Delivery

1. Setup + Foundational → 기반 확인.
2. US1 → 독립 검증 → 머지/배포 가능(MVP).
3. US3 → 독립 검증 → 머지/배포 가능(가장 작은 변경, 병렬 처리 가능).
4. US2 → EAS 재빌드를 수반하므로 마지막 배치로 묶어 1회 빌드 → 독립 검증 → 머지/배포.
5. Phase 6 Polish 로 마감(PR 증빙·문서·DoD).

### Parallel Team Strategy

다수 개발자 투입 시:

1. Phase 1/2 를 전원이 공동 완료.
2. 이후:
   - Developer A: US1 (Group A, 백엔드·프론트·Maestro 다수)
   - Developer B: US2 (Group B, 알림 초기화·권한·방어 모듈)
   - Developer C: US3 (Group C, CalendarTab 포커스 재조회)
3. 세 스토리가 서로의 코드 경로를 수정하지 않으므로 동시 병합이 가능하나, **`frontend/app.json`** 은 US2 가 단독 편집(충돌 방지).

---

## Notes

- 모든 [P] 태스크는 서로 다른 파일을 대상으로 하며 선행 의존이 없음.
- [Story] 레이블은 회귀 추적과 MVP 단계 결정을 위해 유지.
- Red → Green → Refactor 순서는 헌법 III 의 강제 규칙. 실패 확인 없이 구현 태스크로 진입하지 않는다.
- 각 태스크 완료 직후 또는 논리적 그룹 단위로 커밋. 헌법 IX(Branch Strategy) 에 따라 `main` 직접 push 금지, PR 필수.
- iOS 관련 태스크(T034, T038, T050)는 Apple Developer Out of Scope 범위 내에서만 수행 — APNs 인증서·Firebase iOS 등록·번들 구성 작업 금지(spec "Out of Scope" 섹션 참조).
- 문서(`docs/DDL.sql`, `docs/API_SPEC.md`) 갱신 누락은 DoD 5 위반이므로 T031, T045 에서 반드시 확인.
