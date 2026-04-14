# Implementation Plan: 로그인 라우팅 · 알림 · 캘린더 동기화 결함 수정

**Branch**: `007-fix-login-notif-calendar` | **Date**: 2026-04-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-fix-login-notif-calendar/spec.md`

## Summary

사용자 보고 6건의 결함을 세 그룹으로 묶어 일괄 수정한다.

- **Group A (P1)** — `hasCompletedOnboarding` 필드를 도메인에 1급 속성으로 도입하여 "온보딩 완료 여부"를 알림 시간 필드 추론에서 분리한다. DB 컬럼 추가 + 전용 엔드포인트 신설(`POST /users/me/onboarding/complete`, 멱등) + 프론트 판별 로직·플리커 가드 재설계. 기존 사용자는 `TRUE`로 일괄 백필.
- **Group B (P2)** — Android: `POST_NOTIFICATIONS` 권한 선언 + 기본 알림 채널 등록으로 Android 13+ 실기기에서 FCM 도달을 회복한다. iOS: Apple Developer 미등록·APNs 미구성이 **Out of Scope**로 확정되었으므로, 본 이터레이션에서는 iOS 알림 경로가 APNs 부재 하에서도 **크래시 없이 방어적 no-op**으로 동작하도록 코드 레벨 준비만 수행한다.
- **Group C (P3)** — 캘린더 탭에서 `useFocusEffect`로 현재 월의 `getMonthlySummary`를 재조회하여 홈 탭 mutation을 반영한다. 전역 상태 공유는 후속 이관.

모든 변경은 TDD(Red → Green → Refactor)로 진행하며, Frontend 수정은 Maestro E2E 회귀로 마감한다.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend & Backend)
**Primary Dependencies**:
- Frontend — React Native (Expo ~55), `@react-native-firebase/app`, `@react-native-firebase/messaging`, `expo-notifications`, `@react-navigation/native`, Zustand, i18next
- Backend — NestJS v11, TypeORM, `class-validator`/`class-transformer`

**Storage**: Supabase (PostgreSQL) via TypeORM — `TODOLIST_USER` 테이블에 `has_completed_onboarding BOOLEAN NOT NULL DEFAULT FALSE` 컬럼 추가, 기존 사용자 전원 `TRUE` 백필.
**Testing**:
- Backend — Jest (unit, integration), Supertest (controller e2e)
- Frontend — Jest + React Native Testing Library (unit/컴포넌트), **Maestro MCP** (E2E)

**Target Platform**:
- Android 13(API 33)+ 실기기 및 에뮬레이터 — Group B 측정 대상
- iOS — 코드 레벨 준비만 (APNs 미구성 하에서 크래시 없음 확인)

**Project Type**: Mobile + API (Expo RN + NestJS) — 기존 모노레포(`frontend/`, `backend/`) 재사용
**Performance Goals**:
- 로그인 직후 화면 전환 1회(SC-002), 메인↔온보딩 플리커 0%
- Android FCM 도달률 ≥ 95% (SC-005)
- 캘린더 탭 포커스 재조회 응답은 네트워크 정상 조건에서 사용자 체감 지연 없이 반영(SC-006)
**Constraints**:
- 기존 `TODOLIST_USER` 스키마와 `user-profile.dto.ts` 변경이 역호환적이어야 한다(컬럼 추가, 기존 필드 유지).
- iOS 측은 APNs 미구성 상태에서 앱 크래시 0건(SC-008).
- 구성 헌법 X(Maestro E2E)에 따라 Frontend 변경은 Maestro YAML 추가/갱신 필수.
**Scale/Scope**:
- 변경 파일 수: 백엔드 ~7개, 프론트 ~5개, DB 마이그레이션 1개, Maestro YAML ~3개(인증/홈/캘린더·알림 회귀)
- 기존 사용자 백필: 단일 `UPDATE` 쿼리, 수백~수천 행 수준 (현재 서비스 규모 기준)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | 원칙 | 평가 | 근거 |
|---|------|------|------|
| I | 한국어 우선 | **Pass** | 본 plan·spec·ADR·PR 본문 한국어 작성, 코드 식별자는 영어 유지. |
| II | 엄격한 TypeScript | **Pass** | `any` 금지, 프론트 `UserProfile`/백 `UserProfileDto`에 `hasCompletedOnboarding: boolean` 추가. class-validator로 입력 검증. |
| III | TDD 우선 | **Pass** | Phase 순서: (1) 실패 테스트 작성 → (2) 구현 → (3) 리팩터. Backend Jest, Frontend RTL, Maestro E2E 모두 red → green. |
| IV | 계층 분리 | **Pass** | `user.controller` → `complete-onboarding.usecase` → `domain/user.entity` → `infrastructure/user.repository` 경로 준수. Frontend도 screen → feature → service 경계 유지. |
| V | 실패 처리·관측성 | **Pass** | `LoadingSplash` 신설(FR-003), 권한 거부 시 앱 정상 동작(FR-013), 백엔드 에러 코드 `NOT_FOUND`/`ALREADY_COMPLETED`(멱등 반환) 구조화 로그. |
| VI | 단순성 우선 | **Pass** | Group C는 옵션 1(useFocusEffect) 채택, Zustand 캐시 도입은 후속 이관. Group B는 기존 `expo-notifications`/`@react-native-firebase/messaging` 재사용. |
| VII | 명세서 중심 | **Pass** | `docs/DDL.sql`, `docs/API_SPEC.md`를 본 feature와 동시 갱신. `docs/specs/fix-bug.md` 상위 설계 문서 참조. |
| VIII | 주석 전략 | **Pass** | WHY 중심 주석만, 기존 `AuthNavigator.tsx` 주석 구조 유지·갱신. `CompleteOnboardingUsecase`는 멱등성 이유를 JSDoc으로 명시. |
| IX | 브랜치 전략 | **Pass** | `007-fix-login-notif-calendar` feature 브랜치에서 진행 후 main으로 PR. |
| X | Maestro E2E | **Pass** | `.maestro/auth/onboarding-*.yml`, `.maestro/home/calendar-focus-refetch.yml`, `.maestro/notification/android-permission.yml` 신설·갱신. |

**결과**: 위반 없음 — Phase 0 진행 허용.

## Project Structure

### Documentation (this feature)

```text
specs/007-fix-login-notif-calendar/
├── plan.md              # This file
├── spec.md              # Feature spec (완료)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (REST contract)
│   └── users-onboarding-complete.md
├── checklists/
│   └── requirements.md  # specify 단계 산출물
└── tasks.md             # (/speckit.tasks 단계에서 생성)
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── user/
│       ├── user.controller.ts                       # [편집] POST /users/me/onboarding/complete 추가
│       ├── user.module.ts                           # [편집] provider 등록
│       ├── application/
│       │   ├── complete-onboarding.usecase.ts       # [신규]
│       │   ├── get-profile.usecase.ts               # [편집] 응답 매핑에 hasCompletedOnboarding
│       │   ├── update-settings.usecase.ts           # [편집] 응답 매핑에 hasCompletedOnboarding
│       │   └── dto/
│       │       └── user-profile.dto.ts              # [편집] hasCompletedOnboarding!: boolean
│       ├── domain/
│       │   └── user.entity.ts                       # [편집] @Column has_completed_onboarding
│       └── infrastructure/
│           └── user.repository.ts                   # (필요 시 매핑 보강)
└── test/
    └── user/
        ├── complete-onboarding.usecase.spec.ts      # [신규] 멱등성·도메인 단위
        └── user.controller.e2e-spec.ts              # [편집] POST 엔드포인트 계약 테스트

frontend/
├── src/
│   ├── app/
│   │   └── navigation/
│   │       ├── AuthNavigator.tsx                    # [편집] LoadingSplash + showMain/Onboarding 재정의
│   │       ├── MainTabNavigator.tsx                 # [편집] CalendarTab useFocusEffect 재조회
│   │       ├── isUserOnboarded.ts                   # [편집] hasCompletedOnboarding === true 판정
│   │       └── LoadingSplash.tsx                    # [신규] 공통 로딩 화면
│   ├── features/
│   │   ├── notification/
│   │   │   ├── usePushNotification.ts               # [편집] 권한 플로우·채널 등록 강화
│   │   │   ├── setupNotificationChannel.ts          # [신규] Android default 채널 등록
│   │   │   └── ensureIOSPushSafety.ts               # [신규] APNs 미구성 시 defensive no-op
│   │   └── onboarding/
│   │       └── completeOnboardingApi.ts             # [신규] POST /users/me/onboarding/complete 호출
│   ├── services/
│   │   └── api/userApi.ts                           # [편집] completeOnboarding 메소드 추가
│   └── types/
│       └── user.ts                                  # [편집] hasCompletedOnboarding: boolean
├── app.json                                         # [편집] POST_NOTIFICATIONS 권한 + default channel meta
└── __tests__/
    ├── app/navigation/AuthNavigator.test.tsx        # [편집] 플리커 없음·가드 동작
    └── features/notification/usePushNotification.test.ts  # [편집]

docs/
├── DDL.sql                                          # [편집] has_completed_onboarding 컬럼
└── API_SPEC.md                                      # [편집] POST /users/me/onboarding/complete 추가

.maestro/
├── auth/
│   ├── onboarding-complete.yml                      # [신규] 신규 가입 → 완료 → 재로그인 → 메인
│   └── onboarding-guard.yml                         # [신규] 완료자 온보딩 재진입 차단
├── home/
│   └── no-flicker-after-login.yml                   # [신규] 메인 1회 렌더·플리커 0
├── calendar/
│   └── focus-refetch.yml                            # [신규] 홈 추가 → 캘린더 최신화
└── notification/
    └── android-permission.yml                       # [신규] 최초 실행 권한 프롬프트
```

**Structure Decision**: Option 3 (Mobile + API). 기존 모노레포 구조(`backend/`, `frontend/`, `.maestro/`, `docs/`)를 그대로 재사용하며 신규 디렉토리는 생성하지 않는다. iOS 전용 파일(`ensureIOSPushSafety.ts`)은 APNs 부재 환경에서의 방어 코드이며, Apple Developer 등록 후 후속 이터레이션에서 실구성과 동시에 확장된다.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (해당 없음) | 헌법 게이트 10개 항목 모두 통과, 신규 추상화·서드파티 라이브러리 도입 없음 | — |
