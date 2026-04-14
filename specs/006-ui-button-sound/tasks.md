---
description: "Task list for feature 006 — UI 버튼 클릭음 추가"
---

# Tasks: UI 버튼 클릭음 추가

**Input**: Design documents in `/specs/006-ui-button-sound/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/sound-feedback.contract.ts ✅, quickstart.md ✅
**Branch**: `feature/006-ui-button-sound`

**Tests**: **REQUIRED** (헌법 III — TDD 우선 원칙, 헌법 X — Maestro E2E). 각 단계에서 실패하는 테스트를 먼저 작성(Red) 후 구현(Green).

**Organization**: 작업은 사용자 스토리(P1/P2/P3)로 묶여 각각 독립 구현·테스트·데모가 가능하도록 구성됨.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일 + 의존 없음 → 병렬 가능
- **[Story]**: 해당 작업이 속한 사용자 스토리 (US1, US2, US3)
- 모든 경로는 저장소 루트 기준 상대 경로

## Path Conventions (Mobile, Frontend 단독)

- Source: `frontend/src/`
- Tests: `frontend/__tests__/`
- E2E: `.maestro/`
- Assets: `frontend/assets/`
- Backend/DB: **변경 없음**

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 디렉토리/키 네임스페이스 준비. 신규 패키지 설치 없음(`expo-audio`, `expo-secure-store` 이미 설치·링크됨).

- [X] T001 [P] Create directory `frontend/src/features/sound/` for the sound feature module
- [X] T002 [P] Create directory `frontend/src/components/common/` for the shared Pressable wrapper
- [X] T003 [P] Create directory `frontend/__tests__/features/sound/` for unit/integration tests of the sound module
- [X] T004 [P] Create directory `frontend/__tests__/components/common/` for SoundPressable tests
- [X] T005 [P] Create file `frontend/src/features/sound/index.ts` exporting the public surface (`useClickSound`, `soundService`, `SoundPressable` re-export) — placeholder exports only

**Checkpoint**: Directory scaffold ready; no runtime change yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 스토리가 의존하는 핵심 싱글톤(플레이어 + 설정 스토어) 구축. TDD 순서(Red → Green)를 엄수.

**⚠️ CRITICAL**: 이 단계 완료 전에는 어떤 User Story도 착수할 수 없다.

### Tests (Red — write first, must fail)

- [X] T006 [P] Write failing unit tests for `soundStore` in `frontend/__tests__/unit/store/soundStore.test.ts` (path aligned with existing `__tests__/unit/` convention)
- [X] T007 [P] Write failing unit tests for `soundService` in `frontend/__tests__/unit/features/sound/soundService.test.ts`
- [X] T054 [P] Write failing rapid-tap test in `frontend/__tests__/unit/features/sound/soundService.rapidTap.test.ts`
- [X] T008 [P] Write failing integration test for app bootstrap in `frontend/__tests__/unit/app/bootstrap.test.tsx`

### Implementation (Green)

- [X] T009 [P] Implement `frontend/src/store/soundStore.ts`
- [X] T010 Implement `frontend/src/features/sound/soundService.ts`
- [X] T011 Wire `App.tsx` bootstrap in `frontend/App.tsx`
- [X] T012 [P] Update `frontend/src/features/sound/index.ts` (partial — `useClickSound`/`SoundPressable` added in US1 step)

**Checkpoint**: Foundation ready. Preload and hydrate wired. All foundational tests pass (Green). User stories may begin.

---

## Phase 3: User Story 1 — 모든 탭 가능한 UI에서 클릭음 재생 (Priority: P1) 🎯 MVP

**Goal**: 사용자가 앱 내 상호작용 UI(주요 버튼, 리스트 항목, 토글, 탭 등)를 탭하면 150ms 이내에 일관된 클릭음이 재생된다. 비활성/제스처 동작에서는 재생되지 않는다.

**Independent Test**: 안드로이드 에뮬레이터에서 로그인 화면, 메인 할 일 화면의 주요 버튼을 탭하여 클릭음 1회 재생 확인. 비활성 버튼 탭 시 무음, 100ms 간격 연속 탭 시 끊김 없음.

### Tests for User Story 1 (Red)

- [X] T013 [P] [US1] Unit tests for `useClickSound` — `frontend/__tests__/unit/features/sound/useClickSound.test.ts`
- [X] T014 [P] [US1] Component tests for `SoundPressable` — `frontend/__tests__/unit/components/common/SoundPressable.test.tsx`
- [X] T055 [P] [US1] Scroll-cancel integration test — `frontend/__tests__/unit/components/common/SoundPressable.scroll.test.tsx`
- [X] T015 [US1] Maestro E2E flow — `.maestro/settings/button-click-sound-plays.yaml`

### Implementation for User Story 1

- [X] T016 [P] [US1] Implement `frontend/src/features/sound/useClickSound.ts`
- [X] T017 [P] [US1] Implement `frontend/src/components/common/SoundPressable.tsx`
- [X] T018 [US1] Replace `TouchableOpacity` with `SoundPressable` in `frontend/src/components/todo/VoiceTodoButton.tsx`
- [X] T019 [P] [US1] Replace `TouchableOpacity` with `SoundPressable` in `frontend/src/components/todo/CompleteDayButton.tsx`
- [X] T020 [P] [US1] Replace `TouchableOpacity` with `SoundPressable` in `frontend/src/components/todo/ShareButton.tsx`
- [X] T021 [P] [US1] Replace `TouchableOpacity` with `SoundPressable` in `frontend/src/components/todo/ModeToggle.tsx`
- [X] T022 [P] [US1] Replace `TouchableOpacity` with `SoundPressable` in `frontend/src/components/todo/TodoActionButtons.tsx`
- [X] T023 [P] [US1] Replace `TouchableOpacity` with `SoundPressable` in `frontend/src/components/todo/TodoItem.tsx` (tap targets only)
- [X] T024 [US1] 전체 Jest 통과 (569 pass)
- [X] T025 [US1] Maestro `.maestro/settings/button-click-sound-plays.yaml` 에뮬레이터 수동 실행 확인 완료

**Checkpoint**: US1 완료 — MVP 기능 동작. 설정 토글은 아직 없지만 기본값(켜짐)으로 클릭음 재생이 검증된다.

---

## Phase 4: User Story 2 — 사용자 설정에서 버튼음 끄기 (Priority: P2)

**Goal**: 설정 화면에 "버튼 클릭음" 토글을 추가하여 사용자가 On/Off를 제어하고, 앱 재실행 후에도 상태가 유지된다.

**Independent Test**: 설정 화면 진입 → 토글 OFF → 여러 화면의 버튼 탭 시 무음 확인 → 앱 완전 종료 후 재실행 → 여전히 OFF 유지 확인 → 다시 ON → 즉시 클릭음 재생 확인.

### Tests for User Story 2 (Red)

- [X] T026 [P] [US2] Write failing translation-keys test in `frontend/__tests__/i18n/button-sound-keys.test.ts` asserting that `settings.buttonClickSound` (label) and `settings.buttonClickSoundDescription` (sub-text, if used) exist with non-empty values in `ko.json`, `en.json`, `ja.json`, `es.json`
- [X] T027 [P] [US2] Write failing component test for the settings toggle in `frontend/__tests__/screens/settings/SettingsScreen.buttonSound.test.tsx` covering: renders Switch with `testID="button-sound-toggle"`, initial value mirrors `useSoundStore` enabled, toggling calls `setEnabled(newValue)`, toggle value updates when store changes externally
- [X] T028 [US2] Write failing Maestro E2E flow in `.maestro/settings/button-sound-toggle.yaml` covering: launchApp with `clearState: true`, login, navigate to settings, tap `button-sound-toggle` to OFF, return to main, tap a primary button (asserts handler still runs), reopen app, navigate to settings, assert toggle still OFF via value check

### Implementation for User Story 2

- [X] T029 [P] [US2] Add translation keys `settings.buttonClickSound` in `frontend/src/i18n/locales/ko.json` ("버튼 클릭음")
- [X] T030 [P] [US2] Add translation keys `settings.buttonClickSound` in `frontend/src/i18n/locales/en.json` ("Button click sound")
- [X] T031 [P] [US2] Add translation keys `settings.buttonClickSound` in `frontend/src/i18n/locales/ja.json` ("ボタンのクリック音")
- [X] T032 [P] [US2] Add translation keys `settings.buttonClickSound` in `frontend/src/i18n/locales/es.json` ("Sonido de clic del botón")
- [X] T033 [US2] Edit `frontend/src/screens/settings/SettingsScreen.tsx` to add a new "소리/피드백" section **directly below the existing "알림 설정" section**, containing a single row with label `t('settings.buttonClickSound')`, `Switch` `testID="button-sound-toggle"`, value from `useSoundStore(s => s.enabled)`, `onValueChange` calls `useSoundStore.getState().setEnabled(next)`; reuse existing styles (`section`, `sectionTitle`, `settingRow`, `settingLabelFlex`, `iconContainer`)
- [X] T034 [P] [US2] Replace `TouchableOpacity` with `SoundPressable` in `frontend/src/screens/auth/` login/logout primary buttons (P2: screen-level primary actions)
- [X] T035 [P] [US2] Replace `TouchableOpacity` with `SoundPressable` in the logout button + info-row buttons in `frontend/src/screens/settings/SettingsScreen.tsx` (do not wrap the new Switch itself)
- [X] T036 [US2] Run `npm --prefix frontend test -- i18n screens/settings` and ensure US2 tests pass (Green)
- [X] T037 [US2] Run `maestro test .maestro/settings/button-sound-toggle.yaml` on an Android emulator and confirm green

**Checkpoint**: US2 완료 — 사용자 토글이 동작하며 재시작 후에도 유지된다. US1과 결합 시 MVP + 사용자 선호 제어가 함께 전달된다.

---

## Phase 5: User Story 3 — 시스템 오디오 환경 존중 (Priority: P3)

**Goal**: 기기 무음 모드/미디어 볼륨 정책을 자연스럽게 따르고, 음성 입력 화면에서 녹음 품질을 저해하지 않는다.

**Independent Test**: 에뮬레이터 미디어 볼륨 0 → 버튼 탭 무음. "Do not disturb"/무음 모드 → 버튼 탭 무음. 음성 녹음 시작 → 녹음 중 버튼 탭 무음 → 녹음 종료 → 다시 클릭음 재생.

### Tests for User Story 3 (Red)

- [X] T038 [P] [US3] Write failing test in `frontend/__tests__/features/sound/soundService.recording-guard.test.ts` asserting that `setRecordingActive(true)` blocks `play()` and `setRecordingActive(false)` restores it (assert via mocked `expo-audio` player — no `play()` call reaches the mock while active)
- [X] T039 [P] [US3] Write failing test in `frontend/__tests__/features/todo/useVoiceRecording.soundGuard.test.ts` asserting that `startRecording` invokes `soundService.setRecordingActive(true)` before native record start and `stopRecording` invokes `soundService.setRecordingActive(false)` on success AND failure paths
- [X] T040 [P] [US3] Write failing static-check test in `frontend/__tests__/features/sound/noCustomAudioSession.test.ts` asserting that `frontend/src/features/sound/soundService.ts` does **not** import or call `setAudioModeAsync` (greps the file) — guarantees platform default session policy per research.md R2
- [X] T052 [P] [US3] Write failing Maestro E2E flow in `.maestro/voice/recording-silences-click.yaml` covering: `launchApp` with `clearState: true`, login, navigate to voice input screen, start recording, tap a primary button whose handler increments a visible counter (testID verifiable) during recording, assert the counter updates (handler fires) while the tap produces no sound (manual audio check noted in comments), stop recording, tap the same button once more and assert the counter again updates — verifies recording guard does not break tap handlers (FR-013 + 헌법 원칙 X/DoD #7)

### Implementation for User Story 3

- [X] T041 [US3] Modify `frontend/src/features/todo/useVoiceRecording.ts` to call `soundService.setRecordingActive(true)` at the start of `startRecording` (after permission grant) and `soundService.setRecordingActive(false)` inside a `finally`-like cleanup in both `stopRecording` and the `startRecording` error branch
- [X] T042 [US3] If T040 flagged a `setAudioModeAsync` reference in `frontend/src/features/sound/soundService.ts`, remove it; otherwise mark T042 as verified-by-T040 and close without edit
- [X] T043 [US3] Run `npm --prefix frontend test -- soundService useVoiceRecording` and ensure US3 tests pass (Green)
- [X] T053 [US3] Run `maestro test .maestro/voice/recording-silences-click.yaml` on an Android emulator and confirm green; capture a short screen recording to archive the silent-during-recording evidence for the PR description
- [X] T044 [US3] Manual validation per quickstart.md §3F–G on an Android emulator: media volume 0 and Do-not-Disturb both yield silent taps without affecting app behavior

**Checkpoint**: US3 완료 — 녹음 세션과 시스템 정책에 대한 방어 확정. 세 스토리가 독립적으로 동작한다.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 점진 교체 마무리, 문서 동기화, 회귀 점검.

- [X] T045 [P] Replace remaining `TouchableOpacity` occurrences in list rows and option items across `frontend/src/screens/settings/TimezoneSelectScreen.tsx` and `frontend/src/components/voice/*` with `SoundPressable` where the element owns a tap-to-act behavior (skip gesture/scroll cases)
- [X] T046 [P] Run `npm --prefix frontend run lint` and fix any rule violations introduced by the changes
- [X] T047 [P] Run `npm --prefix frontend test -- --coverage` and verify new files have ≥80% line coverage (soundStore, soundService, useClickSound, SoundPressable)
- [X] T048 [P] Update `CLAUDE.md` "Recent Changes" block to include `006-ui-button-sound` (if not already inserted by `update-agent-context.sh`)
- [X] T049 Run full Maestro regression: `maestro test .maestro/full_flow.yml` and the two new files under `.maestro/settings/` to confirm no regression on existing user journeys
- [X] T050 Execute quickstart.md §3 manual scenarios A–G on the Android emulator; additionally measure tap→sound perceived latency on at least 5 primary buttons (target ≤150ms per FR-011/SC-002) and frame-drop delta vs. baseline via React DevTools Profiler (target ≤5% per SC-004); record discrepancies as follow-up issues (not blockers)
- [ ] T051 Create PR from `feature/006-ui-button-sound` → `main` with linked spec/plan/tasks and a "Test plan" checklist derived from this file

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Phase 1 — **blocks all user stories**
- **US1 (Phase 3)**: depends on Phase 2
- **US2 (Phase 4)**: depends on Phase 2; independent of US1 but integrates with `SoundPressable` for extra button replacements
- **US3 (Phase 5)**: depends on Phase 2 and T010 (soundService); interacts with `useVoiceRecording` but is orthogonal to US1/US2
- **Polish (Phase 6)**: depends on all three user stories being at Green

### Within Each User Story

- Red tests (T013/T014/T015 for US1, T026/T027/T028 for US2, T038/T039/T040 for US3) MUST fail before their implementation tasks begin
- `SoundPressable` (T017) before any Touchable replacement (T018–T023, T034–T035, T045)
- `useSoundStore` (T009) before `SettingsScreen` edit (T033)
- `soundService` (T010) before `useClickSound` (T016), `SoundPressable`(T017), and `useVoiceRecording` guard (T041)

### Parallel Opportunities

- All Phase 1 tasks (T001–T005) are independent directories/files → parallel
- Phase 2 Red tests (T006–T008) parallel; implementation T009/T010 mostly parallel (different files) but T011 must wait for both
- Within US1: T013/T014 parallel, Touchable replacements T019–T023 parallel after T017 done
- Within US2: translation files T029–T032 parallel, replacement tasks T034/T035 parallel after T017 done
- Within US3: T038/T039/T040 parallel
- Phase 6: T045/T046/T047/T048 parallel

---

## Parallel Example — User Story 1

```bash
# Red tests in parallel (different files):
Task: "Write failing tests in frontend/__tests__/features/sound/useClickSound.test.ts"
Task: "Write failing tests in frontend/__tests__/components/common/SoundPressable.test.tsx"
Task: "Write failing Maestro flow in .maestro/settings/button-click-sound-plays.yaml"

# Touchable replacements in parallel once SoundPressable is ready:
Task: "Replace in frontend/src/components/todo/CompleteDayButton.tsx"
Task: "Replace in frontend/src/components/todo/ShareButton.tsx"
Task: "Replace in frontend/src/components/todo/ModeToggle.tsx"
Task: "Replace in frontend/src/components/todo/TodoActionButtons.tsx"
Task: "Replace in frontend/src/components/todo/TodoItem.tsx"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Phase 1 (Setup) → Phase 2 (Foundational with hydrate + preload wired) → Phase 3 (US1)
2. **STOP & VALIDATE**: 안드로이드 에뮬레이터에서 주요 버튼 탭 → 클릭음 1회 재생, 비활성/제스처 무음 확인
3. 이 시점에서 설정 토글이 없어도 "기본 켜짐" 상태로 MVP 가치 전달 가능

### Incremental Delivery

1. Setup + Foundational → 기반 완성
2. US1 → 데모 (기본 ON, 전 화면 주요 버튼 대상)
3. US2 → 데모 (사용자 선호 제어)
4. US3 → 데모 (무음 모드/녹음 세션 방어)
5. Polish → PR + 회귀 확인

### Parallel Team Strategy

- 한 사람이 Foundational 완료 후, 다음 단계에서:
  - 개발자 A: US1 Touchable 교체 묶음
  - 개발자 B: US2 설정 UI + i18n 키
  - 개발자 C: US3 녹음 가드 연동
- 교체 대상 파일이 겹치지 않으므로 merge 충돌 리스크 낮음

---

## Format Validation

- [x] 모든 작업이 `- [ ]` 체크박스로 시작
- [x] 모든 작업에 고유 TaskID(T001~T051)
- [x] User Story 단계 작업에 [US?] 라벨
- [x] Setup/Foundational/Polish 단계에는 [US?] 라벨 없음
- [x] 모든 작업이 구체적 파일 경로 또는 명령 포함
- [x] 병렬 가능 작업만 [P] 표시
- [x] 테스트 작업이 구현 작업보다 앞에 위치 (Red → Green)

---

## Summary

- **Total tasks**: 55 (T001–T055; non-contiguous — remediation tasks T052–T055 appended at logical insertion points to avoid downstream renumbering)
- **Setup**: 5 (T001–T005)
- **Foundational**: 8 (T006–T012 + T054)
- **US1 (MVP)**: 14 (T013–T025 + T055)
- **US2**: 12 (T026–T037)
- **US3**: 9 (T038–T044 + T052, T053)
- **Polish**: 7 (T045–T051)
- **Parallel opportunities**: Phase 1 전부, Phase 2 Red 4개(T006/T007/T054/T008)·구현 2개, US1 Red 3개(T013/T014/T055) 동시·교체 5개 동시, US2 번역 4개 동시, US3 Red 4개(T038/T039/T040/T052) 동시
- **Suggested MVP**: T001–T025 + T054/T055 완료 시점 (Setup + Foundational + US1 + 연속 탭/제스처 가드 테스트). 설정 토글·녹음 가드는 후속 인크리먼트
- **Backend/DB 변경**: 없음 (research.md R4)
- **신규 네이티브 모듈**: 없음 → EAS dev 빌드 불필요
- **Remediation applied (from /speckit.analyze)**: C1(T052, T053 — US3 Maestro E2E), G1(T054 연속 탭 테스트 + T050 지연/성능 수동 측정 보강), G2(T014 확장 + T055 scroll 통합 테스트), D1(T042 축약), A1(T033 배치 확정 — "소리/피드백" 신규 섹션)
