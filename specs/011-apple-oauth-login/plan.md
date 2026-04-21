# Implementation Plan: Apple OAuth 2.0 로그인 활성화

**Branch**: `011-apple-oauth-login` | **Date**: 2026-04-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-apple-oauth-login/spec.md`

## Summary

기존 OAuth 2.0(Google/Naver/Kakao)과 동일한 웹 기반 인증 세션 플로우에 Apple 프로바이더를 end-to-end로 활성화한다. 이미 존재하는 스캐폴딩(버튼, 상수, 설정 키 일부)을 실제 동작하는 Apple 연동으로 완성한다.

핵심 기술 접근:

- **Apple client_secret JWT 생성기**: Apple은 정적 client_secret이 아니라 `ES256`으로 서명된 JWT를 요구한다. `teamId`, `keyId`, `clientId`, `.p8` private key로부터 client_secret을 동적으로 생성하는 도메인 서비스를 추가한다.
- **id_token 기반 사용자 식별**: Apple 토큰 응답은 userinfo 엔드포인트가 없는 대신 `id_token`의 `sub`/`email` claim이 사용자 식별 원천이다. 기존 `OAuthProviderService`의 Apple 분기를 id_token 파싱/검증 기반으로 교체한다.
- **response_mode=form_post 콜백**: Apple은 `scope=name email` 시 콜백을 `application/x-www-form-urlencoded`로 POST 전송한다. 기존 GET 콜백을 유지하되 Apple 전용 `POST /auth/oauth/apple/callback` 엔드포인트를 추가하여 첫 로그인 이름/이메일을 수집한다.
- **기존 프로바이더 분리 원칙 유지**: `(provider, providerUserId)` 유니크만으로 식별하며 이메일 기반 자동 연결은 도입하지 않는다 (spec FR-013).
- **클라이언트는 기존 `WebBrowser.openAuthSessionAsync` 플로우 재사용** (spec FR-012). iOS 네이티브 시트는 도입하지 않는다.

데이터베이스 스키마 변경 없음. 신규 Apple 사용자는 `todolist_user_auth_oauth.provider = "apple"`로 기존 유니크 제약 하에 저장된다.

## Technical Context

**Language/Version**: TypeScript 5.9 (Frontend), TypeScript 5.7 (Backend) — strict, `any` 금지
**Primary Dependencies**:

- Backend: NestJS v11, `@nestjs/passport`, `passport`, `passport-google-oauth20`, `jsonwebtoken` (transitive via `@nestjs/jwt`), `class-validator`, TypeORM
- Frontend: React Native (Expo ~55), `expo-web-browser`, `expo-linking`, `i18next`, Zustand

**Storage**: Supabase (PostgreSQL) via TypeORM — `todolist_user_auth_oauth` 재사용, 스키마 변경 없음
**Testing**: Jest (unit/integration/e2e), Maestro MCP (Frontend E2E)
**Target Platform**: iOS/Android (React Native Expo), NestJS on AWS Lambda (serverless-express)
**Project Type**: Mobile + API (web application structure: backend + frontend)
**Performance Goals**: 인증 플로우 p95 < 3s (Apple 토큰 교환/검증 포함), 클라이언트 리다이렉트 왕복 포함 15초 내 성공 95% (SC-001)
**Constraints**:

- Apple 자격 증명(.p8 private key)은 환경 변수 또는 Secret Manager로만 주입, 리포지토리/빌드 산출물/로그 평문 노출 금지 (SC-006)
- 기존 OAuth CSRF 방어(HMAC state + nonce) 유지, Apple id_token 서명·iss·aud·exp 검증 필수
- `response_mode=form_post` POST 콜백은 CSRF 토큰(state) 검증을 GET 플로우와 동일하게 수행해야 함
- 세션/리프레시 토큰/FCM 디바이스 등록 로직은 기존 `OAuthCallbackUsecase`를 변경 없이 재사용

**Scale/Scope**: 신규 Apple 사용자 수용, 기존 OAuth 사용자 약 4종 프로바이더와 동등 수준. 신규 파일 ~6개(BE) + ~1개(FE 설정/i18n 반영), 수정 파일 ~5개

## Constitution Check

*GATE: Phase 0 이전 통과 필수. Phase 1 설계 이후 재평가.*

Constitution v1.3.0 기준, 각 원칙에 대한 초기 평가:

- **I. 한국어 우선**: plan/research/data-model/quickstart/contracts/tasks 모두 한국어로 작성. 코드 식별자는 영어 유지. ✅ PASS
- **II. 엄격 TypeScript**: 신규 `AppleClientSecretService`, `AppleIdTokenVerifier`, DTO(`AppleFormPostCallbackDto`)는 `any` 없이 타입 명시. POST 콜백 body는 `class-validator`로 런타임 검증. ✅ PASS
- **III. TDD NON-NEGOTIABLE**: Phase별 구현 전 실패 테스트 선행.
  - BE unit: client_secret JWT 생성기, id_token 검증기, provider 서비스 Apple 분기
  - BE integration: `GET /auth/oauth/apple` 리다이렉트, `POST /auth/oauth/apple/callback` 콜백
  - FE unit: `OAuthProviderButton` Apple 렌더링/탭, `useAuth.login('apple')` 분기
  - FE E2E (Maestro): `.maestro/auth/login-apple.yml`
  ✅ PASS
- **IV. 계층 분리**: 신규 서비스는 `backend/src/auth/infrastructure/apple/` 하위에 배치, controller → usecase(기존) → infrastructure 흐름 유지. ✅ PASS
- **V. 실패 처리와 관측성**: Apple 실패 사유 분류(사용자 취소, 토큰 교환 실패, id_token 검증 실패, 네트워크) → 구조화 로그 + 에러 코드(`APPLE_CLIENT_SECRET_FAILED`, `APPLE_ID_TOKEN_INVALID` 등). 클라이언트는 i18n 메시지로 표시. FR-015 관찰 지표 카운터 추가. ✅ PASS
- **VI. 단순성 우선**: 새 외부 라이브러리 도입 없음(`apple-signin-auth`/`passport-apple` 대신 이미 존재하는 `jsonwebtoken`/기존 `OAuthLoginUsecase` 재사용). 기존 `OAuthCallbackUsecase`는 변경 없이 재사용. Apple id_token 검증에 필요한 JWKS 캐시는 단순 in-memory + TTL로 구현. ✅ PASS
- **VII. 명세서 중심 개발**: spec.md에 결정 사항 명시, plan에서 구현 맥락 보강, 상위 문서(`API_SPEC.md` 등)가 존재할 경우 신규 엔드포인트 추가를 기록하도록 tasks에 동기화 작업 포함. ✅ PASS
- **VIII. 주석 전략**: Apple 프로토콜 특수성(client_secret JWT, form_post)은 WHY 중심 주석으로 명시. 코드 반복 주석 금지. ✅ PASS
- **IX. 브랜치 전략**: 현재 브랜치 `011-apple-oauth-login` (speckit scaffolding 기본), main으로 PR 필수. ✅ PASS
- **X. Maestro E2E**: Frontend 변경(로그인 화면 i18n·버튼 동작 검증) 시 `.maestro/auth/login-apple.yml` 작성, TDD 순서로 실패 → 통과. ✅ PASS

**결과**: 위반 없음. `Complexity Tracking` 비움.

### Post-Design Re-evaluation (Phase 1 완료 후)

- data-model은 DB 스키마를 변경하지 않고 기존 `todolist_user_auth_oauth`만 재사용 — 단순성(VI) 유지.
- contracts는 엔드포인트 1개 추가(POST form_post) — Apple 프로토콜 강제 요구로 불가피하며 계층 분리(IV)·관측성(V)에 부합.
- 신규 도메인 객체는 모두 infrastructure 계층 내부에 격리되어 application/usecase 계층 API 변경 없음 (IV).
- 신규 외부 의존성 0개(`jsonwebtoken` transitive) — 단순성(VI) 유지.
- TDD 매핑 및 Maestro E2E 시나리오 확정 — III, X 충족.
- 민감 정보 비노출 기준(SC-006) data-model §2.1/§2.2 및 contracts §2 보안 절에 명문화.
- 헌법 재평가: 모든 원칙 PASS. 추가 위반 없음.

## Project Structure

### Documentation (this feature)

```text
specs/011-apple-oauth-login/
├── spec.md              # 이미 존재 (/speckit.specify)
├── plan.md              # 본 파일 (/speckit.plan)
├── research.md          # Phase 0 산출물
├── data-model.md        # Phase 1 산출물
├── quickstart.md        # Phase 1 산출물
├── contracts/
│   └── auth-apple.md    # Phase 1 산출물 (REST 계약)
├── checklists/
│   └── requirements.md  # 이미 존재 (spec 검증)
└── tasks.md             # /speckit.tasks 단계에서 생성
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts               # [수정] POST /auth/oauth/apple/callback 추가
│   │   ├── auth.module.ts                   # [수정] Apple 서비스 provider 등록
│   │   ├── application/
│   │   │   ├── dto/
│   │   │   │   ├── oauth-callback.dto.ts    # [변경 없음]
│   │   │   │   └── apple-form-post-callback.dto.ts  # [신규] Apple POST body
│   │   │   ├── oauth-login.usecase.ts       # [수정] Apple scope/response_mode 파라미터 추가
│   │   │   └── oauth-callback.usecase.ts    # [변경 없음]
│   │   └── infrastructure/
│   │       ├── oauth-provider.service.ts    # [수정] Apple 분기를 id_token 기반으로 교체
│   │       └── apple/                       # [신규 디렉토리]
│   │           ├── apple-client-secret.service.ts   # ES256 JWT 생성
│   │           ├── apple-id-token-verifier.service.ts  # Apple JWKS 기반 id_token 검증
│   │           └── apple-jwks.service.ts    # JWKS 캐시 (TTL)
│   └── common/config/
│       └── configuration.ts                 # [수정] oauth.apple.callbackUrl / privateKey 환경 변수
├── test/
│   └── integration/auth/
│       ├── auth.controller.spec.ts          # [수정] Apple form_post 콜백 케이스
│       └── apple-oauth.spec.ts              # [신규] 통합 테스트
└── src/auth/**/__tests__/                   # [신규] 각 Apple 서비스 unit 테스트

frontend/
├── src/
│   ├── screens/auth/LoginScreen.tsx         # [변경 없음 — 버튼 이미 렌더링]
│   ├── features/auth/useAuth.ts             # [변경 없음 — provider 파라미터 재사용]
│   ├── services/api/authApi.ts              # [검증] getOAuthUrl이 provider='apple' 허용
│   ├── components/auth/OAuthProviderButton.tsx  # [변경 없음]
│   └── i18n/locales/*.json                  # [수정] auth.continueWithApple, 에러 메시지
└── __tests__/
    └── features/auth/                       # [신규] Apple 분기 unit 테스트

.maestro/
└── auth/
    └── login-apple.yml                      # [신규] Apple 로그인 E2E 플로우
```

**Structure Decision**: 기존 `backend/` + `frontend/` + `.maestro/` 구조(Web application + Mobile) 유지. 본 기능은 backend에 Apple 전용 infrastructure 서브 디렉토리 1개를 신설하고, frontend는 i18n과 E2E 시나리오만 추가한다. 신규 디렉토리/서브모듈은 Apple 프로토콜 특수성(`client_secret = JWT`, `id_token` 검증, JWKS)을 격리하기 위함이며, 다른 프로바이더 코드 경로에 영향을 주지 않는다.

## Complexity Tracking

*해당 없음 — Constitution Check 위반 없음.*
