# Bug Fix Specification: 로그인 라우팅 · 알림 · 캘린더 동기화 결함

**Created**: 2026-04-14
**Status**: Approved — speckit 기반 TDD 구현 대기
**Scope**: 프론트(Expo/React Native) + 백엔드(NestJS/TypeORM) + DB(Supabase/PostgreSQL)
**Source**: `docs/specs/fix-bug.md` 원문(사용자 보고 6건)

## 문제 요약

현재 6건의 결함이 보고되었으며, 조사 결과 **Group A(4건)** 은 하나의 구조적 원인(온보딩 완료 여부 판별 로직의 우회 추론)에서 파생되고, 나머지 2건은 독립적 결함이다.

| # | 그룹 | 증상 | 루트 원인 |
|---|------|------|-----------|
| 1 | A | 알림 OFF 시 온보딩 강제 이동 | `planTime/reviewTime` null 저장 → 온보딩 미완료로 판정 |
| 3 | A | 로그인 후 메인→온보딩 순간 플리커 | `isLoading` 동안 Main 선렌더 후 Onboarding 재전환 |
| 4 | A | 온보딩 완료자 재진입 가드 모호 | 가드가 "시간 필드 존재"라는 간접 신호에 의존 |
| 5 | A | 온보딩 완료 체크 방식 미확립 | `hasCompletedOnboarding` 도메인 필드 부재 |
| 2 | B | DEV Android에서 FCM 알림 미수신 | `POST_NOTIFICATIONS` 권한/채널 설정 누락 |
| 6 | C | todo 최초 추가 시 캘린더 즉시 미갱신 | Main ↔ Calendar 간 상태 공유 경로 없음 |

---

## Group A — 온보딩 완료 상태 구조 개선 (Issues 1, 3, 4, 5)

### A.1 원인 분석

**현재 동작 (프론트 단독 추론):**

```ts
// frontend/src/app/navigation/isUserOnboarded.ts:7-9
export function isUserOnboarded(user: UserProfile | null | undefined): boolean {
  return user?.planTime != null && user?.reviewTime != null;
}
```

온보딩 완료 여부를 "계획/회고 알림 시간이 모두 설정되어 있는가"라는 **간접 신호**로 추론하고 있음. 이로 인해:

- **Issue 1**: 설정 화면에서 알림을 OFF(`planTime=null`)하면 온보딩 미완료로 재판정 → AuthNavigator가 `<Onboarding>` 화면으로 스택 교체.
- **Issue 3**: 로그인 직후 프로필 로딩 중 `isLoading=true` 동안 Main을 선렌더 → 프로필 도착 시 `isLoading=false` + `isOnboarded=false`로 평가되는 순간 Onboarding으로 스왑되어 **깜빡임 발생**.
- **Issue 4**: 가드는 존재하지만 "시간 필드 존재"에 의존 → 향후 알림 기능 확장/변경 시 다시 깨질 여지.
- **Issue 5**: DB/엔티티/DTO 어디에도 `hasCompletedOnboarding` 필드가 존재하지 않음.

### A.2 해결 방안

**도메인에 온보딩 완료 상태를 1급 필드로 승격**하고, 알림 설정과 완전히 분리한다.

#### A.2.1 DB 스키마 변경 (승인됨)

`docs/DDL.sql`의 `TODOLIST_USER` 테이블에 컬럼 추가:

```sql
-- TODOLIST_USER.business columns 영역에 추가
has_completed_onboarding BOOLEAN NOT NULL DEFAULT FALSE
```

**마이그레이션 전략 (승인됨):**
- **기존 사용자 백필**: 모두 `TRUE`로 설정.
  ```sql
  UPDATE TODOLIST_USER SET has_completed_onboarding = TRUE;
  ```
  이미 가입해서 앱을 사용하던 사용자는 재온보딩을 거치지 않도록 전부 완료 처리.
- **신규 사용자**: DEFAULT FALSE로 자동 설정.

#### A.2.2 백엔드 엔티티/DTO 변경

**File: `backend/src/user/domain/user.entity.ts`**

```ts
@Column({ name: 'has_completed_onboarding', type: 'boolean', default: false })
hasCompletedOnboarding!: boolean;
```

**File: `backend/src/user/application/dto/user-profile.dto.ts`**

```ts
export class UserProfileDto {
  id!: string;
  userName!: string;
  planTime!: string | null;
  reviewTime!: string | null;
  timezone!: string | null;
  language!: string;
  hasCompletedOnboarding!: boolean; // 신규
}
```

**File: `backend/src/user/application/get-profile.usecase.ts`, `update-settings.usecase.ts`** — 응답 매핑에 신규 필드 추가.

#### A.2.3 프론트 판별 로직 변경

**File: `frontend/src/app/navigation/isUserOnboarded.ts`**

```ts
export function isUserOnboarded(user: UserProfile | null | undefined): boolean {
  return user?.hasCompletedOnboarding === true;
}
```

**File: `frontend/src/types/user.ts`** — `hasCompletedOnboarding: boolean` 필드 추가.

#### A.2.4 Issue 3 플리커 제거

`AuthNavigator.tsx:376-377` 의 `showMain = isAuthenticated && (isLoading || isOnboarded)` 는 **로딩 중 Main을 먼저 보여주는** 임시방편이었음. 신규 필드 기반에서는 더 이상 "시간 필드가 늦게 도착해서 미완료로 오판" 문제가 없으므로 다음으로 정정:

```ts
// 로딩 중에는 어느 쪽도 렌더하지 않고 스플래시/로딩 뷰를 표시
if (isAuthenticated && isLoading) return <LoadingSplash />;

const showOnboarding = isAuthenticated && !user?.hasCompletedOnboarding;
const showMain = isAuthenticated && user?.hasCompletedOnboarding;
```

### A.3 API 변경 (승인됨 — 옵션 B)

**전용 엔드포인트 신설**: `POST /users/me/onboarding/complete`

**이유**:
- 온보딩 완료는 "시간 설정"과 독립된 **명시적 도메인 액션**.
- 향후 온보딩 스텝 확장(언어 선택, 샘플 todo 등)에 유연하게 대응.
- 클라이언트가 시간 설정 여부와 무관하게 "온보딩을 통과했다"는 사실만 기록 가능.

**구현 개요**:

```ts
// backend/src/user/user.controller.ts
@Post('me/onboarding/complete')
async completeOnboarding(@Req() req: AuthenticatedRequest) {
  return this.completeOnboardingUsecase.execute({
    userAuthId: req.user.userAuthId,
  });
}
```

```ts
// backend/src/user/application/complete-onboarding.usecase.ts (신규)
@Injectable()
export class CompleteOnboardingUsecase {
  async execute(input: { userAuthId: string }): Promise<UserProfileDto> {
    const user = await this.userRepository.findByUserAuthId(input.userAuthId);
    if (!user) throw new NotFoundException('NOT_FOUND');
    user.hasCompletedOnboarding = true;
    const updated = await this.userRepository.update(user);
    return toProfileDto(updated);
  }
}
```

**멱등성**: 이미 `true`인 상태에서 재호출되어도 에러 없이 현재 프로필 반환.

### A.4 검증 시나리오

1. 신규 가입 → 온보딩 완료 → 설정에서 알림 OFF → **메인 유지**.
2. 로그인 → 프로필 로드 중 → 플리커 없이 최종 화면 1회 렌더.
3. 온보딩 미완료 사용자 재로그인 → Onboarding 진입.
4. 이미 완료한 사용자 → 외부 네비게이션으로 `Onboarding`에 접근 시 가드로 차단.

---

## Group B — Issue 2: DEV Android FCM 알림 미수신

### B.1 원인 분석

- **권한 선언 누락**: `frontend/app.json:30-35` 의 `android.permissions` 배열에 `POST_NOTIFICATIONS` 없음. Android 13(API 33)+ 에서 알림 표시에 필수.
- **런타임 권한 요청은 존재**: `usePushNotification.ts:50-58` 에서 Expo Notifications API로 권한 요청은 하나, 매니페스트 선언이 없으면 일부 빌드에서 요청 자체가 거부됨.
- **기본 알림 채널 메타데이터 부재**: FCM은 Android O+에서 채널 ID 없이 전송된 알림을 표시하지 않음. `com.google.firebase.messaging.default_notification_channel_id` meta-data 미설정.

### B.2 해결 방안

**File: `frontend/app.json`**

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

**기본 알림 채널 등록**: `@react-native-firebase/messaging` 플러그인 옵션 또는 앱 초기화 시 `Notifications.setNotificationChannelAsync('default', {...})` 호출 보장. 현재 초기화 코드 위치는 `frontend/src/features/notification/` 영역(추가 조사).

### B.3 백엔드 변경 여부

**없음**. `FcmService`, `NotificationSchedulerService` 는 정상 동작 중. 프론트/빌드 설정만 수정.

### B.4 검증

1. DEV 빌드(EAS development) 재빌드 후 Android 13+ 실기기 설치.
2. 앱 최초 실행 시 알림 권한 프롬프트 수신 → 허용.
3. 백엔드에서 수동 트리거(Postman 또는 스케쥴러 시각)로 알림 발송 → **알림 센터 표시 확인**.

---

## Group C — Issue 6: todo 최초 추가 시 캘린더 즉시 미갱신

### C.1 원인 분석

- `frontend/src/app/navigation/AuthNavigator.tsx:161-176` — `handleAddTodo`는 `todoApi.createTodo` 후 `fetchTodos(selectedDate)`만 호출.
- `frontend/src/app/navigation/MainTabNavigator.tsx:21-122` — `CalendarTab` 컴포넌트는 독립 `useState<MonthlySummaryResponse>`를 유지하며, `useEffect`는 `year/month` 의존성만 가짐.
- 결과: Home 탭에서 todo를 추가해도 Calendar 탭으로 전환하기 전까지 `reportApi.getMonthlySummary` 가 재호출되지 않음. 전환 후에도 **탭 언마운트 없이 상태가 캐시되어** 이전 달 통계가 그대로 표시되는 경우가 있음.

### C.2 해결 방안

**옵션 1 (단기, 권장)**: Calendar 탭이 포커스를 받을 때마다 재조회.

```ts
// CalendarTab 내부에 useFocusEffect 추가
useFocusEffect(
  useCallback(() => {
    void fetchMonthlySummary(year, month);
  }, [year, month, fetchMonthlySummary]),
);
```

**옵션 2 (중기)**: 공용 상태(Zustand) 도입 — `useTodoStore`(이미 프로젝트에 존재)에 월간 summary 캐시를 두고, `createTodo` mutation 후 해당 월 캐시 무효화 플래그 설정. Calendar 탭이 플래그를 감지해 재조회.

**권장**: 옵션 1을 먼저 적용(변경 범위 최소), 향후 메모·완료일 변경 등 다른 쓰기 경로가 늘어날 때 옵션 2로 이관.

### C.3 백엔드 변경 여부

**없음**. `reportApi.getMonthlySummary` 는 정상 동작.

---

## 구현 순서 (제안)

1. **Group A (DB + 백엔드 + 프론트 일괄)** — 구조적 결함이며 4개 이슈 동시 해결. API 옵션(A/B/C) 사용자 승인 선행.
2. **Group C (Calendar 포커스 재조회)** — 프론트 한 곳 수정.
3. **Group B (FCM 설정)** — EAS 재빌드 소요. 마지막 배치로 빌드 1회에 묶어 처리.

## 승인 완료 항목

- [x] **A.3 API 방식** — **옵션 B** (전용 엔드포인트 `POST /users/me/onboarding/complete`) 채택.
- [x] **A.2.1 마이그레이션** — 기존 사용자 전원 `hasCompletedOnboarding = TRUE`로 백필.
- [x] **구현 방식** — speckit 기반 TDD 진행 (별도 feature 브랜치).

## 다음 단계

사용자가 speckit으로 feature 스펙을 착수할 예정. 본 문서는 **상위 설계 참조 문서**로 유지되며, 세부 태스크는 `specs/NNN-fix-bug/` 하위 speckit 산출물이 담당한다.

## 변경 대상 파일 요약

| 영역 | 파일 |
|------|------|
| DB | `docs/DDL.sql` |
| 백엔드 | `backend/src/user/domain/user.entity.ts`<br>`backend/src/user/application/dto/user-profile.dto.ts`<br>`backend/src/user/application/get-profile.usecase.ts`<br>`backend/src/user/application/update-settings.usecase.ts`<br>`backend/src/user/user.controller.ts` (엔드포인트 추가)<br>`backend/src/user/application/complete-onboarding.usecase.ts` (신규)<br>`backend/src/user/user.module.ts` (provider 등록) |
| 프론트(Group A) | `frontend/src/app/navigation/isUserOnboarded.ts`<br>`frontend/src/app/navigation/AuthNavigator.tsx`<br>`frontend/src/types/user.ts` |
| 프론트(Group B) | `frontend/app.json`<br>(+ 알림 초기화 모듈) |
| 프론트(Group C) | `frontend/src/app/navigation/MainTabNavigator.tsx` |
