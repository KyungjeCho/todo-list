# Quickstart — 007 로그인 라우팅 · 알림 · 캘린더 동기화 결함 수정

**Branch**: `007-fix-login-notif-calendar`
**Date**: 2026-04-14

본 문서는 본 feature 의 작업을 빠르게 착수·검증하기 위한 엔지니어용 런북이다. 상세 설계는 spec.md / research.md / data-model.md / contracts/ 를 참고한다.

## 0. 사전 확인

- 현재 브랜치: `git rev-parse --abbrev-ref HEAD` → `007-fix-login-notif-calendar` 여야 한다.
- Constitution v1.3.0 준수 (특히 III TDD, X Maestro E2E).
- Apple Developer 등록은 **Out of Scope** — iOS 실기기·APNs 관련 작업은 금지.

## 1. Group A — 온보딩 완료 상태 구조 (P1)

### 1.1 Red: 실패 테스트 작성

1. `backend/test/user/complete-onboarding.usecase.spec.ts`
   - 미완료 사용자 → 실행 후 `hasCompletedOnboarding === true`
   - 이미 완료 사용자 → 상태 변화 없이 동일 프로필 반환(멱등)
   - 없는 사용자 → `NotFoundException('NOT_FOUND')`
2. `backend/test/user/user.controller.e2e-spec.ts`
   - `POST /users/me/onboarding/complete` 계약 검증(응답 DTO·200/401/404)
3. `frontend/__tests__/app/navigation/AuthNavigator.test.tsx`
   - `isLoading` 동안 `LoadingSplash` 단독 렌더
   - `hasCompletedOnboarding === true` 사용자는 `Main`, `false` 사용자는 `Onboarding` 에 1회만 진입
   - 알림 시간 필드가 null 로 바뀌어도 `Main` 유지
4. Maestro: `.maestro/auth/onboarding-complete.yml`, `onboarding-guard.yml`, `home/no-flicker-after-login.yml`

### 1.2 Green: 최소 구현

1. DB: `docs/DDL.sql` 갱신 + TypeORM 마이그레이션.
   ```sql
   ALTER TABLE TODOLIST_USER ADD COLUMN has_completed_onboarding BOOLEAN NOT NULL DEFAULT FALSE;
   UPDATE TODOLIST_USER SET has_completed_onboarding = TRUE;
   ```
2. Entity/DTO 전파(`user.entity.ts`, `user-profile.dto.ts`, 프론트 `types/user.ts`).
3. `CompleteOnboardingUsecase` 신규 + `user.module.ts` provider 등록.
4. `user.controller.ts` 에 `@Post('me/onboarding/complete')` 추가.
5. `get-profile.usecase.ts`, `update-settings.usecase.ts` 응답 매핑에 신규 필드 포함.
6. Frontend:
   - `isUserOnboarded.ts` → `user?.hasCompletedOnboarding === true`.
   - `AuthNavigator.tsx` → `if (isAuthenticated && isLoading) return <LoadingSplash />; const showMain = isAuthenticated && user?.hasCompletedOnboarding;` 등 재구성.
   - `LoadingSplash.tsx` 신규.
   - 온보딩 완료 스텝에서 `completeOnboardingApi()` 호출 → 결과 프로필로 `useAuthStore` 갱신.

### 1.3 Refactor / 검증

- Jest 전체 통과, `any` 사용 0건.
- Maestro 3종 통과(`.maestro/auth/*.yml`, `home/no-flicker-after-login.yml`).
- `docs/API_SPEC.md` 갱신.

## 2. Group C — 캘린더 탭 포커스 재조회 (P3)

작은 변경이지만 Group A 와 독립 검증 가능. 순서상 Group A 뒤에 이어서 처리하면 테스트 환경 재사용이 용이.

### 2.1 Red

- `.maestro/calendar/focus-refetch.yml` — 홈 탭에서 오늘 날짜 todo 추가 → 캘린더 탭 전환 → 오늘 날짜 셀 카운트 증가 검증.

### 2.2 Green

- `MainTabNavigator.tsx` > `CalendarTab`:
  ```ts
  useFocusEffect(
    useCallback(() => {
      void fetchMonthlySummary(year, month);
    }, [year, month, fetchMonthlySummary]),
  );
  ```

### 2.3 Refactor / 검증

- 기존 `useEffect([year, month])`는 유지(월 변경 케이스 커버).
- Maestro 통과, 회귀 없음.

## 3. Group B — Android FCM + iOS 방어 코드 (P2)

EAS 재빌드를 수반하므로 **마지막**에 묶어 1회 빌드로 마감한다(spec 구현 순서 제안 준수).

### 3.1 Red

- `frontend/__tests__/features/notification/usePushNotification.test.ts`
  - Android 플로우: 채널 등록 → 권한 요청 → 리스너 연결 순서
  - 거부 시 크래시 없이 반환
- iOS 유닛: `ensureIOSPushSafety` 가 `getAPNSToken` 실패를 포착해 no-op 유지
- `.maestro/notification/android-permission.yml` — 최초 실행 시 권한 프롬프트

### 3.2 Green

1. `frontend/app.json`:
   ```json
   "android": {
     "permissions": [
       "android.permission.RECORD_AUDIO",
       "android.permission.MODIFY_AUDIO_SETTINGS",
       "android.permission.FOREGROUND_SERVICE",
       "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
       "android.permission.POST_NOTIFICATIONS"
     ]
   }
   ```
2. `setupNotificationChannel.ts` 신규 — `Notifications.setNotificationChannelAsync('default', { name: 'Default', importance: Notifications.AndroidImportance.MAX })`.
3. `usePushNotification.ts`:
   - Android 에서 초기화 시점에 채널 등록을 권한 요청 **이전**에 호출.
   - iOS 에서는 `ensureIOSPushSafety` 로 위임.
4. `ensureIOSPushSafety.ts` 신규 — APNs 관련 호출을 try/catch 로 감싸고 에러 시 dev 로그만 남김.

### 3.3 Refactor / 검증

- EAS dev 빌드 재생성 → Android 13+ 실기기 설치 → 최초 실행 권한 허용 → 백엔드 수동 트리거 → 알림 센터 표시 확인(SC-005 ≥ 95%).
- iOS 시뮬레이터/실기기(가능한 경우)에서 앱 정상 구동 + 크래시 없음 확인(SC-008).

## 4. 문서 및 메모리

- `docs/DDL.sql`, `docs/API_SPEC.md` 갱신(Group A).
- 작업 완료 후 PR 본문에 각 Group 별 증빙(Maestro 실행 로그 스크린샷 또는 CI 결과) 첨부.
- 필요 시 `CLAUDE.md`의 Active Technologies 섹션 자동 갱신(아래 6항).

## 5. 검증 체크리스트 (최종)

- [X] Jest 백엔드 전체 통과 (52 suites / 503 tests)
- [X] Jest 프론트엔드 전체 통과 (65 suites / 591 tests)
- [X] `.maestro/` 신규 YAML 5종 통과 (T048, 사용자 확인)
- [X] Android 13+ 실기기 알림 수신 스모크 통과(≥ 95%) (T049, 사용자 확인)
- [X] iOS 빌드 구동 시 크래시 0건(APNs 미구성 방어) (T050, 사용자 확인)
- [X] `docs/DDL.sql`, `docs/API_SPEC.md` 문서 동기화
- [X] 구성 헌법 Definition of Done 7 항목 충족 (T052 PR 초안에 증빙)

## 6. 에이전트 컨텍스트 업데이트

```bash
.specify/scripts/bash/update-agent-context.sh claude
```

- 본 feature 에서 새로 도입되는 기술/라이브러리는 없으므로 Active Technologies 목록에 추가되는 항목은 **없다** (모두 기존 스택 재사용). 스크립트는 이 사실을 반영하여 차이가 없을 경우 no-op 으로 종료된다.
