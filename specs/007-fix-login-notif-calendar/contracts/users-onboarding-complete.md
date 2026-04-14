# Contract — POST /users/me/onboarding/complete

**Status**: Draft (Phase 1)
**Feature**: 007-fix-login-notif-calendar
**Scope**: Group A (온보딩 완료 명시적 도메인 액션)
**Constitution**: 원칙 II(엄격한 TypeScript), IV(계층 분리), V(실패 처리·관측성)

## 1. 개요

현재 로그인 사용자 본인의 `hasCompletedOnboarding` 상태를 `TRUE`로 전이시키는 명시적 도메인 액션. 시간 설정(`planTime`/`reviewTime`)과는 독립이며 **멱등**하다.

## 2. Endpoint

```
POST /users/me/onboarding/complete
```

| 항목 | 값 |
|------|------|
| 인증 | 필수 (기존 인증 미들웨어 `AuthenticatedRequest`) |
| 권한 | 자기 자신만 변경 가능 (리소스 경로가 `me`) |
| Content-Type | 요청 본문 없음 / 응답 `application/json` |
| 멱등성 | **예** — 재호출 시 상태 변경 없이 현재 프로필 반환 |

## 3. 요청

### Headers

```
Authorization: Bearer <JWT>
```

### Body

없음(빈 본문). 미래 확장성을 위해 서버는 **알 수 없는 필드를 허용하되 무시**한다(class-validator `whitelist: true`, `forbidNonWhitelisted: false`).

## 4. 응답

### 200 OK (성공 · 멱등 재호출 공통)

```json
{
  "id": "uuid-v4",
  "userName": "사용자",
  "planTime": "09:00:00",
  "reviewTime": "22:00:00",
  "timezone": "Asia/Seoul",
  "language": "ko",
  "hasCompletedOnboarding": true
}
```

- `hasCompletedOnboarding` 는 **항상 true** (호출 성공 후 상태).
- 기존 `GET /users/me` 응답과 동일한 `UserProfileDto` 형태.

### 401 Unauthorized

인증 토큰 부재/만료. 기존 전역 가드 응답 포맷 재사용.

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "NOT_FOUND",
  "error": "Not Found"
}
```

- JWT 는 유효하나 `userAuthId` 매핑 사용자가 존재하지 않는 경우(엣지).

### 5xx

DB 접근 실패 등. 구조화된 로그(`userAuthId`, 에러 스택)를 남기고 표준 5xx 포맷 반환(헌법 V).

## 5. 서버 동작 (계층)

```
UserController.completeOnboarding(req)
  ↓ req.user.userAuthId
CompleteOnboardingUsecase.execute({ userAuthId })
  ↓
UserRepository.findByUserAuthId(userAuthId)  →  없으면 NotFoundException('NOT_FOUND')
  ↓
if (user.hasCompletedOnboarding === true) return toProfileDto(user)   // 멱등 단락
user.hasCompletedOnboarding = true
UserRepository.update(user)
  ↓
return toProfileDto(updated)
```

### 관측성

- 로그: `user.onboarding.completed`, 필드: `userAuthId`, `transitioned: boolean` (FALSE → TRUE 전이에서만 true, 멱등 재호출 시 false).
- 메트릭(선택): 동일 사용자 반복 호출 카운트 → 클라이언트 버그 조기 감지.

## 6. 클라이언트 계약

### 호출 시점

- 온보딩 플로우 마지막 단계 성공 시(시간 설정 저장 성공 이후 또는 사용자가 온보딩 "완료" 버튼 탭 시점). 호출 실패 시 사용자에게 재시도 가능한 에러 상태를 제시(헌법 V).

### 응답 처리

- 응답으로 받은 `UserProfileDto`로 `useAuthStore`(또는 해당 사용자 상태 저장소)의 `user`를 **즉시 교체**한다. 이로 인해 `isUserOnboarded(user) === true`가 되어 `AuthNavigator`가 `Main` 으로 전환.

## 7. 유효성 / 보안

- 경로 `/users/me` 이므로 다른 사용자 리소스 접근 불가.
- 요청 본문이 없으므로 입력 주입 표면 없음.
- 멱등이므로 네트워크 재시도·중복 호출 안전.

## 8. 테스트 케이스 (계약 수준)

| # | 상태 | 입력 | 기대 응답 |
|---|------|------|-----------|
| C1 | 미완료 사용자 | 정상 JWT | 200 + `hasCompletedOnboarding: true`, 상태 FALSE → TRUE |
| C2 | 이미 완료 사용자 | 정상 JWT | 200 + `hasCompletedOnboarding: true` (멱등) |
| C3 | 인증 없음 | - | 401 |
| C4 | 매핑 사용자 없음 | 정상 JWT, 유령 userAuthId | 404 `NOT_FOUND` |
| C5 | 본문에 임의 JSON `{ foo: 1 }` | 정상 JWT | 200 (추가 필드는 무시) |

## 9. OpenAPI 스니펫 (참고)

```yaml
paths:
  /users/me/onboarding/complete:
    post:
      tags: [user]
      summary: 현재 사용자의 온보딩 완료 상태를 기록한다 (멱등)
      security:
        - bearerAuth: []
      responses:
        '200':
          description: 완료 상태 (신규 전이 또는 멱등 재호출)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserProfileDto'
        '401':
          description: 인증 실패
        '404':
          description: 사용자 없음 (NOT_FOUND)
```

## 10. 문서 동기화

- `docs/API_SPEC.md` 의 User 섹션에 본 엔드포인트 추가.
- `docs/DDL.sql` 의 `TODOLIST_USER` 에 `has_completed_onboarding` 컬럼 추가(data-model.md §1.1).
