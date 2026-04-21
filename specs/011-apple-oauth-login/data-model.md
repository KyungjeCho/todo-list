# Data Model — Apple OAuth 2.0 로그인 활성화

**Feature**: 011-apple-oauth-login
**Date**: 2026-04-20

## 개요

본 기능은 **데이터베이스 스키마를 변경하지 않는다**. 기존 `todolist_user_auth`, `todolist_user_auth_oauth`, `todolist_user_session`, `todolist_user`, `todolist_user_device` 테이블을 그대로 재사용하며, `provider` 컬럼에 새로운 리터럴 `"apple"`을 저장한다.

이 문서는 Apple 플로우에서 각 기존 엔티티가 어떤 값을 갖는지, 그리고 Apple 전용 **런타임 도메인 객체**(in-memory, DB 없음)의 형태를 명세한다.

## 1. 기존 영속 엔티티 (스키마 변경 없음)

### 1.1 `todolist_user_auth`

사용자 인증 주체. 프로바이더와 무관한 내부 사용자 인증 식별자.

- 본 기능에서 Apple 신규 로그인 시 `loginId = null`, `passwordHash = null`로 1건 생성.
- 기존 사용자 재로그인 시 레코드 재사용.

### 1.2 `todolist_user_auth_oauth` (핵심)

OAuth 프로바이더와 UserAuth의 연결.

| 필드                   | 타입         | Apple 값 예시                                  | 제약 |
| ---------------------- | ------------ | ---------------------------------------------- | ---- |
| `id`                   | uuid         | 자동 생성                                      | PK |
| `user_auth_id`         | uuid         | 해당 UserAuth 참조                             | FK |
| `provider`             | varchar(100) | `"apple"`                                      | (provider, providerUserId) UNIQUE |
| `provider_user_id`     | varchar(255) | Apple `id_token.sub` (예: `001234.abcdef...`) | UNIQUE와 함께 |
| `provider_user_email`  | varchar(255) | Apple `id_token.email` (릴레이 가능)           | 비어 있을 수 있음 |

**검증 규칙**:

- `provider = "apple"`은 유효한 리터럴(OAuthProvider 타입에 이미 존재).
- `provider_user_id`는 Apple Subject Identifier. 안정적 고유 식별자이며 변하지 않음. 255자 여유 이내.
- `provider_user_email`은 릴레이 주소(`@privaterelay.appleid.com`) 또는 실제 이메일 또는 빈 문자열. 빈 문자열은 DB 스키마 상 허용(`varchar(255)` non-null이지만 `""` 가능).

### 1.3 `todolist_user`

사용자 프로필(이름/타임존/언어 등).

- **신규 Apple 로그인**: `user_auth_id`, `user_name`(Apple 이름 → fallback: email local-part → `user_{timestamp}`), `timezone`, `language` 저장.
- **재로그인**: 변경 없음(기존 레코드 조회만).

**검증 규칙 (FR-006)**:

- Apple 2회차 이후 로그인에서 `providerUserName = ""`로 수신되더라도, `OAuthCallbackUsecase`의 기존 로직이 신규 유저 분기(`existingOauth`가 없는 경우)에서만 `user` 생성하므로, 기존 사용자의 이름을 절대 덮어쓰지 않는다.

### 1.4 `todolist_user_session`

리프레시 토큰 세션.

- Apple 로그인도 동일 세션 모델 사용. `refreshToken` 해시, `userAgent`, `ipAddress`, `expiredAt` 저장.
- 본 기능은 변경 없음.

### 1.5 `todolist_user_device`

FCM 푸시 디바이스.

- Apple 로그인 시 클라이언트가 `fcmToken`을 함께 전달하면 기존과 동일하게 upsert. 본 기능은 변경 없음.

## 2. 신규 런타임 도메인 객체 (영속 없음)

### 2.1 `AppleClientSecret`

생성된 Apple `client_secret` JWT의 메모리 상 표현.

| 필드             | 타입     | 설명 |
| ---------------- | -------- | ---- |
| `token`          | string   | 서명된 JWT 문자열 |
| `issuedAt`       | Date     | `iat` 클레임 시각 |
| `expiresAt`      | Date     | `exp` 클레임 시각(`iat + 55분`) |

**유효성 규칙**:

- `expiresAt - now > 60초`이면 캐시 재사용, 그 외에는 재생성.
- 로그/응답에 `token` 값을 절대 포함하지 않는다.

### 2.2 `AppleIdTokenClaims`

Apple id_token JWT에서 검증·추출한 클레임.

| 필드             | 타입     | 출처                | 설명 |
| ---------------- | -------- | ------------------- | ---- |
| `sub`            | string   | id_token `sub`       | Apple Subject Identifier, 고유·불변 |
| `email`          | string?  | id_token `email`     | 릴레이 이메일 가능, 없을 수 있음 |
| `emailVerified`  | boolean? | id_token `email_verified` (`"true"` → true) | 로그 기록용, 차단 조건 아님 |
| `isPrivateEmail` | boolean? | id_token `is_private_email` (`"true"` → true) | 릴레이 여부 플래그, 로그 기록용 |
| `iss`            | string   | id_token `iss`       | `https://appleid.apple.com` 고정 |
| `aud`            | string   | id_token `aud`       | `APPLE_CLIENT_ID`와 일치해야 함 |
| `exp`            | number   | id_token `exp`       | 현재 시각보다 커야 함 |
| `iat`            | number   | id_token `iat`       | 현재 시각보다 작거나 같아야 함 |

**검증 규칙**:

- `iss === "https://appleid.apple.com"` (정확히 일치)
- `aud === configService.get("oauth.apple.clientId")`
- `exp` 이후 사용 금지(clock skew 60초 허용)
- 서명: Apple JWKS에서 헤더 `kid` 일치 공개키로 `ES256`/`RS256` 검증. (Apple은 현재 `RS256` 발급이지만 변경 가능성 대비 Apple이 JWKS에 공표하는 alg 기준으로 검증.)
- 검증 실패 시 `APPLE_ID_TOKEN_INVALID` BadRequest.

### 2.3 `AppleFormPostCallbackBody`

`POST /auth/oauth/apple/callback` 수신 body(class-validator 기반 DTO).

| 필드    | 타입     | 필수 | 검증 규칙 |
| ------- | -------- | ---- | ---------- |
| `code`  | string   | 예   | 비어 있지 않음, 길이 2048 이하 |
| `state` | string   | 예   | 비어 있지 않음, 기존 HMAC 서명 검증 |
| `user`  | string?  | 첫 로그인 시에만 | JSON string. 파싱 실패 시 무시(로그인은 계속) |
| `id_token` | string? | Apple이 form_post에 동봉하는 경우가 있으나 스펙상 code→토큰교환을 우선 사용. 수신해도 무시. |

**파싱 규칙 (`user` 필드)**:

- Apple이 전달하는 JSON 예: `{"name":{"firstName":"길동","lastName":"홍"},"email":"..."}`
- 변환: `providerUserName = (firstName + " " + lastName).trim()`
  - 비어 있으면 email local-part fallback, 그것도 없으면 `user_{timestamp}` (기존 `OAuthCallbackUsecase`의 fallback 재사용).
- 파싱 예외 시: `providerUserName = ""`로 `OAuthCallbackUsecase` 호출 → 기존 fallback 체인 적용.

### 2.4 `AppleJwksCacheEntry`

Apple JWKS 공개키 캐시 엔트리.

| 필드       | 타입                      | 설명 |
| ---------- | ------------------------- | ---- |
| `keys`     | `Array<{kid, kty, n, e, alg, use}>` | Apple JWKS endpoint 응답 원본 |
| `fetchedAt` | Date                     | 캐시 저장 시각, TTL 계산에 사용 |

**규칙**:

- 기본 TTL 10분.
- id_token 검증 중 `kid` 미일치 시: TTL 경과 여부 무관하게 1회 강제 재조회 후 재검증. 재조회에서도 미일치면 `APPLE_ID_TOKEN_INVALID`.

## 3. 상태 전이 (신규 Apple 로그인)

```text
[Unauthenticated]
   ↓ (GET /auth/oauth/apple)
[Redirected to Apple]
   ↓ (사용자 인증 완료)
[Apple → POST /auth/oauth/apple/callback (form_post)]
   ↓ state 검증 → code 토큰 교환 → id_token 검증
[UserAuth 신규 생성] ────→ [UserOauth 신규 생성] ────→ [User 신규 생성] ────→ [Session 생성] ────→ [FCM Device upsert (옵션)]
   ↓
[302 Redirect → redirect_uri#accessToken=...&refreshToken=...&isNewUser=true]
   ↓
[Client: WebBrowser → fragment 파싱 → authStore 저장 → 홈 화면]
```

## 4. 상태 전이 (기존 Apple 사용자 재로그인)

```text
[Apple → POST /auth/oauth/apple/callback]
   ↓ state 검증 → code 토큰 교환 → id_token 검증
[findOauthByProvider('apple', sub) 조회] → existingOauth 발견
   ↓
[User/UserAuth 조회만, 새로 생성하지 않음]
   ↓
[Session 생성 (신규)] → [FCM upsert (옵션)]
   ↓
[302 Redirect → redirect_uri#accessToken=...&refreshToken=...&isNewUser=false]
```

## 5. 데이터 일관성/불변식

- **UNI-1**: `(provider, providerUserId)`는 전역 유니크. 같은 Apple `sub`으로 중복 UserOauth 생성 불가.
- **INV-1**: Apple 로그인이 성공했다면 `provider_user_id`는 반드시 공백이 아닌 문자열(Apple이 `sub`를 보장).
- **INV-2**: Apple 이메일이 릴레이든 실제든 `provider_user_email` 컬럼에 저장되며, 본 기능에서 추가 가공(도메인 변환 등) 하지 않는다.
- **INV-3**: 기존 사용자의 `user.user_name`은 Apple 2회차 이후 로그인에서 절대 덮어쓰이지 않는다(`OAuthCallbackUsecase`는 existingOauth 분기에서 user.update를 수행하지 않음).
