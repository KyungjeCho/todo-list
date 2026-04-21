# REST 계약 — Apple OAuth 2.0 엔드포인트

**Feature**: 011-apple-oauth-login
**Scope**: Apple 프로바이더 로그인 시작/콜백을 기존 OAuth 경로와 호환되도록 정의한다.
**Base URL**: `https://api.example.com` (환경별로 치환)

본 기능은 **신규 엔드포인트 1개**(POST form_post 콜백)만 추가하고, 기존 `GET /auth/oauth/:provider`는 `provider=apple`을 수용하도록 동작이 보강된다. 기존 `GET /auth/oauth/:provider/callback`은 Apple을 수신하지 않는다(Apple은 form_post로만 전달).

---

## 1. `GET /auth/oauth/apple`

사용자를 Apple 인증 페이지로 리다이렉트한다. 기존 `GET /auth/oauth/:provider` 엔드포인트를 그대로 사용하며, Apple에 한해 추가 쿼리 파라미터가 Apple 공식 요구 사항에 맞게 포함된다.

### Request (Query parameters)

| 이름          | 타입    | 필수 | 설명 |
| ------------- | ------- | ---- | ---- |
| `fcmToken`    | string  | 아니오 | FCM 푸시 토큰 (클라이언트에서 발급 실패 시 생략) |
| `deviceType`  | string  | 예   | `IOS` 또는 `ANDROID` |
| `redirectUri` | string  | 예   | 클라이언트 최종 redirect (`todolist://auth/callback` 등 allowlist에 등록된 URI) |
| `deviceName`  | string  | 아니오 | 디바이스 표시 이름 |
| `timezone`    | string  | 아니오 | IANA timezone |
| `language`    | string  | 아니오 | 지원 언어 코드(`ko`, `en`, `ja`, `es`) |

### Behavior

1. `provider` path param에 `apple`이 들어오면 기존 검증 로직 통과(이미 `VALID_PROVIDERS`에 포함).
2. `OAuthLoginUsecase.execute`가 Apple 전용 파라미터로 Apple Authorization URL을 생성:
   - `response_type=code`
   - `response_mode=form_post` (**Apple에 한해 추가**)
   - `scope=name email`
   - `client_id=${APPLE_CLIENT_ID}`
   - `redirect_uri=${APPLE_CALLBACK_URL}` (Apple에 등록된 https URL)
   - `state=<HMAC 서명 state>`
3. 응답 `302 Location` 헤더로 Apple Authorization URL을 반환.

### Responses

- `302 Found` — Apple Authorization URL로 리다이렉트.
- `400 Bad Request` — `INVALID_PROVIDER` (provider 미지원) 또는 redirect_uri allowlist 불일치 시 기본 URI fallback.

---

## 2. `POST /auth/oauth/apple/callback` (신규)

Apple 인증 완료 후 Apple 서버가 `response_mode=form_post`로 호출하는 콜백. body는 `application/x-www-form-urlencoded`.

### Request (form-urlencoded body)

| 이름      | 타입   | 필수 | 설명 |
| --------- | ------ | ---- | ---- |
| `code`    | string | 예   | 인가 코드. 길이 1~2048 |
| `state`   | string | 예   | 서버가 1단계에서 발급한 HMAC 서명 state |
| `user`    | string | 첫 로그인에만 | JSON 문자열. 예: `{"name":{"firstName":"길동","lastName":"홍"},"email":"..."}` |
| `id_token` | string | 아니오 | Apple이 추가 제공하는 경우가 있으나 본 엔드포인트는 code→token 교환 경로를 우선 사용하므로 무시 가능 |
| `error`   | string | 아니오 | Apple이 에러 응답을 전달한 경우(예: `user_cancelled_authorize`) — 본 엔드포인트는 에러 처리 후 redirect_uri로 오류 파라미터 전달 |

### Validation (DTO)

`class-validator` 기반 `AppleFormPostCallbackDto`:

- `code`: `@IsString()`, `@IsNotEmpty()`, `@MaxLength(2048)`
- `state`: `@IsString()`, `@IsNotEmpty()`
- `user`: `@IsOptional()`, `@IsString()`, `@MaxLength(4096)`

### Processing

1. `state` HMAC 서명 검증(기존 `OAuthLoginUsecase.verifyState`). 실패 시 `INVALID_STATE` / `INVALID_STATE_FORMAT`.
2. `deviceType` 검증(기존과 동일, `IOS`|`ANDROID`).
3. `OAuthProviderService.exchangeCodeForProfile('apple', code, state)` 호출 — Apple 분기는 내부적으로:
   1. `AppleClientSecretService.get()` 으로 ES256 서명된 client_secret JWT 획득.
   2. `https://appleid.apple.com/auth/token`에 `grant_type=authorization_code`, `code`, `client_id`, `client_secret=<JWT>`, `redirect_uri=${APPLE_CALLBACK_URL}` 전송.
   3. 응답의 `id_token`을 `AppleIdTokenVerifier.verify()`로 검증.
   4. `{ provider:"apple", providerUserId:claims.sub, providerUserEmail:claims.email ?? "", providerUserName:"" }` 반환.
4. body의 `user` JSON을 파싱 시도하여 이름 문자열 도출 → 있으면 `providerUserName`에 덮어쓰기(파싱 실패·빈 값이면 그대로 `""`).
5. 기존 `OAuthCallbackUsecase.execute()`에 전달. 신규/재로그인 분기, 토큰 발급, 세션 생성, FCM upsert 모두 동일.
6. 결과 `{accessToken, refreshToken, isNewUser}`를 redirect_uri fragment로 전달 → `302 Location: {redirectUri}#accessToken=...&refreshToken=...&isNewUser=...`.

### Responses

- `302 Found` — 성공. 클라이언트의 `WebBrowser.openAuthSessionAsync`가 redirect_uri를 감지하여 결과 파싱.
- `400 Bad Request`
  - `MISSING_AUTHORIZATION_CODE` — code 누락
  - `INVALID_STATE` / `INVALID_STATE_FORMAT` / `INVALID_DEVICE_TYPE` — state 검증 실패(기존과 동일)
  - `OAUTH_CODE_EXCHANGE_FAILED` — Apple 토큰 교환 비정상 응답 (기존 공통 코드 재사용)
  - `APPLE_CLIENT_SECRET_FAILED` — p8 private key 로딩/JWT 서명 실패(서버 구성 오류)
  - `APPLE_ID_TOKEN_INVALID` — id_token 서명/iss/aud/exp 검증 실패
  - `APPLE_FORM_POST_INVALID` — DTO 검증 실패
- `500 Internal Server Error` — `USER_NOT_FOUND_FOR_OAUTH` 등 기존 내부 오류(기존과 동일)

### 보안

- **Body 크기 제한**: Nest 기본 `bodyParser`가 form-urlencoded에 대해 크기 제한을 적용. 상한은 기존 설정 유지(추가 변경 없음).
- **state HMAC 서명**: 기존 로직 재사용. nonce + signature로 재생/위조 방어.
- **TLS**: Apple은 HTTPS redirect_uri만 수락. 배포 환경은 반드시 `APPLE_CALLBACK_URL`을 HTTPS로 구성.
- **로그**: `code`, `id_token`, `user` JSON, `Authorization`, `APPLE_PRIVATE_KEY` 값은 로그에 남기지 않는다. 구조화 로그에는 프로바이더·이벤트·에러 코드·userAuthId(성공 시)만 남긴다.

---

## 3. `GET /auth/oauth/apple/callback` — **Apple 수신 금지 경로**

기존 범용 GET 콜백 라우트는 그대로 유지되지만 Apple은 form_post를 사용하므로 이 경로로 Apple 트래픽이 들어오지 않아야 한다. Apple이 잘못 호출하는 경우에도:

- 기존 핸들러가 `code` 미존재 시 `MISSING_AUTHORIZATION_CODE`를 반환하므로 악성 조작 여지 없음.
- 방어적으로 `provider === 'apple'`일 때 `400 BadRequest('APPLE_MUST_USE_FORM_POST')`를 반환하도록 가드를 추가한다(운영 관측성 강화).

---

## 4. 내부 인터페이스 계약

### 4.1 `AppleClientSecretService`

```text
interface AppleClientSecretService {
  // ES256 서명된 client_secret JWT 반환. 캐시된 값이 유효하면 재사용.
  get(): Promise<string>
}
```

- 만료 임박(≤60초)이면 재발급. 실패 시 `APPLE_CLIENT_SECRET_FAILED`.

### 4.2 `AppleIdTokenVerifier`

```text
interface AppleIdTokenVerifier {
  verify(idToken: string): Promise<AppleIdTokenClaims>
}
```

- 검증 항목: 서명(Apple JWKS 기반), `iss`, `aud`, `exp`, `iat`. 실패 시 `APPLE_ID_TOKEN_INVALID`.

### 4.3 `AppleJwksService`

```text
interface AppleJwksService {
  // kid에 매칭되는 공개키를 반환. 캐시 미스/kid 미일치면 JWKS 재조회.
  getKey(kid: string): Promise<JsonWebKey>
}
```

- Apple JWKS URL: `https://appleid.apple.com/auth/keys`. 캐시 TTL 10분.

---

## 5. 호환성 및 롤백

- **호환성**: `OAuthProvider` 타입에 이미 `"apple"`이 포함되어 클라이언트 변경 없이 로그인 선택 가능.
- **롤백**: `APPLE_CLIENT_ID` 환경 변수를 비우면 `AuthModule.buildOAuthProviders`가 Apple 전략을 등록하지 않음. Apple 진입 시 `INVALID_PROVIDER` 400 반환되어 안전하게 비활성화.
