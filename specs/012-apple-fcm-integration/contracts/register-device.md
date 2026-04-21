# Contract: 디바이스 등록 / 해제 (기존 엔드포인트 재확인)

**Scope**: 본 기능은 **신규 엔드포인트를 추가하지 않는다.** 기존 2개 엔드포인트(`POST /users/me/devices`, `POST /auth/logout`)의 계약이 iOS(`deviceType='IOS'`) 요청에도 그대로 적용됨을 확인하고, `deviceName` 사용 확대만 명시한다. 하위 섹션은 소스 오브 트루스 역할을 한다.

## POST /users/me/devices

로그인한 사용자의 현재 디바이스를 FCM 토큰과 함께 등록(또는 토큰 갱신)한다.

### 헤더

- `Authorization: Bearer <JWT>` — 필수. `JwtAuthGuard` 통과 필요.
- `Content-Type: application/json`

### 요청 바디 (`RegisterDeviceDto`)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `fcmToken` | string | ✅ | FCM에서 발급한 기기별 토큰. 비공개 값 — 로그 금지(프리픽스만 허용). |
| `deviceType` | `'IOS' \| 'ANDROID'` | ✅ | iOS 기기는 `'IOS'`. |
| `deviceName` | string (1–100) | ❌ | 본 기능에서 iOS는 모델명(예: `"iPhone 15"`). 미전달 시 기존 동작(같은 `(userId, deviceType)` 타 토큰 soft-delete) 유지. |

### 응답

- **200 OK**
  ```json
  { "message": "Device registered" }
  ```
- **400 Bad Request**
  - `USER_NOT_FOUND`: JWT subject에 해당하는 사용자가 없는 경우(정상 로그인 상태에서는 발생하지 않아야 함).
  - 유효성 실패(예: `fcmToken` 빈 문자열) → `ValidationPipe` 기본 응답 형식.
- **401 Unauthorized**: JWT 누락/만료.

### 서버 사이드 효과

1. `UserDeviceRepository.upsertDevice` 호출.
2. `fcmToken` 기준 존재 여부 조회(soft-delete 포함). 있으면 복원(`deletedAt=null`) + `userId`/`deviceType`/`deviceName` 갱신, 없으면 신규 삽입.
3. **본 PR 변경점(R-004)**: 같은 `(userId, deviceType, deviceName)` 의 다른 토큰을 soft-delete. `deviceName`이 미전달된 경우에는 `(userId, deviceType)` 기존 규칙을 적용.
4. 응답 본문에 FCM 토큰을 포함하지 않는다(이미 요청자가 보유).

### 로깅 규칙

- FCM 토큰은 `substring(0, 8)` 프리픽스로만 기록.
- `deviceName`은 PII 취급(모델명) — WARN/ERROR 레벨에서만, DEBUG 로그에는 기록 금지.

---

## POST /auth/logout

현재 세션을 종료하고 FCM 디바이스 레코드를 해제한다(본 기능에서 계약 변경 없음, iOS 흐름에서의 사용 경로만 재확인).

### 요청 바디 (`LogoutDto` — 기존)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `refreshToken` | string | ✅ | 세션 삭제에 사용. |
| `fcmToken` | string | ❌ | 전달 시 해당 토큰의 `UserDevice` soft-delete(소유자 일치 확인 후). |

### 응답

- **200 OK**
- **400 Bad Request**: 잘못된 요청 형식.
- **401 Unauthorized**: JWT 누락/만료.

### 서버 사이드 효과

1. `LogoutUsecase`가 refresh token 세션을 제거.
2. `fcmToken`이 전달되고 요청자의 소유이면 `UserDeviceRepository.deleteByFcmTokenForOwner`로 soft-delete.
3. **iOS에서도 동일 흐름이 적용됨을 재확인**. `deviceType='IOS'` 레코드가 soft-delete된 뒤에는 해당 기기로의 발송이 0건이어야 한다(SC-006).

---

## 비(非)계약 변경 사항

- `POST /users/me/devices`에 새 필드 추가 없음.
- `LogoutDto`에 새 필드 추가 없음.
- 새 엔드포인트 없음.
- 신규 에러 코드 없음.
