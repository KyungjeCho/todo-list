# Phase 0 Research — 007 로그인 라우팅 · 알림 · 캘린더 동기화

**Branch**: `007-fix-login-notif-calendar`
**Date**: 2026-04-14

## 개요

본 단계의 목표는 Technical Context의 결정을 근거 있는 기술 선택으로 고정하는 것이다. spec.md의 Clarifications에서 이미 결정된 내용(옵션 B 엔드포인트, 기존 사용자 전원 백필, iOS Apple Developer **Out of Scope**)은 재질문하지 않고 **확정 사항**으로 기록한다.

## R1. 온보딩 완료 상태를 도메인에 1급 필드로 승격

- **Decision**: `TODOLIST_USER` 테이블에 `has_completed_onboarding BOOLEAN NOT NULL DEFAULT FALSE` 컬럼을 추가하고, `UserEntity`/`UserProfileDto`/프론트 `UserProfile` 타입에 동일 필드를 반영한다. 프론트 `isUserOnboarded`는 **이 필드 단독**을 기준으로 판정한다.
- **Rationale**:
  - `planTime/reviewTime`은 사용자 설정에 의해 자주 변동(알림 OFF → null)되지만, "온보딩 완료" 사실은 **한 번 발생한 도메인 이벤트**이다. 두 개념을 분리하면 FR-002(알림 OFF 시 상태 비변경)·FR-005(명시적 액션)가 구조적으로 보장된다.
  - 향후 온보딩 스텝 확장(언어 선택, 샘플 todo 등) 시 같은 필드를 재사용할 수 있다.
- **Alternatives considered**:
  1. **별도 `USER_ONBOARDING` 테이블**(단계별 이력) — 과도. 현재 FR은 완료 여부만 요구(YAGNI, 헌법 VI).
  2. **`onboardingCompletedAt: Date | null` 필드** — 시각 기록은 감사용으로 유용하나, 현재 요구에 불필요. 추후 필요 시 NULLABLE 컬럼 추가로 비침습 확장 가능.
  3. **기존 `planTime != null && reviewTime != null` 추론 유지** — 현재 결함의 원인. 기각.

## R2. 전용 엔드포인트 vs. 통합 PATCH

- **Decision**: `POST /users/me/onboarding/complete` 신설(옵션 B 확정). 요청 본문 없음, 응답은 갱신된 `UserProfileDto`. 멱등(재호출 200 OK + 현재 프로필 반환).
- **Rationale**:
  - 시간 설정과 독립된 **도메인 액션**이므로 PATCH 리소스 업데이트보다 커맨드형 엔드포인트가 의도를 명확히 드러낸다.
  - 멱등을 계약 레벨에서 선언하면 클라이언트 재시도/중복 호출 안전(FR-006).
- **Alternatives considered**:
  1. `PATCH /users/me { hasCompletedOnboarding: true }` — 부분 업데이트 일관성은 있으나, 클라이언트가 불리언을 직접 세팅하는 모델이 되어 도메인 의도가 희석됨. 기각.
  2. 별도 온보딩 단계 엔드포인트 세트(`/onboarding/step/N`) — 미래 확장 대응이나 현재 과도. 기각.

## R3. 기존 사용자 마이그레이션

- **Decision**: 컬럼 추가 시 `UPDATE TODOLIST_USER SET has_completed_onboarding = TRUE;` 를 **같은 마이그레이션 트랜잭션**에서 실행. DEFAULT FALSE는 신규 가입에만 적용.
- **Rationale**: spec Clarifications 및 FR-008의 승인 사항. 일부 실제 미완료 사용자가 포함될 수 있으나 운영상 수용 가능한 트레이드오프(spec Edge Cases 명시).
- **Alternatives considered**:
  1. 앱 기동 시 클라이언트가 휴리스틱으로 `hasCompletedOnboarding` 플래그를 자체 설정 → 서버 재호출 — 서버 진실 공급원(SSOT) 위배, 복잡성 증가. 기각.
  2. 점진적 마이그레이션(배치 잡) — 대상 행 수가 적어 불필요. 기각.

## R4. 플리커 방지 — LoadingSplash 전략

- **Decision**: `AuthNavigator`에서 `isAuthenticated && isLoading`인 동안 `LoadingSplash`를 렌더하고, 로딩이 끝난 뒤에만 `showMain`/`showOnboarding`을 판정한다. `showMain = isAuthenticated && user?.hasCompletedOnboarding === true` / `showOnboarding = isAuthenticated && user?.hasCompletedOnboarding !== true`.
- **Rationale**:
  - 현재 `showMain = isAuthenticated && (isLoading || isOnboarded)`는 "로딩 중 일단 메인 렌더" 방식으로, 로딩 종료 시 프로필 값에 따라 **온보딩으로 스왑**이 발생할 수 있다(Issue 3).
  - 로딩 상태를 **제3의 결정 가능한 상태**로 분리하면 FR-003(어느 쪽도 렌더하지 않음) + FR-004(정확히 1회 전환)가 동시에 성립한다.
- **Alternatives considered**:
  1. Stack Navigator `initialRouteName`만 바꾸기 — 초기 라우트는 고정되나 프로필 도착 시 재평가가 여전히 발생. 기각.
  2. Suspense 기반 스켈레톤 — Expo RN 환경에서 현재 도입되지 않음. 도입 비용 대비 이익 불충분(VI). 기각.

## R5. Android FCM — 권한과 기본 채널

- **Decision**:
  - `frontend/app.json > android.permissions` 에 `android.permission.POST_NOTIFICATIONS` 추가.
  - 앱 부트 시 `Notifications.setNotificationChannelAsync('default', { name: 'Default', importance: MAX })`를 호출해 기본 채널을 등록한다. 구현은 `frontend/src/features/notification/setupNotificationChannel.ts` 에서 캡슐화.
  - 런타임 권한은 기존 `usePushNotification.ts` 흐름을 유지하되, 채널 등록이 권한 요청 **이전**에 보장되도록 호출 순서를 정렬한다.
- **Rationale**:
  - Android 13+는 `POST_NOTIFICATIONS` **런타임 권한 + 매니페스트 선언** 둘 다 필요. 매니페스트 선언이 없으면 일부 빌드에서 시스템 프롬프트 자체가 표시되지 않는다.
  - FCM은 Android O+에서 **채널 ID 없는 알림을 표시하지 않음**. 기본 채널이 등록되어 있지 않으면 백엔드가 보낸 알림이 조용히 드롭된다.
- **Alternatives considered**:
  1. `com.google.firebase.messaging.default_notification_channel_id` meta-data를 AndroidManifest.xml에 직접 선언 — Expo managed workflow에서는 plugin 설정으로 대체하는 편이 관리 용이. 필요 시 prebuild config-plugin으로 이관 가능(현 단계에서는 런타임 `setNotificationChannelAsync` 채택).
  2. 알림 중요도를 `DEFAULT`로 낮추기 — 본 서비스의 계획/회고 알림은 사용자가 의도적으로 놓치면 안 되는 리마인더이므로 `MAX` 또는 `HIGH` 유지. 기각.

## R6. iOS 방어적 no-op (Apple Dev Out of Scope 제약 하)

- **Decision**: iOS에서 APNs가 구성되지 않은 상태를 전제로, `ensureIOSPushSafety.ts` 에서 `Platform.OS === 'ios'` 분기 시 다음을 보장한다.
  1. `@react-native-firebase/messaging`의 APNs 의존 호출(`getAPNSToken`, `registerDeviceForRemoteMessages` 등)은 **호출하지 않거나 try/catch**로 감싸 앱 크래시로 이어지지 않게 한다.
  2. 알림 권한 요청은 호출 가능하되 실패·거부 시 일반 플로우로 복귀한다(FR-013).
  3. 관련 에러는 개발용 로그로만 남기고 사용자 UI에 노출하지 않는다.
- **Rationale**: iOS는 APNs 토큰 없이 FCM 푸시가 동작하지 않으나, Apple Developer 등록이 OOS이므로 APNs 구성 자체가 불가. 따라서 iOS 경로는 "앱 기능(온보딩/설정/홈/캘린더)이 iOS에서도 정상 동작"만 보장하면 된다(SC-008).
- **Alternatives considered**:
  1. iOS에서 알림 초기화를 완전히 스킵(플랫폼 분기로 코드 자체 제외) — 향후 APNs 구성 후 코드 재활성화 비용 증가. 기각(단일 진입점 + 방어적 no-op 채택).
  2. Expo Push Service로 대체 — 본 프로젝트는 `@react-native-firebase/messaging` 기반 FCM 직결 구조. 아키텍처 변경은 본 스펙 범위 밖. 기각.

## R7. 캘린더 탭 포커스 재조회

- **Decision**: `frontend/src/app/navigation/MainTabNavigator.tsx` 내 `CalendarTab` 에 `useFocusEffect(useCallback(() => { void fetchMonthlySummary(year, month); }, [year, month, fetchMonthlySummary]))`를 추가한다.
- **Rationale**:
  - 현재 `useEffect([year, month])`만 존재 → 다른 탭에서 발생한 mutation을 감지하지 못한다(Issue 6).
  - `useFocusEffect`는 탭 전환/재포커스 시점에 안정적으로 실행되며, 과도한 리페치는 동일 월 키로 React Query/수동 캐시 도입 없이도 사용자 체감 수준에서 충분히 최신성을 보장한다.
- **Alternatives considered**:
  1. Zustand `useTodoStore`에 월간 summary 캐시 도입 + mutation 후 캐시 무효화 — 향후 확장에 적절하나 본 스펙은 최소 변경을 우선(헌법 VI). 후속 이터레이션으로 이관(spec Assumptions 명시).
  2. `AppState` 이벤트나 글로벌 이벤트 버스 — 추상화 비용 대비 이익 부족. 기각.

## R8. 테스트 전략

- **Backend (Jest + Supertest)**:
  - `complete-onboarding.usecase.spec.ts` — 미완료 → 완료 전이, 이미 완료 시 멱등 반환, 존재하지 않는 사용자 시 `NotFoundException`.
  - `user.controller.e2e-spec.ts` — 인증된 요청만 통과, 응답 DTO에 `hasCompletedOnboarding: true` 포함.
  - `get-profile.usecase.spec.ts`/`update-settings.usecase.spec.ts` — 응답 매핑 회귀.
  - DB 마이그레이션 검증 — 컬럼 추가 및 백필이 반영된 상태로 프로필 응답.
- **Frontend (Jest + RNTL)**:
  - `AuthNavigator.test.tsx` — 로딩 중 `LoadingSplash` 렌더, 로딩 종료 후 단 1회 `Main` 또는 `Onboarding` 렌더, 완료자가 알림 OFF 후에도 메인 유지, 미완료자는 온보딩 진입.
  - `usePushNotification.test.ts` — Android 플로우에서 채널 등록 → 권한 요청 → 수신 핸들러 연결 순서, 거부 시 조용한 실패.
- **Maestro E2E**:
  - `auth/onboarding-complete.yml` — 신규 가입 → 온보딩 통과 → 앱 재시작 → 메인 진입(재온보딩 없음).
  - `auth/onboarding-guard.yml` — 완료자가 외부 링크 등으로 온보딩 접근 시 메인으로 리다이렉트.
  - `home/no-flicker-after-login.yml` — 로그인 후 첫 화면이 메인인지 단일 프레임 검증(중간 온보딩 프레임 포착 시 fail).
  - `calendar/focus-refetch.yml` — 홈에서 todo 추가 → 캘린더로 전환 → 오늘 날짜 카운트 증가 확인.
  - `notification/android-permission.yml` — 최초 실행 권한 프롬프트 표시 → 허용 후 수신 핸들러 이벤트 감지(테스트 환경에서 수동 트리거로 대체 가능).

## R9. Constitution 준수 점검

- 원칙 III(TDD): 각 Group에 대해 실패 테스트 → 구현 → 리팩터 순. tasks.md 단계에서 tasks가 red-first로 정렬되도록 한다.
- 원칙 IV(계층 분리): Backend `controller → usecase → domain → repository` 경계 준수, 신규 usecase는 `@Injectable()`로 등록.
- 원칙 X(Maestro): 위 R8의 YAML 파일 5종 신설.
- 원칙 VI(단순성): 신규 라이브러리 도입 없음. 기존 `@react-native-firebase/messaging`, `expo-notifications`, TypeORM 재사용.

## 확정 요약

| 영역 | 결정 |
|------|------|
| 온보딩 상태 표현 | `has_completed_onboarding` 컬럼 + DTO/타입 전파 (R1) |
| 완료 기록 API | `POST /users/me/onboarding/complete` 멱등 (R2) |
| 마이그레이션 | 컬럼 추가 + 전원 `TRUE` 백필 (R3) |
| 플리커 방지 | `LoadingSplash` 분리 + `hasCompletedOnboarding` 단독 판정 (R4) |
| Android FCM | `POST_NOTIFICATIONS` 매니페스트 + `setNotificationChannelAsync` (R5) |
| iOS | APNs 부재 방어적 no-op + 크래시 0건 보장 (R6) |
| 캘린더 갱신 | `useFocusEffect` 기반 재조회 (R7) |
| 테스트 | Backend Jest/Supertest + Frontend RTL + Maestro 5종 (R8) |

모든 NEEDS CLARIFICATION이 해소되었다. Phase 1 진입 가능.
