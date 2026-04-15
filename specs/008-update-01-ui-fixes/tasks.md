---

description: "Task list for 008-update-01-ui-fixes"
---

# Tasks: 업데이트 묶음 01 — 로그인/온보딩 비주얼, 타임존 표시, 계획알림 아이콘, 이월 데이터 보존

**Input**: Design documents from `/specs/008-update-01-ui-fixes/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/no-api-change.md ✓, quickstart.md ✓

**Tests**: 헌법 III(TDD NON-NEGOTIABLE) + X(Maestro E2E)에 따라 모든 US에 테스트 태스크를 **선행**으로 포함한다.

**Organization**: Tasks are grouped by user story (P1 → P2 → P3). 각 US는 독립적으로 구현·검증·배포 가능.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일을 수정하며 의존이 없어 병렬 가능
- **[Story]**: US1~US4
- 모든 경로는 리포지토리 루트(`/home/jkjk396/workspace/todo-list/dev-log/todo-list`) 기준 상대 경로

## Path Conventions (Mobile + API)

- Backend: `backend/src/`, `backend/test/`
- Frontend: `frontend/src/`, `frontend/__tests__/`
- E2E: `.maestro/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 본 feature에 필요한 최소 의존성·에셋 준비

- [X] T001 Frontend에 `expo-linear-gradient` 설치 — `cd frontend && npx expo install expo-linear-gradient` 후 `frontend/package.json`과 lockfile 커밋
- [X] T002 [P] OAuth 브랜드 에셋 디렉터리 생성 — `frontend/src/assets/oauth/` 빈 디렉터리 + `.gitkeep`(실제 이미지는 US3에서 추가)
- [X] T003 [P] `.maestro/settings/` 디렉터리 생성(존재하지 않을 경우) + `.maestro/auth/`, `.maestro/calendar/` 재사용 확인

**Checkpoint**: 의존성·디렉터리 준비 완료.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 US에서 공유할 수 있는 공통 유틸 및 검증 스캐폴드

**⚠️ CRITICAL**: Phase 2 완료 전에는 어느 US도 시작하지 않는다.

- [X] T004 Spec·Plan 재확인 후 기존 회귀 스위트 Green 확인 — `cd backend && npm test && npm run lint` 및 `cd frontend && npm test && npm run lint` 로그 첨부
- [X] T005 [P] `docs/API_SPEC.md` 내 이월·계획알림·타임존 표현 문장을 본 변경에 맞게 갱신 준비(실제 diff는 US1/US2/US4 완료 후) — 섹션 식별 및 주석 TODO 기록 (`docs/API_SPEC.md`)

**Checkpoint**: 변경 시작 전 현재 상태가 Green임을 확인.

---

## Phase 3: User Story 1 — 이월 시 어제 todo 보존 (Priority: P1) 🎯 MVP

**Goal**: 자정 이월 시 어제 원본 todo의 상태 전이를 제거해 원본이 `ACTIVE/INACTIVE/COMPLETED` 상태로 보존되게 한다. 이월 중복 방지와 신규 오늘 todo 생성은 그대로 유지.

**Independent Test**: 어제 날짜에 todo(미완료 3 + 완료 2) 시드 → `CarryoverSchedulerUsecase.execute(now)` 실행 → (1) 오늘 날짜에 미완료 3개가 ACTIVE로 생성됨 (2) 어제 원본 5개가 원래 status 그대로 유지됨 (3) 재실행 시 중복 없음.

### Tests for User Story 1 (TDD — RED 먼저)

- [X] T006 [P] [US1] `backend/test/unit/scheduler/application/carryover-scheduler.usecase.spec.ts` 수정: 기존 "원본 status가 CARRIED_OVER로 변경된다" 단언을 **"원본 status가 그대로 유지된다"** 로 교체, "이월 루틴 2회 실행 시 중복 없음", "신규 오늘 todo는 ACTIVE로 생성된다" 단언 확인/추가 → 실행 시 실패(RED) 확인
- [X] T007 [P] [US1] `backend/test/unit/todo/application/get-todos.usecase.spec.ts` 업데이트: 어제 조회 시 원본 todo가 `CARRIED_OVER` 상태가 아닌 원래 상태로 반환되더라도 `isCarriedOver === true`가 되는 케이스(`carriedOverToIds.has(id)` 기반)를 단언
- [X] T008 [US1] `.maestro/calendar/day-detail.yml`에 "어제 화면 진입 → 원본 todo 5건 visible" 스텝 추가(현재 flow 유지하면서 assertion 확장)

### Implementation for User Story 1

- [X] T009 [US1] `backend/src/scheduler/application/carryover-scheduler.usecase.ts` 수정: transaction 내부에서 `todo.status = TodoStatus.CARRIED_OVER; await txTodoRepo.save(todo);` 두 줄 제거. 나머지(`CarriedOverHistory` 조회/생성, 신규 `ACTIVE` todo 생성, UNIQUE 보장)는 유지. 관련 WHY 주석을 "원본 보존 + history로 중복 방지" 취지로 갱신.
- [X] T010 [US1] `backend/src/todo/application/get-todos.usecase.ts` 정리: `isCarriedOver` 계산식에서 `todo.status === TodoStatus.CARRIED_OVER` 분기를 제거하고 `carriedOverToIds.has(todo.id)` 단일 판정으로 단순화. `nonCarriedOverCount` 주석(진행률 계산 의도) 갱신.
- [X] T011 [US1] T006~T010 변경 후 백엔드 전체 테스트 Green 확인 — `cd backend && npm test -- --testPathPattern="scheduler|todo" && npm run lint`
- [ ] T012 [US1] 안드로이드 에뮬레이터에서 `maestro test .maestro/calendar/day-detail.yml` 실행 → Green 확인(로컬 백엔드와 연동)
- [X] T013 [US1] `docs/TECH_SPEC.md` 및/또는 `docs/API_SPEC.md` 중 이월 동작을 설명한 섹션을 "어제 원본 보존" 표현으로 갱신

**Checkpoint**: 이월 루틴 실행 후에도 어제 원본이 보존되며 중복 이월이 없고 UI 상 어제 화면이 기존 목록을 그대로 보여준다.

---

## Phase 4: User Story 2 — '계획알림' 아이콘 상태 동기화 (Priority: P2)

**Goal**: 설정 화면의 '계획알림' 토글과 아이콘이 Zustand 단일 셀렉터를 공유해 즉시 동기화되고, 저장 실패 시 롤백된다.

**Independent Test**: 토글 ON→OFF→ON 반복 시 아이콘 accessibilityLabel/시각 변형이 1초 이내 값과 일치, 저장 API mock 실패 시 이전 상태로 복원.

### Tests for User Story 2

- [X] T014 [P] [US2] `frontend/__tests__/unit/screens/settings/SettingsScreen.planIcon.test.tsx` 신규 생성: (a) 초기 ON 렌더 시 아이콘 `accessibilityLabel === '계획알림 활성'` (b) 토글 OFF 시 `'계획알림 비활성'` (c) 저장 API mock reject 시 이전 값으로 롤백 (d) **스토어를 `planNotificationEnabled: false` 로 시드하고 SettingsScreen 을 최초 마운트했을 때 아이콘이 비활성 상태로 렌더됨**(FR-006 재시작·재진입 일치 보증) — 실행 시 RED 확인
- [X] T015 [P] [US2] `frontend/__tests__/unit/features/notification/planNotificationToggle.test.ts` 신규 생성: optimistic 업데이트 + rollback 시나리오(resolve/reject/timeout) 단언
- [X] T016 [US2] `.maestro/settings/plan-reminder-icon.yml` 신규: launchApp(clearState) → 설정 진입 → 토글 변경 → 아이콘 accessibilityLabel 단언(on/off)

### Implementation for User Story 2

- [X] T017 [P] [US2] `frontend/src/components/settings/PlanNotificationIcon.tsx` 신규(또는 기존 리팩터): Zustand 셀렉터로 `planNotificationEnabled` 구독, 값에 따라 on/off 아이콘 + `accessibilityLabel` 렌더. 로컬 state 미사용.
- [X] T018 [P] [US2] `frontend/src/features/notification/planNotificationToggle.ts` 신규 또는 정비: `togglePlanNotification(next)` — optimistic set → API 호출 → 실패 시 이전 값으로 revert + 토스트
- [X] T019 [US2] `frontend/src/screens/settings/SettingsScreen.tsx` 수정: 로컬 복사 state 제거, `PlanNotificationIcon` 사용, 토글 핸들러를 `togglePlanNotification`으로 교체(의존: T017, T018)
- [X] T020 [US2] 프론트 유닛 테스트 Green 확인 — `cd frontend && npx jest __tests__/unit/screens/settings/SettingsScreen.planIcon.test.tsx __tests__/unit/features/notification/planNotificationToggle.test.ts`
- [ ] T021 [US2] Maestro 실행 — `maestro test .maestro/settings/plan-reminder-icon.yml` Green

**Checkpoint**: 토글과 아이콘이 완전히 동기화되며 실패 시 롤백된다.

---

## Phase 5: User Story 3 — 로그인/온보딩 그라데이션 + OAuth 브랜드 아이콘 (Priority: P3)

**Goal**: `LoginScreen`과 `OnboardingScreen`에 `expo-linear-gradient` 배경 적용 + Google/Kakao/Apple 브랜드 아이콘 이미지 버튼 표시.

**Independent Test**: 로그아웃 상태로 앱 실행 → (1) 로그인/온보딩 배경이 그라데이션으로 렌더 (2) 3개 OAuth 버튼 각각에 브랜드 아이콘 `Image` 노출, 다크 모드에서도 가독성 유지.

### Tests for User Story 3

- [X] T022 [P] [US3] `frontend/__tests__/unit/screens/auth/LoginScreen.test.tsx` 갱신: `LinearGradient` 컴포넌트가 렌더되는지, `google`/`kakao`/`apple` 버튼 각각에 `Image`(testID `oauth-icon-google` 등)가 존재하는지 단언 — RED 확인
- [X] T023 [P] [US3] `frontend/__tests__/unit/screens/onboarding/OnboardingScreen.test.tsx` 갱신: `LinearGradient` 렌더 단언
- [X] T024 [P] [US3] `frontend/__tests__/unit/components/auth/OAuthProviderButton.test.tsx` 신규: `Image.onError` 발생 시 텍스트-only 폴백 렌더 단언(FR-010)
- [X] T025 [US3] `.maestro/auth/login-visual.yml` 신규: 로그인 화면에서 testID `oauth-icon-google`, `oauth-icon-kakao`, `oauth-icon-apple` 각각 visible 확인

### Implementation for User Story 3

- [X] T026 [P] [US3] `frontend/src/assets/oauth/google.png`, `kakao.png`, `apple.png` 추가(각 제공자 공식 브랜드 가이드 준수 에셋). **기본 전략: 단일 컬러 아이콘 + 버튼 배경 대비 확보**로 라이트/다크 공용. 브랜드 가이드가 별도 다크 버전을 요구하는 제공자가 있으면 해당 파일만 `*-dark.png`로 추가하고 `OAuthProviderButton`이 `useColorScheme()`로 분기. 결정 근거·링크를 PR 설명에 명시.
- [X] T027 [P] [US3] `frontend/src/components/auth/OAuthProviderButton.tsx` 신규(또는 기존 수정): props로 provider 받아 해당 아이콘 `Image` 렌더 + `onError`에서 아이콘 숨김 + 텍스트 유지, `accessibilityLabel` 지정
- [X] T028 [US3] `frontend/src/screens/auth/LoginScreen.tsx` 수정: 루트를 `<LinearGradient>`로 래핑, 기존 `PROVIDERS.map` 결과에서 `OAuthProviderButton` 사용(의존: T026, T027)
- [X] T029 [US3] `frontend/src/screens/onboarding/OnboardingScreen.tsx` 수정: 배경을 `<LinearGradient>`로 래핑, 다크 모드 색상 토큰 적용
- [ ] T030 [US3] 다크 모드 가독성 수동 검증(FR-011) 후 결과를 PR 설명에 스크린샷 또는 체크 기록
- [X] T031 [US3] 프론트 유닛 테스트 Green 확인 — `cd frontend && npx jest __tests__/unit/screens/auth __tests__/unit/screens/onboarding __tests__/unit/components/auth`
- [ ] T032 [US3] Maestro 실행 — `maestro test .maestro/auth/login-visual.yml` Green

**Checkpoint**: 로그인/온보딩이 새 비주얼로 렌더되고 OAuth 플로우는 기존과 동일하게 동작.

---

## Phase 6: User Story 4 — 타임존 라벨 국가명/도시명 (Priority: P3)

**Goal**: `Asia/Seoul`, `Asia/Tokyo`를 "South Korea/Seoul", "Japan/Tokyo"로 영어 고정 표기(i18n 리소스 추가 없음). 저장 값은 IANA 그대로 유지. 검색은 새 라벨로도 매칭.

**Independent Test**: 타임존 선택 화면에서 (1) 한국/일본 항목이 영문 국가명/도시명으로 렌더 (2) 저장 후 재진입해도 같은 라벨 유지 (3) "Korea"/"Seoul" 등 검색 시 필터 포함.

### Tests for User Story 4

- [X] T033 [P] [US4] `frontend/__tests__/unit/i18n/timezoneLabel.test.ts` 신규: `formatTimezoneLabel('Asia/Seoul')` === 'South Korea/Seoul', `formatTimezoneLabel('Asia/Tokyo')` === 'Japan/Tokyo' 단언 + 매핑 없는 IANA(예: `'America/New_York'`)는 IANA 원문 폴백. 앱 언어 의존성이 없으므로 언어별 매트릭스 불필요 — RED 확인
- [X] T034 [P] [US4] `frontend/__tests__/unit/screens/settings/TimezoneSelectScreen.test.tsx` 갱신: 한/일 항목이 "South Korea/Seoul", "Japan/Tokyo" 형식으로 표시, "Korea"/"Seoul"/"South" 검색 시 결과 포함 단언, **선택 콜백(`onSelect`/store setter)이 IANA 원본 문자열(`'Asia/Seoul'`, `'Asia/Tokyo'`)로 호출됨**(FR-014 저장 포맷 호환성 보증)
- [X] T035 [US4] `.maestro/settings/timezone-label.yml` 신규: 설정 → 타임존 선택 진입 → 텍스트 "South Korea/Seoul" visible 확인(앱 언어와 무관하게 영어 고정)

### Implementation for User Story 4

- [X] T036 [P] [US4] `frontend/src/i18n/timezones.ts`에 `TZ_TO_COUNTRY_CITY` 매핑(타입: `{ countryEn: string; cityEn: string }`)과 `formatTimezoneLabel(tz: string): string` 헬퍼 추가 — 한/일 초기 2건(`{countryEn:'South Korea', cityEn:'Seoul'}`, `{countryEn:'Japan', cityEn:'Tokyo'}`), 매핑 없으면 IANA 원문 폴백. **i18n 리소스·`t` 인자 사용하지 않음**(영어 상수 고정).
- [X] T037 [US4] `frontend/src/screens/settings/TimezoneSelectScreen.tsx` 수정: 리스트 렌더링에서 `formatTimezoneLabel(tz)` 사용, 검색 키에 (a) IANA 원문, (b) `countryEn`, (c) `cityEn` 3가지 포함(대소문자 무시). 저장값은 IANA 그대로 유지(의존: T036).
- [X] T038 [US4] 프론트 유닛 테스트 Green 확인 — `cd frontend && npx jest __tests__/unit/i18n/timezoneLabel.test.ts __tests__/unit/screens/settings/TimezoneSelectScreen.test.tsx`
- [ ] T039 [US4] Maestro 실행 — `maestro test .maestro/settings/timezone-label.yml` Green

**Checkpoint**: 한/일 타임존이 "South Korea/Seoul", "Japan/Tokyo"로 렌더되며 기존 저장 데이터와 완전 호환.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T040 [P] `docs/TECH_SPEC.md` "이월 동작" 섹션을 최종 구현에 맞춰 diff 반영
- [X] T041 [P] `docs/API_SPEC.md`의 계획알림·타임존 관련 문구 확인 및 필요 시 갱신(계약 자체는 변경 없음)
- [X] T042 [P] 루트 `CLAUDE.md`의 "Recent Changes"에 008 라인 추가(자동 업데이트 외 누락분)
- [X] T043 CI 전체 회귀 확인 — `cd backend && npm test && npm run lint && cd .. && cd frontend && npm test && npm run lint`
- [ ] T044 Maestro 전체 스모크 — `maestro test .maestro/auth/login-visual.yml`, `.maestro/settings/plan-reminder-icon.yml`, `.maestro/settings/timezone-label.yml`, `.maestro/calendar/day-detail.yml`, `.maestro/full_flow.yml`
- [X] T045 `specs/008-update-01-ui-fixes/quickstart.md`의 7. Definition of Done 체크리스트를 PR 설명에 체크 기록
- [ ] T046 PR 생성: `gh pr create --base main --head feature/008-update-01-ui-fixes` — US별 4개 커밋 또는 1 PR 다중 커밋 전략 중 택1(리뷰어와 사전 합의)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: 선행 없음
- **Phase 2 Foundational**: Phase 1 완료 후
- **Phase 3 US1 (P1) MVP**: Phase 2 완료 후 — **P1 우선 수행 권장**
- **Phase 4 US2 (P2)**: Phase 2 완료 후, US1과 독립
- **Phase 5 US3 (P3)**: Phase 1(T001) 완료 후, US1~US2와 독립
- **Phase 6 US4 (P3)**: Phase 2 완료 후, US1~US3와 독립
- **Phase 7 Polish**: 대상 US들이 완료된 이후

### Within Each User Story (TDD 순서)

1. 테스트 작성 → RED 확인
2. 구현
3. 테스트 GREEN
4. Maestro E2E(해당되는 경우)
5. 문서 싱크

### Parallel Opportunities

- Phase 2 완료 후 US1~US4를 서로 다른 개발자가 **동시에** 진행 가능
- 각 US 내부에서 [P] 태스크들은 다른 파일을 건드리므로 동시에 작성 가능
- US4는 i18n 리소스 변경이 없어 태스크가 더 단순하다(매핑+헬퍼 1건)

### Story Independence

| US | 독립 여부 | 비고 |
|----|-----------|------|
| US1 | ✅ 백엔드 단독 | 프론트 변경 불필요(표시는 기존 DTO에 의해 자동 해결) |
| US2 | ✅ 프론트 단독 | 백엔드 API 그대로 |
| US3 | ✅ 프론트 단독 | 백엔드 무관 |
| US4 | ✅ 프론트 단독 | 저장 포맷 IANA 유지로 백엔드 무관 |

---

## Parallel Example: 팀 4명일 때

```bash
# Phase 1~2 완료 후
# 개발자 A (백엔드): US1 전체
#   T006, T007 병렬 작성 → T009~T010 구현 → T011~T013

# 개발자 B (프론트): US2
#   T014, T015 병렬 → T017, T018 병렬 → T019 → T020~T021

# 개발자 C (프론트): US3
#   T022, T023, T024 병렬 → T026, T027 병렬 → T028, T029 → T030~T032

# 개발자 D (프론트): US4
#   T033, T034 병렬 → T036 → T037 → T038~T039
```

---

## Implementation Strategy

### MVP First (US1만)

1. Phase 1(Setup) + Phase 2(Foundational) 완료
2. Phase 3(US1) 완료 → 어제 todo 보존 회귀 차단(SC-001, SC-002 달성)
3. **STOP & VALIDATE**: `.maestro/calendar/day-detail.yml`과 백엔드 usecase 테스트로 검증
4. 여기까지만 배포해도 가장 영향 큰 데이터 유실 이슈 해결

### Incremental Delivery

1. US1 배포(P1 MVP) → 모니터링
2. US2 배포(P2) → '계획알림' 아이콘 버그 해결
3. US3 배포(P3) → 로그인/온보딩 비주얼 업그레이드
4. US4 배포(P3) → 타임존 라벨 현지화

각 배포는 이전 기능을 깨지 않는다(독립 슬라이스).

### Parallel Team Strategy

- Phase 1/2 함께 수행
- Phase 3~6 병렬 수행(위 4인 예시 참고)
- Phase 7에서 문서·E2E 스모크 통합

---

## Notes

- [P] 태스크는 서로 다른 파일 + 완료 의존 없음
- 모든 테스트는 작성 후 **먼저 RED**를 확인하고 구현에 진입
- Definition of Done은 `quickstart.md` 7절 체크리스트를 기준으로 PR에 첨부
- 브랜치: `feature/008-update-01-ui-fixes` → `main` PR. 직접 push 금지(헌법 IX)
