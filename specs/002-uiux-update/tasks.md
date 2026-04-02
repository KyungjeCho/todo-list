# Tasks: UI/UX 업데이트 — Plan 모드 화면 구현 및 디자인 시스템 정합성

**Input**: Design documents from `/specs/002-uiux-update/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: TDD 필수 (헌법 III. NON-NEGOTIABLE). 모든 기능 구현 전 실패하는 테스트 작성. Phase별 Maestro E2E 테스트 포함 (헌법 X).

**Organization**: User Story 우선순위(P1→P2→P3) 순으로 Phase 구성. 각 Story는 독립적으로 테스트 가능.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: 의존성 설치 및 프로젝트 구조 초기화

- [X] T001 `expo-blur` 패키지 설치 — `cd frontend && npx expo install expo-blur`
- [X] T002 [P] `@expo-google-fonts/noto-sans` 및 `expo-font` 패키지 설치 — `cd frontend && npx expo install @expo-google-fonts/noto-sans expo-font`
- [X] T003 [P] `.maestro/plan/` 디렉토리 생성 — E2E 테스트 디렉토리 구조 설정

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 디자인 토큰 시스템 — 모든 User Story에서 참조하는 공통 인프라

**⚠️ CRITICAL**: 이 Phase 완료 전까지 User Story 구현 불가

- [X] T004 [P] 디자인 토큰 — 색상 상수 파일 생성 in `frontend/src/theme/colors.ts` (Paper 확인된 값: primary #6366F1, primaryLight #EEF2FF, surface #FFFFFF, surfaceDim #F8FAFC, onSurface #0F172A, border #E2E8F0, borderLight #F1F5F9, disabled #94A3B8, muted #CBD5E1, secondaryText #64748B, success #22C55E, successLight #4ADE80, warning #F59E0B, warningLight #FEF3C7, warningDark #D97706, error #EF4444, overlay #0F172A4D)
- [X] T005 [P] 디자인 토큰 — 타이포그래피 상수 파일 생성 in `frontend/src/theme/typography.ts` (H1 24/Bold, H2 18/SemiBold, Body 15/Regular, Caption 13/Medium, Overline 11/SemiBold, Label 10/SemiBold, fontFamily: NotoSans-*)
- [X] T006 [P] 디자인 토큰 — spacing/radius 상수 파일 생성 in `frontend/src/theme/spacing.ts` (spacing: xs4/sm8/md12/lg16/xl24/xxl32, radius: sm6/md8/lg12/xl14/xxl16/full9999)
- [X] T007 디자인 토큰 — 통합 export 파일 생성 in `frontend/src/theme/index.ts` (colors, typography, spacing, radius re-export)
- [X] T008 Noto Sans 폰트 로딩 설정 — `frontend/App.tsx` 또는 루트 레이아웃에 `useFonts` hook 추가 (NotoSans-Bold, NotoSans-SemiBold, NotoSans-Medium, NotoSans-Regular)
- [X] T009 [P] 디자인 토큰 단위 테스트 — `frontend/__tests__/theme/` 에 색상값/타이포 값이 DESIGN_SYSTEM.md와 일치하는지 검증하는 테스트 작성

**Checkpoint**: 디자인 토큰 시스템 완료 — `import { colors, typography, spacing, radius } from '@/theme'` 사용 가능

---

## Phase 3: User Story 1 — 할 일 입력 오버레이 (Priority: P1) 🎯 MVP

**Goal**: FAB(+) 탭 → 블러 오버레이 + 하단 입력 바 → 할 일 추가 → 오버레이 닫힘

**Independent Test**: FAB(+) 탭 → 오버레이 표시 확인 → 텍스트 입력 → (+) 탭 → 할 일 목록에 추가됨 → 오버레이 닫힘

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T010 [P] [US1] InputOverlay 컴포넌트 단위 테스트 작성 in `frontend/__tests__/components/todo/InputOverlay.test.tsx` — 렌더링, placeholder 표시, 텍스트 입력 → onSubmit 호출, 오버레이 탭 → onClose 호출, FAB 숨김 상태 검증
- [X] T011 [P] [US1] MainScreen 입력 오버레이 통합 테스트 작성 in `frontend/__tests__/screens/main/MainScreen.inputOverlay.test.tsx` — FAB+ 탭 → 오버레이 visible, 텍스트 입력+추가 → onAddTodo 호출+오버레이 닫힘, 오버레이 영역 탭 → 취소
- [X] T012 [P] [US1] Maestro E2E 테스트 작성 in `.maestro/plan/input-overlay.yml` — FAB+ 탭 → 오버레이 표시 → 텍스트 입력 → 추가 → 목록에 반영 확인 (testID 기반)

### Implementation for User Story 1

- [X] T013 [P] [US1] InputOverlay 컴포넌트 구현 in `frontend/src/components/todo/InputOverlay.tsx` — BlurView 오버레이(#0F172A4D + blur(4px)), 하단 입력 바(전폭, #FFFFFF 배경, border-top 1px #E2E8F0, padding 12/16), TextInput(42px, r10, #F1F5F9), (+) 버튼(42x42, r21, #6366F1), Props: { visible, mode('todo'|'memo'), placeholder, onSubmit, onClose }
- [X] T014 [US1] MainScreen에 InputOverlay 통합 및 FAB 연동 in `frontend/src/screens/main/MainScreen.tsx` — isInputOverlayVisible 상태 추가, FAB+ onPress → 오버레이 표시+키보드 auto-focus, 오버레이 활성 시 FAB 숨김, onSubmit → onAddTodo 호출+오버레이 닫기, 오버레이 탭/Android back → 닫기
- [X] T015 [US1] FAB 버튼 스타일을 디자인 토큰으로 교체 in `frontend/src/components/todo/VoiceTodoButton.tsx` — 48x48px, r24, #6366F1 배경, shadow(#6366F14D 0 4 12), 아이콘 22px
- [X] T016 [US1] 기존 AddTodoInput 인라인 입력을 InputOverlay로 대체 in `frontend/src/screens/main/MainScreen.tsx` — 기존 InputRow(AddTodoInput + VoiceTodoButton 인라인) 제거, FAB 버튼 그룹(+, mic)을 우측 하단 absolute 위치로 이동

**Checkpoint**: FAB+ → 블러 오버레이 → 할 일 추가 → 오버레이 닫힘 흐름 완성. 독립 테스트 가능.

---

## Phase 4: User Story 2 — 할 일 아이템 확장 (Priority: P1)

**Goal**: 할 일 아이템 탭 → 시각적 강조 + 액션 버튼(삭제/비활성화/메모) + 메모 카드 표시

**Independent Test**: 아이템 탭 → 확장(Indigo 배경+border) → 액션 버튼 표시 → 삭제/비활성화/메모 동작 → chevron-up으로 접기

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T017 [P] [US2] TodoActionButtons 단위 테스트 작성 in `frontend/__tests__/unit/components/todo/TodoActionButtons.test.tsx` — 3개 버튼 렌더링(삭제/비활성화/메모), 각 버튼 스타일 검증(흰 배경, #E2E8F0 border, r8), 삭제 탭 → onDelete, 비활성화 탭 → onDeactivate, 메모 탭 → onAddMemo 호출
- [X] T018 [P] [US2] TodoItem 확장 상태 단위 테스트 작성 in `frontend/__tests__/unit/components/todo/TodoItem.expanded.test.tsx` — 탭 → 확장(Indigo 50 배경+3px border), 확장 시 액션 버튼+메모 카드 표시, chevron-up 탭 → 접기, 다른 아이템 탭 → 이전 접기+새 아이템 확장
- [X] T019 [P] [US2] Maestro E2E 테스트 작성 in `.maestro/plan/item-expanded.yml` — 아이템 탭 → 확장 확인 → 삭제 버튼 탭 → 아이템 삭제 확인 → 비활성화 확인 → 메모 추가 확인

### Implementation for User Story 2

- [X] T020 [P] [US2] TodoActionButtons 컴포넌트 생성 in `frontend/src/components/todo/TodoActionButtons.tsx` — 3개 버튼 행(gap 8px, paddingLeft 55px): [삭제](#EF4444 텍스트, trash SVG), [비활성화](#64748B 텍스트), [+ 메모](#6366F1 텍스트, plus SVG). 공통: 흰 배경, 1px #E2E8F0 border, r8, padding 6/12, 12px font
- [X] T021 [US2] TodoItem에 확장 UI 구현 — Swipeable/LongPressGestureHandler 제거, onPress → expandedTodoId 토글, 확장 시: #EEF2FF 배경 + 3px #6366F1 좌측 border + TodoActionButtons + MemoSection + chevron-up(16x16) in `frontend/src/components/todo/TodoItem.tsx`
- [X] T022 [US2] MemoSection 카드 스타일 업데이트 in `frontend/src/components/todo/MemoSection.tsx` — 메모 카드: 흰 배경, r8, padding 8/12, note SVG 14px, 13px #334155 텍스트. 메모 리스트: paddingLeft 55px, gap 6px. 기존 이모지(📝) → SVG 아이콘 교체
- [X] T023 [US2] MainScreen에 expandedTodoId 상태 관리 통합 in `frontend/src/screens/main/MainScreen.tsx` — expandedTodoId state 추가, TodoItem에 isExpanded/onExpand props 전달, 하나만 동시 확장 로직, +메모 버튼 → InputOverlay(mode='memo') 연동
- [X] T024 [US2] todoStore에 expandedTodoId UI 상태 추가 (선택) in `frontend/src/store/todoStore.ts` — SKIP: MainScreen 로컬 state로 충분

**Checkpoint**: 아이템 탭 → 확장+액션 버튼+메모 흐름 완성. 기존 스와이프/롱프레스 제거됨.

---

## Phase 5: User Story 3 — 빈 상태 화면 (Priority: P2)

**Goal**: 할 일 없을 때 디자인 스펙(Screen 3-3)에 맞는 안내 화면 표시

**Independent Test**: 할 일 0개 상태에서 Plan 화면 진입 → Checkmark 아이콘 + "오늘의 할 일이 없어요" + 안내 문구 + FAB 표시 확인

### Tests for User Story 3 ⚠️

- [X] T025 [P] [US3] EmptyState 컴포넌트 단위 테스트 작성 in `frontend/__tests__/unit/components/todo/EmptyState.test.tsx` — Checkmark 렌더링, H2 "오늘의 할 일이 없어요" 텍스트, Caption 안내 문구 렌더링, Indigo 50 라운드 컨테이너 스타일 검증
- [X] T026 [P] [US3] Maestro E2E 테스트 작성 in `.maestro/plan/empty-state.yml` — 할 일 없는 상태에서 Plan 진입 → 빈 상태 UI 표시 확인 → FAB 버튼 존재 확인

### Implementation for User Story 3

- [X] T027 [US3] EmptyState 컴포넌트 생성 in `frontend/src/components/todo/EmptyState.tsx` — 중앙 정렬 레이아웃, Indigo 50(#EEF2FF) 라운드 컨테이너(r9999), Checkmark 아이콘, "오늘의 할 일이 없어요" H2(18px/SemiBold), "우측 하단의 + 버튼을 눌러\n오늘의 계획을 추가해보세요" Caption(13px/Medium), testID: empty-state
- [X] T028 [US3] MainScreen에서 기존 빈 상태 텍스트를 EmptyState 컴포넌트로 교체 in `frontend/src/screens/main/MainScreen.tsx` — `todos.length === 0` 조건에서 기존 단순 Text → EmptyState 컴포넌트 렌더링

**Checkpoint**: 빈 상태 화면이 Paper 디자인(Screen 3-3)과 일치.

---

## Phase 6: User Story 6 — 할 일 목록 공유 (Priority: P2)

**Goal**: 공유 Ghost 버튼 탭 → OS Share Sheet로 할 일 목록 텍스트 공유

**Independent Test**: 공유 버튼 탭 → Share Sheet 표시 → 할 일 목록 텍스트 포함 확인

### Tests for User Story 6 ⚠️

- [X] T029 [P] [US6] ShareButton 스타일 업데이트 테스트 작성 in `frontend/__tests__/components/todo/ShareButton.test.tsx` — Ghost 버튼 스타일 검증(transparent 배경, 1px #E2E8F0 border, r8, #6366F1 텍스트), 빈 상태 시 "공유할 할 일이 없습니다" 메시지 확인
- [X] T030 [P] [US6] Maestro E2E 테스트 작성 in `.maestro/plan/share.yml` — 공유 버튼 탭 → Share Sheet 또는 모달 표시 확인

### Implementation for User Story 6

- [X] T031 [US6] ShareButton 스타일을 디자인 토큰으로 교체 in `frontend/src/components/todo/ShareButton.tsx` — Ghost 버튼 스타일 적용(transparent bg, 1px #E2E8F0 border, r8, 13px/Medium #6366F1 텍스트), "공유" 텍스트 유지
- [X] T032 [US6] 빈 상태 공유 처리 추가 in `frontend/src/components/todo/ShareButton.tsx` — todos.length === 0일 때 "공유할 할 일이 없습니다" Alert 표시

**Checkpoint**: 공유 기능 — 기존 기능 유지 + Ghost 스타일 적용 + 빈 상태 처리.

---

## Phase 7: User Story 5 — 디자인 시스템 정합성 (Priority: P3)

**Goal**: 기존 구현 코드의 하드코딩된 색상/타이포/컴포넌트 스타일을 디자인 토큰으로 교체

**Independent Test**: 각 화면의 색상 값이 DESIGN_SYSTEM.md 토큰과 정확히 일치

### Tests for User Story 5 ⚠️

- [X] T033 [P] [US5] 디자인 토큰 적용 검증 테스트 작성 in `frontend/__tests__/theme/design-consistency.test.tsx` — 주요 컴포넌트(TodoItem, MainScreen, ModeToggle, CompleteDayButton)의 스타일이 디자인 토큰 참조인지 검증

### Implementation for User Story 5

- [X] T034 [P] [US5] MainScreen 스타일을 디자인 토큰으로 교체 in `frontend/src/screens/main/MainScreen.tsx` — 배경색 #f0f0f0→surfaceDim, 헤더 텍스트→h1, 진행률→caption, 구분선→border 등
- [X] T035 [P] [US5] TodoItem 기본 스타일을 디자인 토큰으로 교체 in `frontend/src/components/todo/TodoItem.tsx` — 체크박스(22px, r6, #4ADE80), 텍스트(body), 완료 텍스트(#94A3B8+line-through), 이월 뱃지(#FEF3C7 bg, #D97706 text), 구분선(#F1F5F9)
- [X] T036 [P] [US5] ModeToggle 스타일을 디자인 토큰으로 교체 in `frontend/src/components/todo/ModeToggle.tsx` — Secondary Pill 스타일(#F1F5F9 bg, r16, 13px/Medium)
- [X] T037 [P] [US5] CompleteDayButton 스타일을 디자인 토큰으로 교체 in `frontend/src/components/todo/CompleteDayButton.tsx` — Primary 버튼(#6366F1, r14, 52px, 15px/SemiBold 흰 텍스트)
- [X] T038 [P] [US5] ReviewModeView 스타일을 디자인 토큰으로 교체 in `frontend/src/screens/main/ReviewModeView.tsx` — 진행 바(#22C55E/#E2E8F0), 완료 섹션(Green overline), 미완료 섹션(Amber overline)
- [X] T039 [P] [US5] TabBar 스타일을 디자인 토큰으로 교체 (TabBar 컴포넌트 또는 MainTabNavigator) — active: #6366F1, inactive: #94A3B8, bg: #FFFFFF, border-top: #E2E8F0, label: 10px/SemiBold

**Checkpoint**: 모든 기존 하드코딩 색상이 디자인 토큰으로 교체됨.

---

## Phase 8: User Story 4 — UIUX 문서 업데이트 (Priority: P2)

**Goal**: docs/UIUX.md를 현재 구현 상태와 정확히 일치하도록 업데이트

**Independent Test**: UIUX.md의 각 화면 섹션이 실제 코드의 testID, Props, 상태 처리와 일치

### Implementation for User Story 4

- [ ] T040 [US4] docs/UIUX.md에 Input Active(3-1) 화면 구현 상세 추가 — InputOverlay 컴포넌트: testID, Props 인터페이스, 사용자 흐름(FAB→오버레이→입력→추가→닫힘), 상태 처리(visible/hidden)
- [ ] T041 [P] [US4] docs/UIUX.md에 Item Expanded(3-2) 화면 구현 상세 추가 — TodoItem 확장: testID, TodoActionButtons Props, MemoSection Props, 사용자 흐름(탭→확장→액션→접기), 상태 처리(expanded/collapsed)
- [ ] T042 [P] [US4] docs/UIUX.md에 Empty State(3-3) 화면 구현 상세 추가 — EmptyState 컴포넌트: testID, 렌더링 조건, 레이아웃 상세
- [ ] T043 [US4] docs/UIUX.md 디자인 리소스 섹션에서 Figma 참조 제거 및 Paper 공식 소스 명시, 브랜치명 업데이트

**Checkpoint**: UIUX.md가 구현 코드와 100% 일치 (SC-004).

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 전체 정합성 확인 및 최종 검증

- [X] T044 전체 Frontend lint 통과 확인 — `cd frontend && npm run lint`
- [X] T045 전체 Frontend 테스트 통과 확인 — `cd frontend && npm test`
- [ ] T046 전체 Maestro E2E 테스트 실행 — `maestro test .maestro/plan/`
- [ ] T047 [P] DESIGN_SYSTEM.md와 구현 코드 색상 값 최종 교차 검증
- [ ] T048 [P] SCREENS.md와 실제 화면 시각적 비교 검증 (Paper 원본 대조)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 의존성 없음 — 즉시 시작
- **Phase 2 (Foundational)**: Phase 1 완료 후 — **모든 User Story를 BLOCK**
- **Phase 3 (US1 Input Active)**: Phase 2 완료 후
- **Phase 4 (US2 Item Expanded)**: Phase 2 완료 후, US1의 InputOverlay 컴포넌트 필요 (T013) → Phase 3 완료 후 시작 권장
- **Phase 5 (US3 Empty State)**: Phase 2 완료 후 — US1/US2와 독립적, 병렬 가능
- **Phase 6 (US6 Share)**: Phase 2 완료 후 — US1/US2와 독립적, 병렬 가능
- **Phase 7 (US5 Design Consistency)**: Phase 2 완료 후 — 다른 US와 독립적이나, US1/US2가 같은 파일 수정하므로 Phase 4 이후 권장
- **Phase 8 (US4 Doc Update)**: Phase 3-7 모두 완료 후 — 구현 결과를 문서화
- **Phase 9 (Polish)**: Phase 3-8 완료 후

### User Story Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational/Tokens)
                        │
                        ├─→ Phase 3 (US1 Input Active) ──→ Phase 4 (US2 Item Expanded)
                        │                                          │
                        ├─→ Phase 5 (US3 Empty State) ─────────────┤
                        │                                          │
                        ├─→ Phase 6 (US6 Share) ───────────────────┤
                        │                                          │
                        └─→ Phase 7 (US5 Design Consistency) ──────┤
                                                                   │
                                                          Phase 8 (US4 Doc Update)
                                                                   │
                                                          Phase 9 (Polish)
```

### Within Each User Story

- 테스트 MUST 먼저 작성 → 실패 확인 → 구현 → 통과 (TDD Red→Green→Refactor)
- 컴포넌트 → Screen 통합 순서
- Story 완료 후 다음 우선순위 Story로 이동

### Parallel Opportunities

- Phase 2: T004, T005, T006 (토큰 파일들) 병렬 생성 가능
- Phase 3: T010, T011, T012 (US1 테스트들) 병렬 작성 가능
- Phase 4: T017, T018, T019 (US2 테스트들) 병렬 작성 가능
- Phase 5 + Phase 6: US3과 US6은 파일 겹침 없이 완전 병렬 가능
- Phase 7: T034-T039 (각기 다른 파일) 모두 병렬 가능

---

## Parallel Example: User Story 1

```bash
# 테스트 먼저 (병렬):
Task: "T010 InputOverlay 단위 테스트 in frontend/__tests__/components/todo/InputOverlay.test.tsx"
Task: "T011 MainScreen 입력 오버레이 통합 테스트 in frontend/__tests__/screens/main/MainScreen.inputOverlay.test.tsx"
Task: "T012 Maestro E2E 테스트 in .maestro/plan/input-overlay.yml"

# 구현 (순차):
Task: "T013 InputOverlay 컴포넌트 구현"
Task: "T014 MainScreen 통합"
Task: "T015 FAB 스타일 토큰 적용"
Task: "T016 기존 인라인 입력 제거"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (의존성 설치)
2. Phase 2: Foundational (디자인 토큰)
3. Phase 3: User Story 1 (입력 오버레이)
4. **STOP and VALIDATE**: FAB → 오버레이 → 할 일 추가 → 닫힘 흐름 테스트
5. 데모 가능

### Incremental Delivery

1. Setup + Foundational → 토큰 시스템 준비
2. US1 (입력 오버레이) → 테스트 → **MVP 데모**
3. US2 (아이템 확장) → 테스트 → 핵심 인터랙션 완성
4. US3 (빈 상태) + US6 (공유) → 병렬 구현 → 보조 기능 완성
5. US5 (디자인 정합성) → 전체 스타일 통일
6. US4 (문서 업데이트) → 문서 동기화
7. Polish → 최종 검증

---

## Notes

- [P] tasks = 다른 파일, 의존성 없음 → 병렬 실행 가능
- [Story] label = spec.md User Story 매핑
- TDD 필수: 테스트 작성 → 실패 확인 → 구현 → 통과 → 리팩터
- 백엔드 변경 없음 — 기존 API(DELETE /todos/:id, PATCH /status, POST /memos) 활용
- 공유 기능(US6)은 기존 구현 재활용 — 스타일 토큰 적용 + 빈 상태 처리만 추가
- Commit: 각 Task 또는 논리적 그룹 완료 후 커밋
