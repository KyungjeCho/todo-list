# PR 초안 — 007: 로그인 라우팅 · 알림 · 캘린더 동기화 결함 일괄 수정

> **용도**: `gh pr create` 시 `--body` 로 사용할 본문 초안. 업로드는 사용자가 직접 수행.
> **Base**: `main` ← **Head**: `007-fix-login-notif-calendar`

## Title 안

```
fix(auth/notif/cal): hasCompletedOnboarding 도메인 도입 + FCM 토큰·스케줄러 버그 수정
```

---

## Summary

사용자 보고 6건의 결함(`docs/specs/fix-bug.md`)을 세 그룹으로 묶어 구조적으로 해결했습니다.

- **Group A (US1, P1)** — 온보딩 완료 상태를 `planTime`/`reviewTime` 존재 여부로 **간접 추론**하던 방식을 1급 도메인 필드 `hasCompletedOnboarding` 으로 전환. 알림 OFF 와 온보딩 완료를 구조적으로 분리하여 Issue 1/3/4/5 를 한 번에 차단.
- **Group B (US2, P2)** — 디버깅 중 실기기 알림 미수신의 진짜 원인은 매니페스트 권한 이슈가 아니라 **(a) DB 에 누적된 스테일 FCM 토큰**과 **(b) 스케줄러의 `HH:mm` vs `HH:mm:ss` 비교 불일치** 두 가지였음을 확인. 두 건 모두 수정.
- **Group C (US3, P3)** — 사용자 환경에서 이미 정상 동작 확인(별도 회귀 없음).

---

## Group A — 온보딩 완료 상태 구조 개선

### DB

- `TODOLIST_USER.has_completed_onboarding BOOLEAN NOT NULL DEFAULT FALSE` 컬럼 추가.
- 기존 사용자 전원 `TRUE` 백필 (무중단 호환).
- `docs/DDL.sql` 반영, TypeORM 마이그레이션 `1744848000000-AddHasCompletedOnboardingToUser.ts` 신규.
- `backend/src/data-source.ts` + `migration:run` / `migration:revert` scripts 신설.

### Backend

- `UserEntity` 및 `UserProfileDto` 에 `hasCompletedOnboarding` 전파.
- `POST /users/me/onboarding/complete` 신규 엔드포인트 (멱등, HTTP 200).
- `CompleteOnboardingUsecase` — 이미 `true` 면 상태 변화 없이 현재 프로필 반환.
- `get-profile.usecase` / `update-settings.usecase` 응답에 신규 필드 포함 (알림 시간 변경 시 값 보존).

### Frontend

- `UserProfile` 타입에 `hasCompletedOnboarding` 필드 추가.
- `isUserOnboarded` 판별을 `user?.hasCompletedOnboarding === true` 단일 소스로 변경.
- 순수 함수 `selectAuthRoute` 분리 — `auth / loading / main / onboarding` 4상태 결정 책임 단일화.
- `LoadingSplash` 공통 컴포넌트 신설 — 프로필 로딩 중 Onboarding 으로 찰나 전환되는 플리커를 원천 차단.
- `AuthNavigator` 구조적 가드: Stack.Screen 을 라우트 판정 결과에 따라 **조건부 렌더**.
- 온보딩 완료 플로우: `userApi.updateSettings({planTime, reviewTime})` 성공 후 `completeOnboardingApi()` 호출 → `setUser(profile)` 로 상태 갱신.

### 문서

- `docs/API_SPEC.md` User 섹션에 신규 엔드포인트 및 필드 반영, 엔드포인트 요약표 갱신.

---

## Group B — FCM 알림 미수신 구조 수정

### (a) Stale FCM 토큰 누적

**문제**: `UserDeviceRepository.upsertDevice` 가 `fcm_token` 문자열 단독으로 조회/INSERT 하므로, 토큰 회전(`onTokenRefresh`) · 재설치 · Firebase 서버측 rotation 시마다 새 행을 INSERT 하고 옛 행이 DB 에 남음. 스케줄러가 죽은 토큰에도 매번 발사해 실패 로그만 누적.

**수정**:

- `upsertDevice` 말미에 `(userId, deviceType)` 의 다른 활성 토큰을 soft-delete 하는 쿼리 추가.
- FCM 의 실제 규약(기기당 시점별 1개 유효 토큰)과 정합. `onTokenRefresh` · 재로그인 · 재설치 후 앱이 한 번만 등록 요청을 보내면 DB 가 자동 수렴.
- 회귀 테스트 2건 추가(신규 INSERT 경로 + 기존 행 갱신 경로).

### (b) 스케줄러 시간 비교 불일치 — `HH:mm` vs `HH:mm:ss`

**문제**: PostgreSQL `time` 컬럼은 `'22:00:00'` 형태로 역직렬화되는데 `Intl.DateTimeFormat` 으로 계산한 로컬 시각은 `'22:00'`. 두 문자열이 영영 일치하지 않아 `@Cron EVERY_MINUTE` 이 매분 돌지만 **어떤 유저에 대해서도 PLAN/REVIEW 발사 조건이 성립하지 않음**.

**수정**:

- `NotificationSchedulerUsecase.execute` 비교 직전에 `substring(0, 5)` 로 `HH:mm` 정규화.
- 실환경 DB 포맷을 그대로 사용한 회귀 테스트 2건 추가.

---

## Group C — 캘린더 즉시 갱신

- 사용자 환경에서 실제 동작 정상 확인. 본 PR 에서는 코드 변경 없음.

---

## Test plan

- [X] Backend Jest 전체: 52 suites / 503 tests 그린
- [X] Frontend Jest 전체: 65 suites / 591 tests 그린
- [X] Backend `tsc --noEmit`: 에러 0
- [X] Frontend `tsc --noEmit`: 에러 0
- [X] Backend lint: 에러 0 (preexisting warnings 2건)
- [X] Frontend lint: 에러 0 (preexisting warnings 28건)
- [X] 마이그레이션 `migration:run` / `migration:revert` / `migration:run` 왕복 검증 (로컬 DB)
- [X] Firebase 콘솔 테스트 메시지로 실기기 수신 확인 (stale token 정리 후)
- [X] 실환경 reviewTime 트리거 기준 실기기 알림 수신 확인 (스케줄러 정규화 후)
- [ ] `.maestro/` 신규 YAML 5종 일괄 실행 — 본 PR 범위 외(T048)
- [ ] EAS dev 빌드 재생성 + Android 13+ 실기기 수신률 ≥ 95% 스모크 — 본 PR 범위 외(T049)
- [ ] iOS 시뮬레이터/실기기 구동 크래시 0 — 본 PR 범위 외(T050)

---

## Definition of Done (헌법 v1.3.0)

| # | 항목 | 상태 |
|---|---|---|
| 1 | TDD Red → Green → Refactor 준수 | ✅ (각 변경마다 실패 테스트 선행) |
| 2 | `any` 사용 0 / strict mode 준수 | ✅ tsc 에러 0 |
| 3 | 계층 분리 (controller → application → domain → infra) | ✅ |
| 4 | 모든 UI 상태 (loading/empty/error) 처리 | ✅ LoadingSplash + Onboarding error state |
| 5 | 한국어 문서 / 영어 식별자 | ✅ |
| 6 | WHY 중심 주석 | ✅ 구조적 결정 지점만 주석 |
| 7 | 단위/통합/E2E 테스트 작성 | 단위·통합 ✅ / Maestro YAML 파일은 작성 완료, 실행은 T048 |

---

## 위험 및 롤백

- `has_completed_onboarding` 기본값을 `FALSE` 로 두고 전원 `TRUE` 백필 → 기존 사용자 온보딩 재진입 없음.
- 마이그레이션은 revert 스크립트로 원복 가능 (`ALTER TABLE DROP COLUMN`).
- `upsertDevice` cleanup 쿼리는 soft-delete (deletedAt) 만 사용 → 필요 시 `deletedAt = NULL` 로 복구 가능.
- 스케줄러 정규화는 순수 문자열 slice — 행동 변화는 "일치되지 않던 경우가 일치" 방향뿐.
