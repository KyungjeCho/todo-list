---

description: "Task list for feature 012-apple-fcm-integration"
---

# Tasks: 애플 기기 FCM 연동

**Input**: Design documents from `/specs/012-apple-fcm-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/register-device.md, quickstart.md

**Tests**: 헌법 III(TDD NON-NEGOTIABLE)에 따라 테스트 태스크를 **포함**한다. 각 사용자 스토리 내에서 실패 테스트 → 구현 → 리팩터 순서를 지킨다.

**Organization**: 3개 사용자 스토리(P1/P2/P3) 기준. 각 스토리는 독립 구현·테스트·배포 가능.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일을 건드리고 선행 의존이 없어 병렬 실행 가능
- **[Story]**: 어떤 사용자 스토리에 속하는지 (US1, US2, US3)
- 모든 설명에 **절대 경로 또는 저장소 기준 상대 경로** 포함

## Path Conventions

monorepo 구조(`frontend/`, `backend/`, `.maestro/`) — plan.md의 "Project Structure" 섹션 참고.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 새 테스트/디렉터리와 프런트 보조 의존성 준비.

- [X] T001 [P] 새 Maestro 디렉터리 `.maestro/notification/` 를 생성한다(빈 디렉터리라도 `.gitkeep` 포함).
- [X] T002 [P] `frontend/package.json` 의존성에서 `expo-device` 존재 여부 확인, 없으면 `cd frontend && npx expo install expo-device` 로 설치하고 `package.json`·lockfile 을 커밋한다.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: iOS 푸시 수신을 위한 네이티브 엔터타이틀먼트. 이 단계 완료 전에는 US1~US3 어떤 스토리도 실기기에서 검증할 수 없다.

**⚠️ CRITICAL**: No user story work can begin (실기기 검증) until this phase is complete.

- [X] T003 `frontend/app.json` 의 `expo.ios` 블록에 `"entitlements": { "aps-environment": "development" }` 키를 추가한다. 기존 `bundleIdentifier`·`googleServicesFile`·`supportsTablet`는 보존.
- [X] T004 `cd frontend && npx expo prebuild --platform ios --clean` 실행 후 생성된 `frontend/ios/frontend/frontend.entitlements` 에 `aps-environment` 키가 포함되어 있는지 확인하고, 변경 내용을 커밋한다.

**Checkpoint**: iOS 네이티브 푸시 엔터타이틀먼트 준비 완료 — 이후 US1~US3 병렬 진행 가능.

---

## Phase 3: User Story 1 - iOS 사용자가 Todo 알림을 실제로 수신 (Priority: P1) 🎯 MVP

**Goal**: iOS 실기기로 로그인한 사용자가 Plan/Review 알림을 알림 센터/잠금 화면/포그라운드에서 수신하고, 탭 시 해당 모드 화면으로 진입한다.

**Independent Test**: 실기기에서 앱 로그인 → 권한 허용 → 백엔드로 Plan/Review 발송 트리거 → 10초 이내 단말 수신 확인. 알림 탭 시 Main의 해당 모드 화면 진입 확인. (Android 경로 미영향.)

### Tests for User Story 1 (TDD — 실패 확인 먼저) ⚠️

- [X] T005 [P] [US1] Jest 훅 테스트 `frontend/__tests__/features/notification/usePushNotification.test.ts` 를 작성한다. 시나리오:
  - (a) 권한 허용 + `getToken` 성공 시 `onRegisterDevice({ fcmToken, deviceType: 'IOS', deviceName })` 가 호출되고 `deviceName` 이 `Device.modelName` 으로 채워짐.
  - (b) `Device.modelName === null` 일 때 `deviceName` 필드가 **payload 에서 생략**되어 호출됨(fallback, research.md R-004 부속 결정).
  - (c) **토큰 갱신(FR-003)**: 초기 등록 이후 `onTokenRefresh` 가 발화하면 새 `fcmToken` + 동일 `deviceName` 으로 `onRegisterDevice` 가 재호출됨.
  - (firebase-messaging · expo-device 모킹, 구현 전 실패 확인.)
- [X] T006 [P] [US1] Jest 유닛 테스트 `backend/test/notification/send-notification.ios.spec.ts` 를 작성한다. `deviceType='IOS'` 토큰을 대상으로 `FcmService.sendPushNotification` 이 payload `{ type:'PLAN', title, body }` 형태로 호출되고 성공 로그가 토큰 프리픽스(8자)만 포함함을 검증. 구현 전 실패 확인.
- [X] T007 [P] [US1] Maestro E2E `.maestro/notification/ios_permission_register.yml` 를 작성한다. 프로젝트 `.maestro/config.yaml` 의 기존 `onFlowStart(launchApp, stopApp: true)` 규약을 따르고 **`clearState: true` 는 사용하지 않는다**(Expo Dev Client 호환 이슈로 config.yaml 주석에 명시된 프로젝트 관례). 흐름: 로그인 완료 → iOS 권한 다이얼로그 수락(`tapOn: "Allow"`, 텍스트 fallback 은 `"허용"`) → 메인 진입 → `extendedWaitUntil visible: { id: "push-status-registered" }` 로 T013 의 관찰 신호가 보일 때까지 대기. 사전 서브스텝: `.maestro/config.yaml` 의 `appId` 가 `com.todolist.app` 인지 재확인.

### Implementation for User Story 1

- [X] T008 [P] [US1] `frontend/src/app/navigation/types.ts` 의 `RootStackParamList.Main` 파라미터에 `mode?: 'PLAN' | 'REVIEW'` 선택 필드를 추가한다(없는 경우). 기존 필드 보존.
- [X] T009 [US1] `frontend/src/features/notification/notificationTapRouter.ts` 를 신설한다. `@react-native-firebase/messaging` 의 `getInitialNotification`(종료 상태)·`onNotificationOpenedApp`(백그라운드) 을 구독하고, 메시지 `data.type` (`'PLAN'|'REVIEW'`) 을 파싱하여 외부에서 주입받은 `navigate` 콜백으로 `Main` 라우트에 `{ mode }` 파라미터를 전달한다. `data.type` 누락 또는 비인식값이면 no-op.
- [X] T010 [US1] `frontend/src/app/navigation/AuthNavigator.tsx` 에 React Navigation 의 `navigationRef` 를 도입(또는 재사용)하고, 인증된 사용자(`showMain === true`) 렌더 시점에 T009 의 라우터를 구독 시작 / 언마운트 시 해제한다.
- [X] T011 [US1] `frontend/src/features/notification/usePushNotification.ts` 를 수정한다. `expo-device` 의 `Device.modelName` (fallback: `Device.deviceName` 또는 `Platform.OS + Platform.Version`) 로 `deviceName` 을 계산하여 `onRegisterDevice` 호출 시 함께 전달한다. 실패·undefined 인 경우 `deviceName` 을 생략하여 기존 백엔드 동작을 유지.
- [X] T012 [US1] `frontend/src/screens/main/MainScreen` 사용처(예: `AuthNavigator.tsx` 의 `MainWrapper`) 에서 `route.params?.mode` 가 주어졌을 때 초기 `modeOverride` 를 해당 값으로 설정하도록 연결한다.
- [X] T013 [US1] E2E 관찰 신호용 요소를 `frontend/src/screens/main/MainScreen` (또는 `MainWrapper`) 에 추가한다. `usePushNotification` 의 `onTokenRegistered` 콜백으로 로컬 state `isPushRegistered` 를 `true` 로 전환하고, 해당 state 가 true 일 때만 `<View testID="push-status-registered" style={{ width: 0, height: 0 }} accessible={false} pointerEvents="none" />` 를 렌더한다. 시각 영향 0, 프로덕션에서도 안전. T007 Maestro 가 이 testID 를 관찰 기준으로 사용.

### Verification

- [ ] T014 [US1] 실기기 스모크: `specs/012-apple-fcm-integration/quickstart.md` D-1 ~ D-3 (첫 로그인 → 알림 수신 → 포그라운드 상태) 를 수동 수행하고 결과를 PR 본문 체크리스트에 기록한다. **DEFERRED** — 실기기 + APNs 키 업로드 선행 필요. PR 리뷰어/QA 가 수행.

**Checkpoint**: US1 단독으로 iOS 기본 푸시 수신·탭 라우팅 동작.

---

## Phase 4: User Story 2 - 권한 요청 및 상태 관리 (Priority: P2)

**Goal**: iOS 권한 다이얼로그가 첫 로그인 시 1회 노출, 거부 시 크래시 없음·토큰 등록 호출 없음, 이후 시스템 설정에서 허용 전환 시 앱 재실행(또는 active 전환)으로 토큰 등록이 이뤄짐.

**Independent Test**: 시뮬레이터 권한 리셋 상태에서 앱 실행 → 다이얼로그 1회 노출 확인. 거부 후 DB 에 IOS 행 미생성·앱 에러 스택 없음 확인. 설정에서 허용으로 바꾼 뒤 앱 포그라운드 복귀 → `POST /users/me/devices` 1회 호출 확인.

### Tests for User Story 2 (TDD) ⚠️

- [X] T015 [P] [US2] Jest 훅 테스트 `frontend/__tests__/features/notification/usePushNotification.permission.test.ts` 를 작성한다. `requestPermission` 이 `0`(거부) 을 반환할 때 `onRegisterDevice` 가 호출되지 않고 `onError` 도 호출되지 않으며 훅이 크래시 없이 반환됨을 검증.
- [X] T016 [P] [US2] 같은 파일에 시나리오 확장: `AppState` 가 `background → active` 로 바뀔 때 권한이 허용 상태로 감지되면 `getToken` 및 `onRegisterDevice` 가 **1회**만 추가 호출됨을 검증(무한 루프 방지).

### Implementation for User Story 2

- [X] T017 [US2] `frontend/src/features/notification/usePushNotification.ts` 에 `AppState.addEventListener('change', ...)` 구독을 추가한다. `nextAppState === 'active'` 이고 내부 상태에 "토큰 미보유" 플래그가 true 일 때만 권한 재평가·토큰 획득·`onRegisterDevice` 를 1회 재시도한다. unmount 시 구독 해제.

### Verification

- [ ] T018 [US2] 실기기 스모크: `quickstart.md` D-4, D-5 (권한 거부 경로 → 설정 허용 후 전환) 수동 수행 후 결과를 PR 본문에 기록. **DEFERRED — 실기기 필요**

**Checkpoint**: US1 과 US2 둘 다 독립적으로 작동. 권한 거부 경로 견고성 확보.

---

## Phase 5: User Story 3 - 다기기·토큰 갱신 대응 (Priority: P3)

**Goal**: 한 사용자가 iPhone + iPad 양쪽에서 로그인하면 두 기기 모두 알림 수신, 앱 재설치/토큰 갱신 시 기존 deviceName 의 옛 토큰만 soft-delete 되고 새 토큰 행이 활성화, 로그아웃 시 해당 기기 수신 중단.

**Independent Test**: iPhone+iPad 각각 로그인 → 두 행 활성 → 발송 시 양쪽 수신. iPad 로그아웃 → iPhone 만 수신. iPhone 재설치 → iPhone 의 옛 행 soft-deleted, 새 행 활성, iPad 행은 영향 없음.

### Tests for User Story 3 (TDD) ⚠️

- [X] T019 [P] [US3] Jest 유닛 테스트 `backend/test/notification/user-device.repository.spec.ts` 를 작성(또는 기존 스펙 확장)한다. 시나리오:
  - (a) `deviceName` 이 제공되면 같은 `(userId, deviceType, deviceName)` 다른 토큰만 soft-delete 되고 같은 `deviceType` 의 다른 `deviceName` 행은 유지됨.
  - (b) `deviceName` 이 미제공이면 기존 `(userId, deviceType)` 기준 soft-delete 규칙이 그대로 적용됨(Android 회귀 방지).
  - (c) 동일 `fcmToken` 재등록 시 soft-delete 된 행이 복원됨(기존 동작 보존).
- [X] T020 [P] [US3] Jest 통합 테스트 `backend/test/notification/logout-device-cleanup.spec.ts` 를 작성한다. `deleteByFcmTokenForOwner` 호출 시 해당 행만 soft-delete 되고 같은 userId 의 다른 deviceName 행은 보존됨.
- [X] T021 [P] [US3] Jest 유닛 테스트 `backend/test/notification/send-notification.multi-device.spec.ts` 를 작성한다. 시나리오:
  - (a) 한 userId 에 활성 iOS 기기 2 개(서로 다른 deviceName) 가 있을 때 `SendNotificationUsecase.execute` 가 두 fcmToken 모두에 `FcmService.sendPushNotification` 을 호출.
  - (b) **APNs 만료 iOS 회귀(FR-005)**: iOS 토큰으로의 `sendPushNotification` 이 `messaging/registration-token-not-registered` 에러를 throw 할 때 `UserDeviceRepository.deleteByFcmToken` 가 해당 토큰으로 정확히 1회 호출되고, 동일 userId 의 다른(유효) iOS 토큰은 영향받지 않음.
  - (c) 동일 사용자의 모든 iOS 토큰이 영구 실패일 때 `NotificationLog` 는 FAIL 1건·SUCCESS 0건으로 기록.

### Implementation for User Story 3

- [X] T022 [US3] `backend/src/notification/infrastructure/user-device.repository.ts` 의 `upsertDevice` 를 수정한다. soft-delete 쿼리 WHERE 절에 **`deviceName` 이 제공된 경우에만** `device_name = :deviceName` 조건을 추가한다. `deviceName` 이 undefined/null 이면 기존 WHERE(= `(userId, deviceType)`) 를 그대로 사용한다. 기존 WHY 주석은 보강하여 "deviceName 도입 이유(R-004)" 를 한 줄 남긴다.

### Verification

- [ ] T023 [US3] 실기기 스모크: `quickstart.md` D-6 ~ D-8 (iPhone+iPad 공존 / 일부 로그아웃 / 앱 재설치) 수동 수행 후 결과를 PR 본문에 기록. **DEFERRED — 실기기 필요**

**Checkpoint**: US1/US2/US3 모두 독립적으로 동작. iOS FCM 파이프라인 완성.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 문서 동기화, 정적 검증, 관측성 재확인, PR 준비.

- [X] T024 [P] `CLAUDE.md` 의 "## Apple OAuth (011-apple-oauth-login)" 섹션 다음에 `## Apple FCM (012-apple-fcm-integration)` 섹션을 추가한다. 내용: (1) `aps-environment` 엔터타이틀먼트 주입 위치, (2) `upsertDevice` 다기기 규칙(`deviceName` 조건부), (3) 로그 민감값 규칙(토큰 프리픽스만), (4) Maestro E2E 파일 경로. Recent Changes 리스트에도 한 줄 추가.
- [X] T025 [P] 백엔드 린트·타입·단위 테스트 통과 확인: `cd backend && npm run lint && npm run build && npm test`. 실패 시 해당 태스크에서 수정.
- [X] T026 [P] 프런트 린트·타입·단위 테스트 통과 확인: `cd frontend && npm run lint && npx tsc --noEmit && npm test`.
- [X] T027 PR 준비: `git diff origin/main...HEAD` 로 변경된 로그 출력 문자열에 FCM 토큰 전체/APNs Key ID/Team ID 가 포함되지 않는지 수동 검토. 포함 시 해당 커밋 수정.
- [ ] T028 최종 스모크: `specs/012-apple-fcm-integration/quickstart.md` 의 Section A(코드 테스트), B(엔터타이틀먼트), E(로그 민감도) 를 전체 재실행 + Section D(실기기) 에서 **T014/T018/T023 수행 시 누락되거나 통과하지 못한 하위 항목만** 재수행하여 DoD 체크리스트 전부 체크. 결과를 PR 본문에 첨부. **DEFERRED — Section D 는 실기기 필요; Section A/B/E 자동 검증분은 T025/T026/T027 로 완료됨.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존 없음 — 즉시 시작 가능.
- **Foundational (Phase 2)**: Setup 완료 후 시작. **모든 스토리의 실기기 검증을 블록**(코드 구현은 Phase 2 없이도 선행 가능하나 실제 수신 검증은 불가).
- **User Stories (Phase 3~5)**: Foundational 완료 후 시작. 셋은 서로 독립적으로 구현 가능하지만 실기기 검증은 Phase 2 가 있어야 의미 있음.
- **Polish (Phase 6)**: 해당 범위에서 완료하려는 스토리 모두 완료 후 시작.

### User Story Dependencies

- **US1 (P1)**: Foundational 완료 후 시작 가능. 다른 스토리에 의존하지 않음.
- **US2 (P2)**: Foundational 완료 후 시작 가능. US1 과 같은 파일(`usePushNotification.ts`) 을 수정하므로 순차 작업 권장(아래 주의).
- **US3 (P3)**: Foundational 완료 후 시작 가능. 백엔드 `user-device.repository.ts` + 기존 프런트 `deviceName` 이 필요. 프런트 `deviceName` 은 US1 의 T011 에서 이미 설정되므로 US1 T011 선행 추천. 백엔드 변경은 독립.

### Within Each User Story

- 테스트(T005/T006/T007 등)는 **구현보다 먼저** 작성하고 실패 확인.
- 프런트: 네비게이션 타입(T008) → 라우터 구현(T009) → 라우터 연결(T010) 순서.
- 백엔드: 리포지토리 수정(T022)은 유닛 테스트(T019)와 짝.
- 스토리 완료(Verification 포함) 후 다음 우선순위 스토리로 이동.

### Parallel Opportunities

- Phase 1 의 T001, T002 는 서로 독립 → 병렬.
- US1 테스트 T005/T006/T007 는 각각 다른 파일·다른 레이어 → 병렬.
- US3 테스트 T019/T020/T021 은 모두 독립 파일 → 병렬.
- Polish 의 T024/T025/T026 는 서로 독립 → 병렬.
- 서로 다른 사용자 스토리(US1·US3)는 팀 인원이 있으면 병렬 가능하나 `usePushNotification.ts` 를 건드리는 US1 T011 과 US2 T017 은 순차 작업.

---

## Parallel Example: User Story 1 테스트 동시 작성

```bash
# 병렬로 실패 테스트 3건 작성(서로 다른 파일):
Task: "frontend/__tests__/features/notification/usePushNotification.test.ts 작성"
Task: "backend/test/notification/send-notification.ios.spec.ts 작성"
Task: ".maestro/notification/ios_permission_register.yml 작성"
```

## Parallel Example: User Story 3 테스트 동시 작성

```bash
Task: "backend/test/notification/user-device.repository.spec.ts 작성"
Task: "backend/test/notification/logout-device-cleanup.spec.ts 작성"
Task: "backend/test/notification/send-notification.multi-device.spec.ts 작성"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Phase 1 Setup(T001~T002) 완료.
2. Phase 2 Foundational(T003~T004) 완료 — **CRITICAL**.
3. Phase 3 US1(T005~T014) 완료.
4. **STOP and VALIDATE**: 실기기 스모크(T014) 통과 시 Plan/Review iOS 수신 MVP 확보.
5. PR 분리 배포 가능(P1 단독 릴리스 시).

### Incremental Delivery

1. Setup + Foundational → 기반 준비.
2. US1 → 실기기 검증 → MVP 배포.
3. US2 → 권한 경로 견고화 → 증분 배포.
4. US3 → 다기기 공존 → 증분 배포.
5. Polish(T024~T028) → 문서·정적 검증·PR 준비.

### Parallel Team Strategy

- 팀 A: US1 (프런트 라우팅 + 백엔드 iOS 발송 테스트).
- 팀 B: US3 (백엔드 `upsertDevice` 규칙 + 다기기 테스트) — US1 T011(deviceName 전달) 완료 후 실기기 검증 시작.
- US2 는 US1 직후 동일 파일 수정이라 팀 A 가 이어서 수행.

---

## Notes

- [P] = 다른 파일, 선행 의존 없음.
- [Story] 라벨로 스토리 추적.
- 모든 테스트는 **실패 확인 후** 구현(Constitution III).
- 로그 작성 시 토큰 프리픽스 8자만 허용, Key ID/Team ID/Auth Key 절대 로깅 금지.
- PR 체크리스트에 "민감값 로그 재확인" 항목 포함(T027).
- 스키마 변경 없음(DDL 생성 금지, 마이그레이션 파일 생성 금지).
