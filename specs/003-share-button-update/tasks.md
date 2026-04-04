# Tasks: 공유 버튼 기능 변경

**Input**: Design documents from `/specs/003-share-button-update/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: TDD 필수 (헌법 III, X). 단위 테스트 및 Maestro E2E 테스트 포함.

**Organization**: US1(팝업 구성 변경)과 US2(클립보드 복사 및 토스트 위치)로 분리. US2는 US1의 팝업 변경에 의존한다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/src/`, `frontend/__tests__/`
- **E2E**: `.maestro/`

---

## Phase 1: Setup

**Purpose**: 훅 리네이밍 및 테스트 기반 준비

- [x] T001 `useShareTodo` 훅의 `shareToSelf` → `copyToClipboard` 리네이밍 단위 테스트 작성 in `frontend/__tests__/unit/features/share/useShareTodo.test.ts`
- [x] T002 `useShareTodo` 훅에서 `shareToSelf` → `copyToClipboard`로 함수명 변경 in `frontend/src/features/share/useShareTodo.ts` (depends on T001)

**Checkpoint**: `copyToClipboard` 함수가 기존 `shareToSelf`와 동일하게 동작하며, 단위 테스트 통과 확인

---

## Phase 2: User Story 1 — 공유하기 및 클립보드 복사 팝업 (Priority: P1) 🎯 MVP

**Goal**: 공유 팝업에서 "나에게 전송" 버튼을 제거하고, "공유하기" → "클립보드 복사" 순서로 메뉴를 재구성한다.

**Independent Test**: 공유 버튼을 탭하여 팝업이 열리고, "공유하기"와 "클립보드 복사" 버튼이 순서대로 표시되며, "나에게 전송" 버튼이 존재하지 않는지 확인한다.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T003 [P] [US1] `ShareButton` 컴포넌트 단위 테스트 업데이트 — 메뉴에 "공유하기", "클립보드 복사" 순서로 표시되고 "나에게 전송"이 없는지 검증하는 테스트 작성 in `frontend/__tests__/unit/components/todo/ShareButton.test.tsx`
- [x] T004 [P] [US1] Maestro E2E 테스트 업데이트 — 팝업 메뉴에 "공유하기", "클립보드 복사" 순서 확인, "나에게 전송" 부재 확인 in `.maestro/share/share_todo.yml`

### Implementation for User Story 1

- [x] T005 [US1] `ShareButton` 컴포넌트에서 "나에게 전송" 메뉴 아이템 제거, "공유하기" → "클립보드 복사" 순서로 메뉴 재구성, testID를 `share-to-self` → `copy-to-clipboard`로 변경 in `frontend/src/components/todo/ShareButton.tsx`
- [x] T006 [US1] Maestro plan E2E 테스트에서 `share-to-self` testID를 `copy-to-clipboard`로 업데이트 in `.maestro/plan/share.yml`

**Checkpoint**: 공유 버튼 탭 → "공유하기", "클립보드 복사" 순서로 팝업 표시. "나에게 전송" 없음. 단위 테스트 및 E2E 통과.

---

## Phase 3: User Story 2 — 클립보드 복사 및 결과 토스트 표시 (Priority: P1)

**Goal**: "클립보드 복사" 탭 시 할 일 목록이 클립보드에 복사되고, 결과 토스트가 화면 중하단(~65%)에 표시된 후 2초 뒤 자동 소멸한다.

**Independent Test**: "클립보드 복사"를 탭한 뒤, 클립보드에 데이터가 복사되었는지 확인하고, 토스트가 화면 중하단 영역에 표시되었다가 자동으로 사라지는지 확인한다.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [US2] `ShareButton` 컴포넌트 단위 테스트 — 토스트가 절대 위치(화면 높이 ~65%)에 렌더링되는지 검증하는 테스트 작성 in `frontend/__tests__/unit/components/todo/ShareButton.test.tsx`

### Implementation for User Story 2

- [x] T008 [US2] `ShareButton` 컴포넌트에서 토스트(성공/오류 모두)를 `useWindowDimensions`를 사용하여 화면 높이의 ~65% 지점에 절대 위치로 배치, 수평 중앙 정렬 적용 in `frontend/src/components/todo/ShareButton.tsx`
- [x] T009 [US2] Maestro E2E 테스트에 클립보드 복사 후 토스트가 화면 중하단에 표시되는지 검증 스텝 추가 in `.maestro/share/share_todo.yml`

**Checkpoint**: 클립보드 복사 성공/실패 토스트가 화면 중하단에 표시, 2초 뒤 자동 소멸. 단위 테스트 및 E2E 통과.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: 전체 검증 및 문서 동기화

- [x] T010 전체 단위 테스트 실행 (`cd frontend && npm test`) 및 린트 통과 확인 (`cd frontend && npm run lint`)
- [x] T011 [P] Maestro E2E 전체 플로우 테스트 실행 — 공유 관련 E2E 시나리오 통과 확인
- [x] T012 [P] Edge case 및 기존 기능 검증 — (1) 할 일 없는 상태에서 공유 버튼 탭 시 "공유할 할 일이 없습니다" Alert 정상 표시, (2) "공유하기" 탭 시 네이티브 공유 시트 정상 동작 확인 (FR-008/SC-005), (3) 토스트 표시 중 사용자 동작(스크롤 등) 시 정상 동작 확인

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 의존성 없음 — 즉시 시작 가능
- **Phase 2 (US1)**: Phase 1 완료 필요 (`copyToClipboard` 리네이밍 이후 메뉴 재구성)
- **Phase 3 (US2)**: Phase 2 완료 필요 (팝업 메뉴에 "클립보드 복사" 버튼이 존재해야 토스트 위치 변경 가능)
- **Phase 4 (Polish)**: Phase 2, 3 모두 완료 후 실행

### User Story Dependencies

- **US1 (팝업 구성 변경)**: Phase 1 이후 시작 가능
- **US2 (토스트 위치 변경)**: US1 완료 후 시작 (같은 파일 `ShareButton.tsx` 수정)

### Within Each User Story

- 테스트를 먼저 작성하고 실패 확인 (TDD Red)
- 구현 후 테스트 통과 확인 (TDD Green)
- 리팩터링 필요 시 수행 (TDD Refactor)

### Parallel Opportunities

- T001 → T002 순차 실행 (TDD: 테스트 먼저 → 구현)
- T003, T004는 병렬 실행 가능 (단위 테스트/E2E 테스트가 다른 파일)
- T010, T011, T012는 병렬 실행 가능 (독립적 검증 작업)

---

## Sequential Example: Phase 1

```bash
# TDD 순서: 테스트 먼저 → 구현
Task: "T001 useShareTodo.test.ts — shareToSelf → copyToClipboard 테스트 업데이트"
# T001 완료 후:
Task: "T002 useShareTodo.ts — shareToSelf → copyToClipboard 리네이밍"
```

## Parallel Example: User Story 1

```bash
# 단위 테스트와 E2E 테스트를 병렬로:
Task: "T003 ShareButton.test.tsx — 메뉴 순서/문구 검증 테스트"
Task: "T004 share_todo.yml — Maestro E2E 메뉴 검증"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: `copyToClipboard` 리네이밍
2. Phase 2: 팝업 메뉴 재구성 (US1)
3. **STOP and VALIDATE**: 메뉴에 "공유하기" → "클립보드 복사" 순서 표시, "나에게 전송" 없음

### Incremental Delivery

1. Phase 1 → 훅 리네이밍 완료
2. Phase 2 (US1) → 팝업 구성 변경 완료 → 검증 (MVP!)
3. Phase 3 (US2) → 토스트 위치 변경 완료 → 검증
4. Phase 4 → 전체 검증 및 정리

---

## Notes

- [P] tasks = 다른 파일, 의존성 없음
- [Story] label = 특정 User Story에 매핑
- TDD 필수: 테스트 실패 → 구현 → 통과 순서 준수
- 변경 대상 파일이 적으므로 (3개 소스 + 2개 테스트 + 2개 E2E) 순차 실행도 효율적
- 총 태스크: 12개 (Setup 2 + US1 4 + US2 3 + Polish 3)
- 커밋은 Phase 단위로 수행 권장
