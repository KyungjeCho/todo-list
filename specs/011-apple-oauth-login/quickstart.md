# Quickstart — Apple OAuth 2.0 로그인 활성화

**Feature**: 011-apple-oauth-login
**Audience**: 본 기능 구현자(백엔드·프론트엔드), 코드 리뷰어, QA

본 문서는 로컬 개발 환경에서 Apple 로그인 플로우를 end-to-end로 검증하기 위해 필요한 최소한의 준비 절차와 수동/자동 테스트 시나리오를 정리한다.

---

## 1. 사전 준비

### 1.1 Apple Developer 자격 증명

1. Apple Developer 콘솔에서 다음 리소스를 확보한다.
   - **App ID** (Bundle Identifier): iOS 앱용. Sign in with Apple capability 활성화.
   - **Services ID**: 서버(웹) 플로우에서 `client_id`로 사용. 본 프로젝트가 서버 OAuth 플로우이므로 필수.
   - **Return URL**(웹 도메인): `APPLE_CALLBACK_URL`과 정확히 일치해야 한다. 예: `https://api.example.com/auth/oauth/apple/callback`.
   - **Sign in with Apple Key**: `.p8` 파일 다운로드. `APPLE_KEY_ID`(10자)와 `APPLE_TEAM_ID`(10자) 확보.
2. Apple은 **https** Return URL만 수락한다. 로컬 개발 시 터널(예: Cloudflare Tunnel, ngrok 등)로 https URL을 확보하거나, 통합 테스트에서는 Apple 토큰 엔드포인트를 모킹한다.

### 1.2 환경 변수 (`.env.local` 혹은 배포 Secret)

```bash
# Apple OAuth
APPLE_CLIENT_ID=com.example.todolist.service        # Services ID
APPLE_TEAM_ID=ABCDE12345                            # 10자 Team ID
APPLE_KEY_ID=XYZAB67890                             # 10자 Key ID
APPLE_PRIVATE_KEY_PATH=/absolute/path/to/AuthKey_XYZAB67890.p8   # 로컬 전용
# 또는 아래 한 줄(줄바꿈은 \n으로 이스케이프) — 배포 전용
# APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIG...\n-----END PRIVATE KEY-----\n"
APPLE_CALLBACK_URL=https://api.example.com/auth/oauth/apple/callback
```

- `APPLE_PRIVATE_KEY_PATH`와 `APPLE_PRIVATE_KEY`는 둘 중 **정확히 하나**만 설정. 둘 다 비어 있으면 부팅 시 `APPLE_CLIENT_SECRET_FAILED` 조기 실패 로그를 출력하고 Apple 전략을 등록하지 않는다.
- `APPLE_CLIENT_ID`가 비어 있으면 `AuthModule.buildOAuthProviders`가 Apple을 비활성화한다(기존 동작 유지).

### 1.3 추가 allowed redirect URI

- 클라이언트 deep link(`todolist://auth/callback`)는 이미 기본 allowlist에 포함.
- Apple Return URL(`APPLE_CALLBACK_URL`)은 서버 내부 처리용이며 클라이언트 `redirectUri`에 올라가지 않음. 별도 설정 불필요.

---

## 2. 로컬 개발 플로우

### 2.1 Backend 기동

```bash
cd backend
npm install
npm run start:dev
```

로그에서 다음 메시지를 확인한다.

- `AuthModule`이 Apple 전략을 등록했는지: `APPLE_CLIENT_ID not set — Apple OAuth disabled`가 **출력되지 않아야** 정상.
- `AppleClientSecretService`가 초기 JWT 발급에 성공했는지(선택적 부팅 로그).

### 2.2 Frontend 기동 (Expo)

```bash
cd frontend
npm install
npx expo start
```

로그인 화면에서 "Apple로 계속하기" 버튼이 노출되고, 탭 시 `WebBrowser.openAuthSessionAsync`가 열리며 `redirect_uri`에 `todolist://auth/callback`이 포함된 Apple 인증 URL로 이동하는지 확인한다.

### 2.3 수동 검증 시나리오 (Happy Path)

1. 로그인 화면 → "Apple로 계속하기" 탭.
2. 브라우저 시트에서 Apple ID 입력 → 첫 로그인일 경우 이름/이메일 공유 옵션을 선택.
3. 인증 완료 시 자동으로 앱으로 복귀.
4. 홈 화면 진입, 프로필에 이름과 이메일(릴레이 가능) 노출.

**검증 포인트**:

- DB `todolist_user_auth_oauth`에 `provider='apple'`, `provider_user_id`는 `00....` 형태의 Apple sub.
- `todolist_user.user_name`이 Apple이 제공한 이름 또는 email local-part.
- `Set-Cookie`/응답에 토큰이 평문으로 남지 않음(redirect_uri fragment 전달).

### 2.4 재로그인 시나리오

1. 앱 로그아웃 → 다시 "Apple로 계속하기".
2. Apple 시트가 바로 "계속하기"만 표시하는 단축 플로우.
3. 기존 사용자로 복귀, 기존 할일 데이터 유지 확인.

**검증 포인트**:

- DB에 UserAuth/UserOauth/User가 새로 생성되지 않음.
- 기존 `user_name`이 빈 문자열로 덮어써지지 않음.
- 신규 세션 1건 추가.

### 2.5 실패 경로 수동 테스트

- Apple 시트에서 "취소" 선택 → 앱이 로그인 화면으로 복귀, 다른 프로바이더 버튼 재활성화.
- 서버에서 `APPLE_PRIVATE_KEY_PATH`를 의도적으로 잘못 지정하여 시작 → 토큰 교환 시 `APPLE_CLIENT_SECRET_FAILED` 로그, 클라이언트에 다국어 오류 메시지 표시.
- 서버에서 `APPLE_CLIENT_ID`를 의도적으로 Apple Services ID와 다른 값으로 설정 → id_token 검증에서 `APPLE_ID_TOKEN_INVALID` 로그.

---

## 3. 자동 테스트 실행

### 3.1 Unit & Integration

```bash
cd backend
npm run lint
npm test -- --testPathPatterns="auth"        # 전체 auth 범위
npm run test:integration                      # 통합 테스트(신규 Apple form_post 포함)
```

기대 결과:

- `apple-client-secret.service.spec.ts` — JWT 헤더/클레임/캐시 동작
- `apple-id-token-verifier.service.spec.ts` — 유효·무효 케이스
- `apple-jwks.service.spec.ts` — 캐시 TTL, 강제 재조회
- `oauth-provider.service.spec.ts` — Apple 분기 id_token 기반 검증
- `auth.controller.spec.ts` / `apple-oauth.spec.ts` — POST form_post 콜백 성공/실패 케이스

```bash
cd frontend
npm run lint
npm test -- useAuth
npm test -- LoginScreen
```

### 3.2 E2E (Maestro)

```bash
# 에뮬레이터/디바이스 준비 후
maestro test .maestro/auth/login-apple.yml
```

기대 플로우:

1. 앱 실행(clearState) → 로그인 화면 진입.
2. `testID="oauth-button-apple"` 탭.
3. (모킹된 WebBrowser 결과 또는 테스트 전용 딥링크) → 홈 화면의 `testID="home-screen"` 노출 확인.

---

## 4. 관찰성/로그 확인 포인트

- 서버 구조화 로그에서 다음 이벤트 키를 검색할 수 있어야 한다: `provider=apple` 이벤트 중 `login_start`, `token_exchange`, `id_token_verify`, `callback_success`.
- 실패 시 `error_code` 키가 다음 중 하나로 분류되어야 한다: `APPLE_CLIENT_SECRET_FAILED`, `APPLE_TOKEN_EXCHANGE_FAILED`, `APPLE_ID_TOKEN_INVALID`, `APPLE_FORM_POST_INVALID`, `INVALID_STATE`, `OAUTH_CODE_EXCHANGE_FAILED`.
- 민감 정보(private key, id_token, code, Authorization 헤더) 값이 로그 본문에 **포함되지 않는지** 샘플 검사.

---

## 5. 롤백 절차

1. 배포 환경 Secret에서 `APPLE_CLIENT_ID` 제거.
2. 서비스 재시작 → `AuthModule`이 Apple 전략을 등록하지 않음. `GET /auth/oauth/apple`는 `INVALID_PROVIDER`로 400 반환.
3. 클라이언트는 별도 feature flag 없이 버튼 제거 또는 동일 오류 토스트 노출(i18n 메시지 존재 확인).

---

## 6. 완료 기준 체크 (Definition of Done과 매핑)

- [ ] Apple 신규/재로그인/취소/오류 모든 경로에 대한 테스트 통과
- [ ] TypeScript 타입 오류 0건 (`tsc --noEmit`)
- [ ] ESLint/Prettier 통과
- [ ] i18n 키 4개 언어(`ko`, `en`, `ja`, `es`) 모두 업데이트
- [ ] Maestro `login-apple.yml` 그린
- [ ] 운영 로그에 민감 정보 노출 없음을 샘플로 확인
- [ ] `APPLE_PRIVATE_KEY` 및 `.p8` 파일이 git staged 상태가 아님
