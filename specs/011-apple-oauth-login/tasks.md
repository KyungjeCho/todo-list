---

description: "Apple OAuth 2.0 로그인 활성화 — 구현 작업 분해"
---

# Tasks: Apple OAuth 2.0 로그인 활성화

**Input**: Design documents from `/home/jkjk396/workspace/todo-list/dev-log/todo-list/specs/011-apple-oauth-login/`
**Prerequisites**: plan.md (필수), spec.md (필수 — 사용자 스토리), research.md, data-model.md, contracts/, quickstart.md

**Tests**: 헌법 III(TDD NON-NEGOTIABLE)과 X(Maestro E2E)에 따라 **필수**. 각 사용자 스토리 단계에서 실패 테스트를 먼저 작성하고 구현을 진행한다.

**Organization**: 작업은 사용자 스토리별로 그룹화되어 독립적으로 구현·테스트·배포 가능하다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능(다른 파일, 선행 작업 의존 없음)
- **[Story]**: US1/US2/US3 — spec.md 사용자 스토리 매핑
- 경로는 리포지토리 루트 `/home/jkjk396/workspace/todo-list/dev-log/todo-list/` 기준 절대 경로로 표기

## Path Conventions

- Backend: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/`
- Frontend: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/frontend/`
- Maestro E2E: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/.maestro/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Apple 자격 증명 주입 경로와 구성 값 준비. 코드 구조 변경 없이 기존 디렉토리만 사용한다.

- [X] T001 `oauth.apple` config에 `callbackUrl`과 `privateKey` 필드를 추가한다 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/common/config/configuration.ts`). `APPLE_CALLBACK_URL`, `APPLE_PRIVATE_KEY` 환경 변수를 매핑하고, 기존 `APPLE_CLIENT_ID/APPLE_TEAM_ID/APPLE_KEY_ID/APPLE_PRIVATE_KEY_PATH`는 유지.
- [X] T002 [P] 루트 `.env.example`(없으면 `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/.env.example` 생성 또는 기존 파일 갱신)에 `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_PATH`, `APPLE_PRIVATE_KEY`, `APPLE_CALLBACK_URL` 주석을 추가하여 개발자에게 필요 항목을 명시한다.
- [X] T003 [P] 기능 브랜치 최신화 및 TypeScript 타입/린트 베이스라인 확인: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend`와 `/home/jkjk396/workspace/todo-list/dev-log/todo-list/frontend` 각각에서 `npm run lint` 및 `tsc --noEmit`가 현재 브랜치에서 0 오류임을 기록.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 사용자 스토리에서 공통적으로 호출되는 Apple 핵심 인프라(클라이언트 시크릿 JWT 생성, JWKS 캐시, id_token 검증, provider 서비스 분기, 로그인 URL 빌더, 모듈 등록, i18n 키)를 구축한다.

**⚠️ CRITICAL**: 사용자 스토리 Phase는 이 Phase 완료 전 시작 불가.

- [X] T004 [P] 실패 단위 테스트 작성: `AppleClientSecretService`의 ES256 JWT 헤더(`kid`, `alg=ES256`), 클레임(`iss=teamId`, `sub=clientId`, `aud=https://appleid.apple.com`, `exp<=iat+3600`), 캐시 재사용·만료 재생성, 환경 변수(key path vs key string) 두 경로, 모두 실패 표준 에러 `APPLE_CLIENT_SECRET_FAILED` (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/infrastructure/apple/apple-client-secret.service.spec.ts`).
- [X] T005 [P] 실패 단위 테스트 작성: `AppleJwksService` TTL 캐시, kid 미일치 시 1회 강제 재조회, 네트워크 실패 → `APPLE_ID_TOKEN_INVALID` 매핑 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/infrastructure/apple/apple-jwks.service.spec.ts`).
- [X] T006 [P] 실패 단위 테스트 작성: `AppleIdTokenVerifier` — 유효 서명 통과, `iss`/`aud`/`exp` 위반 각각 거부, kid 미일치 시 JWKS 재조회 후 최종 거부, clock skew 60초 허용 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/infrastructure/apple/apple-id-token-verifier.service.spec.ts`).
- [X] T007 [P] `AppleClientSecretService` 구현 — `jsonwebtoken`을 사용해 `.p8` private key(path 또는 env 문자열)를 로드, ES256 서명, in-memory 캐시(TTL 55분)를 제공 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/infrastructure/apple/apple-client-secret.service.ts`). 실패 시 `BadRequestException('APPLE_CLIENT_SECRET_FAILED')` 발생.
- [X] T008 [P] `AppleJwksService` 구현 — `https://appleid.apple.com/auth/keys`를 fetch하여 TTL 10분 캐시, `getKey(kid)` 제공, 미일치 시 강제 재조회 1회 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/infrastructure/apple/apple-jwks.service.ts`).
- [X] T009 [US1] `AppleIdTokenVerifier` 구현 — JWT 헤더 `kid`/`alg` 확인, `AppleJwksService`로 공개키 조회, `ES256`/`RS256` 서명 검증, `iss`/`aud`/`exp` 클레임 검증 후 `AppleIdTokenClaims` 반환 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/infrastructure/apple/apple-id-token-verifier.service.ts`). **T008 의존**.
- [X] T010 [P] 실패 단위 테스트 추가: `OAuthProviderService.exchangeCodeForProfile('apple', code, state)`가 userinfo 엔드포인트를 호출하지 않고 `id_token`만 사용해 `{ provider:'apple', providerUserId:sub, providerUserEmail:email, providerUserName:'' }`를 반환하도록 검증 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/infrastructure/oauth-provider.service.spec.ts`, 없으면 신규 생성).
- [X] T011 `OAuthProviderService` Apple 분기 리팩터 — 토큰 교환 시 `client_secret`을 `AppleClientSecretService.get()`으로 주입, 응답에서 `id_token`을 꺼내 `AppleIdTokenVerifier.verify()`로 검증, userinfo fetch(`/auth/userinfo`) 호출 제거, 프로필 매핑 로직 수정 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/infrastructure/oauth-provider.service.ts`). **T007, T009 의존**.
- [X] T012 [P] 실패 단위 테스트 추가: `OAuthLoginUsecase`가 `provider='apple'`일 때 `response_mode=form_post`와 `scope=name email` 파라미터를 authorization URL에 포함하고, 기존 프로바이더는 영향받지 않음 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/application/oauth-login.usecase.spec.ts`, 없으면 신규 생성).
- [X] T013 `OAuthLoginUsecase`에 Apple 전용 분기 추가 — `provider==='apple'`일 때 `response_mode=form_post` 쿼리 파라미터를 덧붙인다 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/application/oauth-login.usecase.ts`). `PROVIDER_SCOPES['apple']`는 이미 `name email`이므로 확인만 수행.
- [X] T014 [P] `AuthModule`이 Apple 서비스를 등록하도록 provider 배열에 `AppleClientSecretService`, `AppleJwksService`, `AppleIdTokenVerifier`를 추가한다 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/auth.module.ts`). 기존 `AppleStrategy` Passport 등록은 실제 사용되지 않으므로 제거 또는 비활성화하고 WHY 주석으로 이유를 남긴다.
- [X] T015 [P] i18n 오류 메시지 키 추가(공통, 모든 스토리에서 사용): `auth.appleLoginFailed`, `auth.appleCancelled`, `auth.appleServerError`를 `ko`, `en`, `ja`, `es` 4개 locale 파일 각각에 추가 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/frontend/src/i18n/locales/*.json`). 기존 `auth.continueWithApple`이 없으면 함께 추가.

**Checkpoint**: 인프라 준비 완료. 사용자 스토리 병렬 시작 가능.

---

## Phase 3: User Story 1 — 신규 사용자가 Apple 계정으로 첫 로그인 (Priority: P1) 🎯 MVP

**Goal**: 앱을 처음 쓰는 사용자가 "Apple로 계속하기"를 눌러 Apple 계정으로 가입하고 홈 화면에 진입한다. Apple의 form_post 콜백에서 첫 로그인에만 전달되는 `user` 필드(JSON)를 파싱해 이름을 저장한다.

**Independent Test**: 새 Apple 계정으로 `GET /auth/oauth/apple` 진입 → Apple 인증 완료 → `POST /auth/oauth/apple/callback` 수신 → DB에 `provider='apple'` UserOauth·User 신규 생성 확인 → 클라이언트에서 홈 화면 진입. 15초 이내 95% 성공(SC-001).

### Tests for User Story 1 (TDD, 실패 먼저)

- [X] T016 [P] [US1] 실패 단위 테스트: `AppleFormPostCallbackDto` class-validator 규칙 — `code`/`state` 필수, `user` 선택·4096자 초과 거부 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/application/dto/apple-form-post-callback.dto.spec.ts`).
- [X] T017 [P] [US1] 실패 통합 테스트: `POST /auth/oauth/apple/callback` — 유효 state + code + user(JSON) → 302 리다이렉트, fragment에 `isNewUser=true`, DB에 `todolist_user_auth_oauth`/`todolist_user` 신규 row 생성, `user.user_name`이 파싱된 firstName+lastName과 일치 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/test/integration/auth/apple-oauth.spec.ts`).
- [X] T018 [P] [US1] 실패 통합 테스트: 동일 엔드포인트 — `user` 필드 없이 첫 로그인 요청 → email local-part fallback으로 `user_name` 저장, `isNewUser=true` (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/test/integration/auth/apple-oauth.spec.ts`).
- [X] T019 [P] [US1] 실패 프론트엔드 단위 테스트: `LoginScreen`의 Apple 버튼이 i18n 키 `auth.continueWithApple`을 렌더링하고 `testID="oauth-button-apple"`(신규) 속성을 가지며, 탭 시 `useAuth.login('apple')`이 호출됨 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/frontend/__tests__/screens/auth/LoginScreen.test.tsx`).
- [X] T020 [P] [US1] 실패 Maestro E2E: 신규 Apple 로그인 해피 패스 — 로그인 화면 → `testID="oauth-button-apple"` 탭 → 모의 성공 콜백 → 홈 화면 `testID="home-screen"` 노출. `clearState: true`, `launchApp` 포함 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/.maestro/auth/login-apple.yml`).

### Implementation for User Story 1

- [X] T021 [US1] `AppleFormPostCallbackDto` 구현 — class-validator 데코레이터로 `code`/`state`(IsString, IsNotEmpty, MaxLength), `user`(Optional, IsString, MaxLength 4096), `id_token`(Optional, IsString)를 검증 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/application/dto/apple-form-post-callback.dto.ts`). `dto/index.ts`에 재수출.
- [X] T022 [US1] `AuthController`에 `POST /auth/oauth/apple/callback` 라우트 추가 — `@Post('oauth/apple/callback')`, `application/x-www-form-urlencoded` body 수용, DTO 검증, 기존 state 검증 로직 재사용, `exchangeCodeForProfile` 호출, `user` 필드 JSON 파싱 후 `providerUserName` 주입, `OAuthCallbackUsecase.execute()` 호출, 기존 fragment redirect 응답 생성. 헬퍼 메서드로 공통화 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/auth.controller.ts`). **T011, T021 의존**.
- [X] T023 [US1] `user` JSON 파싱 헬퍼 추가 — `parseAppleUserField(raw: string | undefined): string` 유틸을 controller 내부 private static 또는 별도 infra 헬퍼로 구현. 파싱 실패·빈 필드는 빈 문자열 반환 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/auth.controller.ts` 또는 `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/infrastructure/apple/apple-user-field.parser.ts`).
- [X] T024 [US1] `LoginScreen`에 Apple 버튼 `testID="oauth-button-apple"` 속성 부여 — 기존 `OAuthProviderButton` 렌더링 시 provider별 testID 자동화가 이미 있는지 확인하고, 없으면 `OAuthProviderButton`에 testID prop를 추가해 provider별 고정 값을 전달 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/frontend/src/components/auth/OAuthProviderButton.tsx` 및 `/home/jkjk396/workspace/todo-list/dev-log/todo-list/frontend/src/screens/auth/LoginScreen.tsx`).
- [X] T025 [US1] `useAuth.login('apple')`가 기존 provider 경로를 그대로 사용함을 검증하고 필요 시 `authApi.getOAuthUrl`의 provider 검증 유지만 확인 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/frontend/src/features/auth/useAuth.ts`, `/home/jkjk396/workspace/todo-list/dev-log/todo-list/frontend/src/services/api/authApi.ts`). 코드 변경 없으면 주석으로 WHY만 남긴다.
- [X] T026 [US1] T016~T020의 실패 테스트가 모두 그린(PASS)이 되도록 구현 완료 확인 및 Maestro 실행 기록. 명령: `(cd /home/jkjk396/workspace/todo-list/dev-log/todo-list/backend && npm test -- --testPathPatterns="apple|oauth" && npm run test:integration)` 및 `(cd /home/jkjk396/workspace/todo-list/dev-log/todo-list/frontend && npm test -- LoginScreen)` 및 `(maestro test /home/jkjk396/workspace/todo-list/dev-log/todo-list/.maestro/auth/login-apple.yml)`.

**Checkpoint**: User Story 1 독립 동작. 신규 Apple 사용자가 처음 로그인하여 홈에 진입.

---

## Phase 4: User Story 2 — 기존 Apple 사용자가 재로그인 (Priority: P1)

**Goal**: 이미 Apple로 가입한 사용자가 로그아웃 후 동일 Apple 계정으로 재로그인할 때 기존 계정으로 식별되고 데이터·이름이 보존된다.

**Independent Test**: US1로 생성된 사용자가 로그아웃 후 동일 Apple `sub`로 재로그인 → `OAuthCallbackUsecase`가 `existingOauth` 분기 진입 → `isNewUser=false`, `user.user_name` 불변. Apple이 `user` 필드를 보내지 않는 2회차 시나리오도 통과.

### Tests for User Story 2 (TDD, 실패 먼저)

- [X] T027 [P] [US2] 실패 통합 테스트: 기존 `(provider='apple', providerUserId=<sub>)` UserOauth가 존재할 때 `POST /auth/oauth/apple/callback` 재호출 → `isNewUser=false` fragment, DB에 UserAuth/UserOauth/User 신규 row **미생성**, 기존 `user.user_name` 불변 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/test/integration/auth/apple-oauth.spec.ts`).
- [X] T028 [P] [US2] 실패 통합 테스트: 재로그인 시 `user` 필드가 없고 Apple이 이메일도 생략한 경우에도 `providerUserId(sub)`만으로 기존 사용자를 찾고 이름·이메일을 덮어쓰지 않는다 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/test/integration/auth/apple-oauth.spec.ts`).
- [X] T029 [P] [US2] 실패 Maestro E2E: 로그인 → 로그아웃 → 다시 Apple 로그인 → 홈 화면의 기존 데이터(예: `testID="todo-list"`에 존재하는 첫 항목)가 유지되는지 검증 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/.maestro/auth/login-apple-relogin.yml`).

### Implementation for User Story 2

- [X] T030 [US2] `OAuthCallbackUsecase`에 Apple 재로그인 경로에 대한 WHY 주석을 보강하여 `existingOauth` 분기에서 `user.user_name`이 덮어쓰이지 않음을 명시한다. 로직 변경은 없으되 회귀 방지용 코드 코멘트·테스트 수준으로 보강 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/application/oauth-callback.usecase.ts`).
- [X] T031 [US2] 구조화 로그: Apple 콜백 처리 시 `event`에 `login_new`/`login_returning`을 구분해 남기도록 controller 또는 provider service에 로깅 추가 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/auth.controller.ts`). FR-015 충족.
- [X] T032 [US2] T027~T029 그린 확인: `(cd /home/jkjk396/workspace/todo-list/dev-log/todo-list/backend && npm run test:integration -- --testPathPatterns=apple)` 및 `maestro test /home/jkjk396/workspace/todo-list/dev-log/todo-list/.maestro/auth/login-apple-relogin.yml`.

**Checkpoint**: User Story 2 독립 동작. 기존 Apple 사용자 재로그인이 데이터 보존과 함께 성공.

---

## Phase 5: User Story 3 — Apple 로그인 실패 시 복구 (Priority: P2)

**Goal**: 사용자 취소, 네트워크 오류, 서버 구성 오류, id_token 검증 실패, 잘못된 메서드 호출 등에서 사용자에게 다국어 오류 메시지를 보이고 로그인 화면으로 복귀시킨다. 운영 로그에는 원인 식별이 가능한 구조화된 에러 코드를 남긴다.

**Independent Test**: 각 실패 시나리오(Apple 시트에서 취소, p8 누락, id_token 조작, GET 콜백으로 Apple 트래픽, Apple이 token endpoint에서 non-2xx 응답)에서 사용자에게 i18n 에러 메시지 노출, 로그인 화면 버튼 재활성화, 서버 로그에 해당 에러 코드 기록.

### Tests for User Story 3 (TDD, 실패 먼저)

- [X] T033 [P] [US3] 실패 통합 테스트: `POST /auth/oauth/apple/callback`에서 Apple 토큰 엔드포인트가 non-2xx를 반환하도록 모킹 → 400 `OAUTH_CODE_EXCHANGE_FAILED`, 민감 정보 로그 제외 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/test/integration/auth/apple-oauth.spec.ts`).
- [X] T034 [P] [US3] 실패 통합 테스트: id_token의 `aud`가 `APPLE_CLIENT_ID`와 다를 때 400 `APPLE_ID_TOKEN_INVALID` 반환, `exp` 초과 시 동일 결과 (파일: 상동).
- [X] T035 [P] [US3] 실패 통합 테스트: Apple private key 경로가 유효하지 않을 때 첫 요청에서 400 `APPLE_CLIENT_SECRET_FAILED` 반환 (파일: 상동).
- [X] T036 [P] [US3] 실패 통합 테스트: `GET /auth/oauth/apple/callback`으로 진입 시 400 `APPLE_MUST_USE_FORM_POST` 반환 (파일: 상동).
- [X] T037 [P] [US3] 실패 프론트엔드 단위 테스트: `useAuth.login('apple')`이 서버 오류/사용자 취소를 감지해 i18n 키 `auth.appleLoginFailed`/`auth.appleCancelled`로 `error` 상태를 설정하고 `isLoading=false` 복귀 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/frontend/__tests__/features/auth/useAuth.test.ts`).
- [X] T038 [P] [US3] 실패 Maestro E2E: 사용자가 Apple 시트에서 취소한 플로우를 시뮬레이션하여 로그인 화면 에러 메시지가 노출되고 다른 프로바이더 버튼이 재활성화됨 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/.maestro/auth/login-apple-cancel.yml`).

### Implementation for User Story 3

- [X] T039 [US3] `AuthController`의 기존 `GET /auth/oauth/:provider/callback` 핸들러에 Apple 방어 가드 추가 — `provider==='apple'`이면 `BadRequestException('APPLE_MUST_USE_FORM_POST')` (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/auth.controller.ts`).
- [X] T040 [US3] `OAuthProviderService` Apple 분기의 실패 경로에 구조화 로그와 에러 코드 매핑을 구현한다: 토큰 교환 실패→`OAUTH_CODE_EXCHANGE_FAILED`, id_token 없음→`APPLE_ID_TOKEN_INVALID`, 검증 실패→`APPLE_ID_TOKEN_INVALID`, client_secret 생성 실패→`APPLE_CLIENT_SECRET_FAILED`. 민감 값(code, id_token, private key, Authorization)은 절대 로깅하지 않는다 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/infrastructure/oauth-provider.service.ts`).
- [X] T041 [US3] `useAuth.login` 에러 메시지 매핑 — 서버가 반환하는 에러 코드 또는 WebBrowser 결과 `type==='cancel'`을 i18n 키로 매핑해 `setError()` 호출. 로딩 상태 정리 (파일: `/home/jkjk396/workspace/todo-list/dev-log/todo-list/frontend/src/features/auth/useAuth.ts`).
- [X] T042 [US3] T033~T038 그린 확인: 통합·프론트·E2E 전체 실행 로그 수집 및 커밋.

**Checkpoint**: User Story 3 독립 동작. 모든 주요 실패 경로에서 사용자 친화적 복구와 운영 관측성 확보.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 보안·문서·성능 검토 및 릴리스 준비.

- [X] T043 [P] Quickstart 수동 검증 실행 — `/home/jkjk396/workspace/todo-list/dev-log/todo-list/specs/011-apple-oauth-login/quickstart.md`의 §2 시나리오를 수행하고 완료 기준 §6 체크리스트를 기록한다. 결과를 `/home/jkjk396/workspace/todo-list/dev-log/todo-list/docs/`(존재하면) 또는 PR 설명에 첨부한다.
- [X] T044 [P] 시크릿 스캔 — `.env.local`, 빌드 산출물, 저장된 로그에 `APPLE_PRIVATE_KEY`/p8/JWT가 평문으로 노출되지 않았는지 `grep`과 CI 스캐너로 확인하고, 결과를 `/home/jkjk396/workspace/todo-list/dev-log/todo-list/docs/REFACTORING_REPORT.md`(존재) 또는 PR 설명에 기록한다. SC-006 충족.
- [X] T045 [P] 문서 동기화 — `/home/jkjk396/workspace/todo-list/dev-log/todo-list/CLAUDE.md`와 (존재하는 경우) `API_SPEC.md`에 Apple 신규 엔드포인트(`POST /auth/oauth/apple/callback`)와 환경 변수를 기록한다.
- [X] T046 Lint/Type/테스트 전체 그린 확인: `(cd /home/jkjk396/workspace/todo-list/dev-log/todo-list/backend && npm run lint && npx tsc --noEmit && npm test && npm run test:integration)` 및 `(cd /home/jkjk396/workspace/todo-list/dev-log/todo-list/frontend && npm run lint && npx tsc --noEmit && npm test)`.
- [X] T047 `AppleStrategy` Passport 파일 정리 — 실제로 사용되지 않는 `/home/jkjk396/workspace/todo-list/dev-log/todo-list/backend/src/auth/infrastructure/strategies/apple.strategy.ts`는 삭제하거나, 유지 시 WHY 주석으로 비활성 사유를 명시하고 Module에서 완전히 제외한다 (헌법 VI 단순성).
- [X] T048 Maestro E2E 전체 그린 확인: `maestro test /home/jkjk396/workspace/todo-list/dev-log/todo-list/.maestro/auth/login-apple.yml /home/jkjk396/workspace/todo-list/dev-log/todo-list/.maestro/auth/login-apple-relogin.yml /home/jkjk396/workspace/todo-list/dev-log/todo-list/.maestro/auth/login-apple-cancel.yml` 결과 캡처.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음, 즉시 시작 가능
- **Foundational (Phase 2)**: Setup 완료 후 시작 — **모든 사용자 스토리를 블로킹**
- **User Story 1/2/3 (Phase 3~5)**: Foundational 완료 후 개별 병렬 진행 가능
- **Polish (Phase 6)**: 모든 필요 사용자 스토리 완료 후

### User Story Dependencies

- **US1 (P1, 신규 첫 로그인)**: Foundational 이후 독립 시작 가능. MVP 범위.
- **US2 (P1, 재로그인)**: Foundational 이후 시작 가능. 기능적으로 US1과 독립이나 US1이 생성한 데이터로 통합 테스트를 진행하면 효율적.
- **US3 (P2, 실패 복구)**: Foundational 이후 시작 가능. US1/US2 테스트 하네스를 재사용하면 효율적이나 구현 자체는 독립.

### Within Each User Story

- TDD 필수: T004~T006, T010, T012, T016~T020, T027~T029, T033~T038은 각 단계 구현 전에 먼저 작성하여 실패 확인.
- Models/DTO → Services → Endpoints → Integration → E2E 순.

### Parallel Opportunities

- Setup [P]: T002, T003 병렬
- Foundational 테스트 [P]: T004, T005, T006, T010, T012, T015 병렬
- Foundational 구현 [P]: T007, T008 병렬. T009는 T008 이후. T011은 T007·T009 이후. T013은 T012 이후. T014는 T007/T008/T009 이후.
- US1 테스트 [P]: T016, T017, T018, T019, T020 병렬
- US2 테스트 [P]: T027, T028, T029 병렬
- US3 테스트 [P]: T033~T038 병렬
- Polish [P]: T043, T044, T045 병렬

---

## Parallel Example: User Story 1

```bash
# 실패 테스트 병렬 작성 (독립 파일)
Task: "DTO 단위 테스트 /backend/src/auth/application/dto/apple-form-post-callback.dto.spec.ts"
Task: "POST 콜백 해피패스 통합 테스트 /backend/test/integration/auth/apple-oauth.spec.ts"
Task: "user 필드 없는 첫 로그인 통합 테스트 /backend/test/integration/auth/apple-oauth.spec.ts"
Task: "LoginScreen Apple 버튼 유닛 테스트 /frontend/__tests__/screens/auth/LoginScreen.test.tsx"
Task: "Maestro 해피패스 /.maestro/auth/login-apple.yml"

# 이후 구현 병렬은 의존관계 상 제한적 — DTO 후 controller/route 구현, 그 뒤 프론트 testID 주입
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1(Setup) 완료 — 환경 변수와 config 키 매핑
2. Phase 2(Foundational) 완료 — Apple 인프라(client_secret, JWKS, id_token 검증, provider 분기, login usecase, 모듈 등록, i18n)
3. Phase 3(US1) 완료 — POST 콜백 엔드포인트, DTO, 프론트 testID, E2E 그린
4. **STOP & VALIDATE**: Apple 계정 하나로 첫 로그인 성공 + 홈 진입 검증
5. 배포/데모 가능

### Incremental Delivery

1. Setup + Foundational → 인프라 준비 완료
2. US1 → 단독 테스트 → 데모 (MVP)
3. US2 → 재로그인 테스트 → 데모 (재방문 UX 완성)
4. US3 → 실패 경로 테스트 → 데모 (복원력 완성)
5. Polish → 시크릿 스캔, 문서, 전역 lint/test 그린 → PR 제출

### Parallel Team Strategy

- Setup + Foundational은 공동 작업(코어 infra가 다 함께 필요)
- Foundational 완료 후:
  - 개발자 A: US1 (POST 콜백, DTO, 프론트 testID, Maestro happy)
  - 개발자 B: US2 (재로그인 통합 테스트, Maestro 재로그인, 구조화 로그)
  - 개발자 C: US3 (에러 경로 전반, Maestro 취소, i18n 에러 매핑)
- 마지막 Polish는 리뷰어 중심으로 수행

---

## Notes

- [P] 태스크 = 다른 파일, 의존성 없음
- 모든 구현 태스크 전에 해당 실패 테스트가 먼저 작성·실패 확인되어야 한다(헌법 III)
- 각 사용자 스토리는 체크포인트에서 독립적으로 검증 가능
- 민감 정보(`APPLE_PRIVATE_KEY`, `code`, `id_token`, `Authorization`) 값은 로그·응답·스냅샷에 절대 포함하지 않는다(SC-006)
- 모든 사용자 대상 메시지는 `ko/en/ja/es` 4개 locale에 일치하게 추가(FR-008)
- 신규 DB 스키마 없음 — 기존 `todolist_user_auth_oauth` 재사용
- `AppleStrategy` Passport 파일은 본 플로우에서 사용되지 않음 — Polish 단계에서 정리
