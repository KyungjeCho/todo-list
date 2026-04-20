# Phase 0 연구 노트 — Apple OAuth 2.0 활성화

**Feature**: 011-apple-oauth-login
**Date**: 2026-04-20
**Related**: [spec.md](./spec.md), [plan.md](./plan.md)

본 문서는 Apple 프로바이더 end-to-end 활성화를 위해 확정해야 하는 기술적 의사결정과 기존 코드와의 간극을 정리한다. 모든 의사결정은 constitution 원칙(특히 VI 단순성, V 관측성, III TDD)과 spec 결정 사항(FR-012 웹 인증 세션, FR-013 별도 계정 분리)을 상위 규범으로 삼는다.

---

## 결정 1 — Apple `client_secret` 생성 방식

- **Decision**: `client_secret`을 서버 시작 시점 또는 요청 시점에 `ES256` 알고리즘으로 서명된 JWT로 동적 생성한다. 클레임은 Apple 공식 스펙을 따른다.
  - `iss` = `APPLE_TEAM_ID`
  - `sub` = `APPLE_CLIENT_ID` (Services ID)
  - `aud` = `https://appleid.apple.com`
  - `iat` = 현재 시각, `exp` = `iat + 60분` 이내(최대 6개월이지만 단축 유지)
  - 헤더 `kid` = `APPLE_KEY_ID`, `alg` = `ES256`
- **Rationale**: Apple은 정적 `client_secret`을 허용하지 않는다. 공식 문서 기준 ES256 JWT만 수락된다. 기존 `OAuthProviderService.exchangeCode`가 `oauth.apple.clientSecret`을 읽어 form body에 포함하므로, 이 값을 "JWT 생성 서비스가 발급한 문자열"로 치환하면 다른 프로바이더 분기를 건드리지 않는다.
- **Implementation notes**:
  - 이미 의존성에 존재하는 `jsonwebtoken`(Nest `@nestjs/jwt`의 transitive dep)으로 직접 서명한다. 신규 외부 라이브러리 도입 금지(헌법 VI).
  - `.p8` private key는 환경 변수 `APPLE_PRIVATE_KEY`(줄바꿈 `\n` 이스케이프 처리된 단일 문자열) 또는 `APPLE_PRIVATE_KEY_PATH`로 주입. 로컬 개발은 path, 서버리스 배포는 env로 일원화.
  - 생성된 client_secret은 만료 전까지 in-memory로 캐시(TTL 55분)하여 매 요청마다 서명 비용을 줄인다.
  - 로그에는 kid/teamId/clientId 해시만 남기고 private key나 JWT 자체는 절대 출력하지 않는다(SC-006).
- **Alternatives considered**:
  - `apple-signin-auth` npm 라이브러리 — 기능이 풍부하지만 우리가 필요한 건 서명+검증뿐. 의존성 증가 대비 효용 낮음.
  - `passport-apple` — Apple 전용 Passport 전략. 기존 Google Passport Strategy가 실제로 활용되지 않고 redirect URL 빌드를 `OAuthLoginUsecase`가 직접 수행하는 구조와 어긋남. 일관성/단순성 원칙상 기각.
  - 정적 client_secret — Apple이 수락하지 않음. 기각.

---

## 결정 2 — 사용자 식별 원천 (access_token vs id_token)

- **Decision**: Apple 토큰 응답의 `id_token`을 **유일한 사용자 식별 원천**으로 사용한다. `access_token`은 Apple의 userinfo 엔드포인트에서 쓰이지 않으므로 폐기한다. Apple은 `https://appleid.apple.com/auth/userinfo` 같은 엔드포인트를 공식 제공하지 않는다.
- **Rationale**: Apple OAuth의 `id_token`은 JWT로 `sub`(Subject Identifier, 안정 고유 식별자)과 `email`(있을 경우)을 포함한다. 현재 `oauth-provider.service.ts`의 Apple 분기는 존재하지 않는 userinfo URL(`https://appleid.apple.com/auth/userinfo`)을 호출하도록 작성되어 있어 런타임에 실패한다. 이는 "스캐폴딩만 있고 동작하지 않음"의 직접 원인이다.
- **Implementation notes**:
  - id_token 서명 검증 필수: Apple JWKS(`https://appleid.apple.com/auth/keys`)에서 `kid` 일치 공개키를 가져와 `ES256` 검증.
  - 검증 항목: `iss = https://appleid.apple.com`, `aud = APPLE_CLIENT_ID`, `exp > now`, `nbf <= now`(존재 시), 서명 유효.
  - JWKS는 in-memory 캐시 + TTL(기본 10분, 검증 실패 시 즉시 강제 갱신 1회) 구조로 구현. Apple은 JWKS를 자주 변경하지 않지만 kid 롤오버 대비.
  - `OAuthProviderService`의 Apple 분기는 (a) 토큰 교환 후 id_token 추출 → (b) 검증 → (c) `{ provider, providerUserId=sub, providerUserEmail=email, providerUserName='' }` 반환으로 단순화한다.
- **Alternatives considered**:
  - 현재 코드처럼 access_token 기반 userinfo 호출 — Apple에 해당 엔드포인트 없음, 항상 실패. 기각.
  - id_token의 `email_verified` 클레임 검증 — Apple은 `email_verified: "true"` 문자열을 돌려줌. 기본적으로 참으로 간주하되 로깅만 수행. 인증에 블로킹하지 않음(Apple 인증 자체가 이메일 확인을 보장).

---

## 결정 3 — 콜백 응답 모드와 이름(name) 수집

- **Decision**: Apple 전용 콜백을 `response_mode=form_post`로 설정하고, 신규 엔드포인트 `POST /auth/oauth/apple/callback`을 추가한다. 기존 GET 콜백(`/auth/oauth/:provider/callback`)은 다른 프로바이더용으로 유지하여 코드 경로를 격리한다.
- **Rationale**: Apple은 `scope=name email` 요청 시 첫 로그인에서 사용자 이름을 **form body의 별도 `user` 필드**(JSON 문자열)로만 전달한다. id_token에는 이름이 포함되지 않는다. `response_mode=query`(GET)를 쓰면 Apple이 `user` 필드를 URL에 실으면서 브라우저 히스토리/서버 액세스 로그 노출 위험이 생겨 Apple 공식 가이드도 form_post를 권장한다. spec FR-004(첫 로그인 이름 저장)를 충족하려면 form_post가 필요하다.
- **Implementation notes**:
  - 신규 엔드포인트는 `application/x-www-form-urlencoded` body를 수신: `code`, `state`, 첫 로그인에만 `user` (JSON string, 예: `{"name":{"firstName":"길동","lastName":"홍"},"email":"..."}`)
  - Nest의 `@Body()` + `class-validator` `AppleFormPostCallbackDto`로 검증. `user` 필드 파싱은 try/catch로 감싸고 실패해도 로그인은 진행(이름 없이 email local-part fallback).
  - state 검증은 기존 GET 콜백과 동일 로직(`OAuthLoginUsecase.verifyState`) 재사용 — DRY.
  - 응답은 기존 GET 콜백과 동일하게 클라이언트 redirect_uri에 `#accessToken=...&refreshToken=...&isNewUser=...` 프래그먼트로 전달(Spec 일관성).
  - Apple 2회차 이후 로그인은 `user` 필드를 포함하지 않음. 이 경우 `OAuthCallbackUsecase`에서 기존 사용자 분기로 진입하므로 이름이 빈 값으로 덮어써지지 않는다(이미 `findOauthByProvider → existingOauth` 경로에서 user 레코드를 새로 만들지 않음). FR-006 충족.
- **Alternatives considered**:
  - `response_mode=query`로 통일, `scope=email`만 요청하여 이름 포기 — spec FR-004 위반. 기각.
  - 범용 GET 콜백에 Apple만 POST로 들어오도록 한 핸들러로 통합 — Nest에서 `@Get()`과 `@Post()`를 같은 경로에 등록할 수는 있으나, body 검증 로직이 프로바이더별로 갈라져 가독성이 떨어짐. `@All()` 대신 두 핸들러 분리 + 공통 헬퍼 추출로 균형 잡음.
  - Apple 콜백에서 POST를 받아 서버 측 302 redirect로 클라이언트에 전달 — 브라우저는 POST 응답의 302에 대해 본래 요청을 GET으로 다시 보내므로 표준적 흐름. 즉, 기존 `WebBrowser.openAuthSessionAsync`가 최종 redirect_uri를 포착하는 방식과 호환. 채택.

---

## 결정 4 — 플랫폼별 인증 진입 방식(spec 확정 반영)

- **Decision**: iOS/Android 모두 기존 `WebBrowser.openAuthSessionAsync`(ASWebAuthenticationSession / Custom Tabs) 플로우를 재사용한다. iOS 네이티브 `AuthenticationServices`(Sign in with Apple 시트)는 본 기능 범위에서 사용하지 않는다.
- **Rationale**: spec FR-012에서 확정. 기존 프로바이더와 동일 UX로 구현 비용/플랫폼 분기 최소화. Apple App Store 심사 시 "Sign in with Apple을 제공"이라는 요구는 본 기능으로 충족되나, Apple Human Interface Guidelines는 네이티브 시트를 권장하므로 향후 심사 반려 발생 시 후속 기능으로 네이티브 통합을 고려한다.
- **Implementation notes**:
  - `useAuth.login('apple')`은 기존 코드 경로를 그대로 사용. redirect_uri는 `Linking.createURL('auth/callback')` 그대로 전달.
  - Apple은 **https** redirect_uri만 수락한다. `todolist://...` 같은 custom scheme은 Apple 콘솔이 거부한다. 따라서 서버가 발급/수신하는 redirect는 `https://api.example.com/auth/oauth/apple/callback`(backend)이며, backend가 최종 302로 `todolist://auth/callback#...`로 리다이렉트한다. 이 왕복은 다른 프로바이더와 동일 패턴(GET 콜백 플로우)과 동형이라 클라이언트 변경 불필요.
- **Alternatives considered**:
  - iOS 네이티브 Sign in with Apple — 기각(spec 확정).
  - PKCE 추가 — Apple은 2024년 기준 PKCE를 요구하지 않으며 state+HMAC+nonce로 CSRF/재생 방어 충분. 단순성 원칙상 기각.

---

## 결정 5 — 이메일 중복 시 계정 정책(spec 확정 반영)

- **Decision**: `(provider, providerUserId)` 유니크만으로 계정을 식별한다. 이메일이 기존 Google/Naver/Kakao 계정과 같더라도 자동 연결하지 않는다. 계정 연결 UI는 본 범위 외.
- **Rationale**: spec FR-013에서 확정. 현재 DB 유니크 제약(`ux_userAuthOauth_provider_providerUserId`)과 정확히 일치한다. 보안적으로도 타 프로바이더 이메일 위조에 의한 계정 탈취 위험을 원천 차단한다.
- **Implementation notes**:
  - `OAuthCallbackUsecase`는 변경 없이 재사용. 기존 로직이 이미 provider+providerUserId로 조회 후 없으면 신규 UserAuth/UserOauth/User를 생성한다.
  - 동일 사람이 Apple 계정을 별도로 가진다는 전제하에 데이터 이관/통합은 사용자에게 안내. (후속 기능으로 분리.)
- **Alternatives considered**:
  - 이메일 기반 자동 연결 — 기각(spec 확정).
  - 관리자 도구로 수동 연결 — 현재 범위 외.

---

## 결정 6 — 관찰성·실패 분류

- **Decision**: Apple 로그인 경로에 구조화 로그 및 에러 코드 체계를 기존 관례와 동일하게 추가한다. FR-015 관측 요건을 충족한다.
  - 에러 코드(문자열):
    - `APPLE_CLIENT_SECRET_FAILED` — p8 private key 로딩/JWT 서명 실패
    - `APPLE_TOKEN_EXCHANGE_FAILED` — token 엔드포인트 non-2xx 또는 id_token 누락
    - `APPLE_ID_TOKEN_INVALID` — 서명/iss/aud/exp 검증 실패 또는 JWKS 매칭 실패
    - `APPLE_FORM_POST_INVALID` — 콜백 body 검증 실패(state 제외, state는 기존 `INVALID_STATE`)
  - 로그 필드: `provider=apple`, `event`(`login_start|token_exchange|id_token_verify|callback_success`), `isNewUser`, `userAuthId`(성공 시), `error_code`(실패 시), request_id.
  - Apple 로그인 시도/성공/실패 지표는 기존 로그 구조를 파싱하는 상위 관찰 시스템에서 집계(본 기능은 구조화 로그만 보장).
- **Rationale**: 헌법 V(실패 처리와 관측성). 현존 프로바이더 에러 코드 패턴(`OAUTH_CODE_EXCHANGE_FAILED`, `OAUTH_PROFILE_FETCH_FAILED`)과 네이밍/레이어를 맞춘다.
- **Alternatives considered**: OpenTelemetry 커스텀 카운터 직접 삽입 — 본 프로젝트 관찰 인프라 기준을 넘어서는 과설계. 기각.

---

## 결정 7 — 테스트 전략 (TDD 매핑)

- **Decision**: 모든 신규 로직은 실패 테스트 선행. 계층별 테스트 책임을 명확히 분리한다.

| 계층                                  | 테스트 유형         | 커버 범위                                                                        |
| ------------------------------------- | ------------------- | -------------------------------------------------------------------------------- |
| `AppleClientSecretService`            | Unit (Jest)         | ES256 서명 JWT 헤더·클레임·만료·kid 포함, 캐시 재사용, 만료 시 재발급            |
| `AppleIdTokenVerifier`                | Unit (Jest)         | 유효 서명 통과, iss/aud/exp 위반 각각 거부, kid 미일치 시 JWKS 재조회 후 거부    |
| `AppleJwksService`                    | Unit (Jest)         | JWKS 캐시 TTL, 강제 갱신, 네트워크 실패 시 사용자 에러 매핑                      |
| `OAuthProviderService` Apple 분기     | Unit (Jest)         | id_token 기반 profile 반환, userinfo 호출 미발생                                 |
| `AuthController` Apple callback       | Integration (Nest)  | POST form_post 수락, state 검증, 응답 fragment 포맷, GET 콜백은 타 프로바이더 전용 |
| `OAuthLoginUsecase` Apple scope       | Unit (Jest)         | Apple에 한해 `response_mode=form_post` 파라미터 주입 확인                        |
| Frontend `useAuth.login('apple')`     | Unit (Jest/RTL)     | provider='apple' 경로가 기존 getOAuthUrl/redirect 처리                           |
| `LoginScreen` Apple 버튼              | Unit/snapshot       | i18n key `auth.continueWithApple` 존재, `onPress` 호출 시 login('apple')         |
| E2E Maestro                           | `.maestro/auth/login-apple.yml` | 로그인 화면 → Apple 버튼 탭 → 모의 성공 콜백 → 홈 진입 검증        |

- **Rationale**: 헌법 III(TDD NON-NEGOTIABLE) + X(Maestro E2E). Apple 라이브 API를 테스트에서 호출하지 않도록 토큰 엔드포인트·JWKS는 `fetch` 모킹으로 고립.
- **Alternatives considered**: Apple 라이브 스테이징 계정으로 통합 테스트 — Apple은 headless 자동화가 제한되어 CI 불가. 기각.

---

## 결정 8 — 환경 변수 및 Secret 관리

- **Decision**: 신규/정정 환경 변수:
  - `APPLE_CLIENT_ID` (기존, Services ID)
  - `APPLE_TEAM_ID` (기존)
  - `APPLE_KEY_ID` (기존)
  - `APPLE_PRIVATE_KEY` (**신규**, `.p8` PEM 본문을 `\n` 이스케이프한 단일 문자열)
  - `APPLE_PRIVATE_KEY_PATH` (기존 — 로컬 개발 전용)
  - `APPLE_CALLBACK_URL` (**신규**, 예: `https://api.example.com/auth/oauth/apple/callback`)
- **Rationale**: `OAuthLoginUsecase`는 `oauth.${provider}.callbackUrl`을 참조하지만 Apple 키가 config에 누락되어 있다. 신규 키를 추가하고 `configuration.ts`에 매핑. `APPLE_PRIVATE_KEY` 또는 `APPLE_PRIVATE_KEY_PATH` 중 정확히 하나가 설정되어야 하며, 부팅 시 검증.
- **Secret 주입 원칙**: private key는 리포지토리·로그·빌드 산출물에 평문으로 포함 금지(SC-006). 개발 환경은 `.env.local`(git ignore), 배포 환경은 AWS Secrets Manager/SSM 등 외부 비밀 관리 서비스를 통해 주입.

---

## 해소된 NEEDS CLARIFICATION

spec.md의 초기 2개 마커는 모두 spec 단계(2026-04-20)에서 해소되었으며, Phase 0 연구에서 추가로 발견된 모호점은 없다.

- FR-012 (iOS 구현 방식) → **웹 기반 인증 세션** (결정 4)
- FR-013 (이메일 중복 계정 정책) → **항상 별도 계정** (결정 5)

## Phase 0 결과 요약

| 영역              | 결과 |
| ----------------- | ---- |
| Unresolved 마커   | 0건 |
| 신규 외부 의존성  | 0개 (`jsonwebtoken`은 transitive 존재) |
| DB 스키마 변경    | 없음 |
| 신규 엔드포인트   | 1개 (`POST /auth/oauth/apple/callback`) |
| 환경 변수 추가    | 2개 (`APPLE_PRIVATE_KEY`, `APPLE_CALLBACK_URL`) |
| 헌법 위반         | 없음 |

Phase 1 설계 단계로 진행 가능.
