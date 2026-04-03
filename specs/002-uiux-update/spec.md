# Feature Specification: UI/UX 업데이트 — Plan 모드 화면 구현 및 디자인 시스템 정합성

**Feature Branch**: `002-uiux-update`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "UI UX를 업데이트 한다. docs/UIUX.md와 designs/* 파일을 참고하여 UIUX를 업데이트한다. Plan 기능에서 추가한 변경사항에 따라 TodoItem Expanded와 키보드 오버레이 시 Todo Input 추가 등 UIUX 화면에 따라 기능을 확인하여 추가한다. 페이퍼 디자인을 따르고 기존 Figma 디자인은 폐기한다."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — 할 일 입력 오버레이 (Input Active) (Priority: P1)

사용자가 Plan 화면에서 FAB(+) 버튼을 탭하면, 화면이 블러 오버레이로 덮이고 하단에 입력 바가 나타난다. 키보드가 올라오면 입력 바는 키보드 위에 위치하며, 사용자는 할 일 텍스트를 입력하고 (+) 버튼 또는 키보드 완료 버튼으로 추가할 수 있다. 입력 완료 후 오버레이가 닫히고 FAB이 다시 보인다.

**Why this priority**: 할 일 추가는 앱의 핵심 동작이며, 현재 구현은 블러 오버레이 없이 인라인 입력만 제공하여 디자인 스펙(Screen 3-1)과 불일치한다. 디자인 정합성과 사용자 집중 경험을 위해 최우선 구현이 필요하다.

**Independent Test**: FAB(+) 탭 → 블러 오버레이 표시 → 하단 입력 바 표시 → 텍스트 입력 → 추가 버튼 탭 → 할 일 생성 확인 → 오버레이 닫힘 확인

**Acceptance Scenarios**:

1. **Given** Plan 화면에 할 일이 있는 상태, **When** FAB(+) 버튼을 탭, **Then** 반투명 블러 오버레이(`rgba(15,23,42,0.3)`)가 화면을 덮고, 하단에 "할 일을 입력하세요" placeholder가 있는 입력 바가 나타나며, 키보드가 자동으로 올라온다.
2. **Given** 입력 바가 활성화된 상태, **When** 텍스트를 입력하고 (+) 버튼을 탭, **Then** 새 할 일이 목록에 추가되고, 오버레이가 닫히며, FAB이 다시 표시된다.
3. **Given** 입력 바가 활성화된 상태, **When** 블러 오버레이 영역을 탭, **Then** 오버레이가 닫히고 입력이 취소된다.
4. **Given** 입력 바가 활성화된 상태, **When** FAB은, **Then** 숨겨진 상태이다.

---

### User Story 2 — 할 일 아이템 확장 (Item Expanded) (Priority: P1)

사용자가 Plan 화면에서 할 일 아이템을 탭하면, 해당 아이템이 시각적으로 강조되고(Indigo 50 배경 + 3px Indigo 좌측 border) 아래에 액션 버튼 행(삭제/비활성화/메모)이 나타난다. 메모가 있는 경우 메모 카드 리스트도 함께 표시된다.

**Why this priority**: 현재 구현은 스와이프 삭제와 롱프레스 비활성화 제스처만 제공하여 디자인 스펙(Screen 3-2)의 명시적 액션 버튼 UI와 불일치한다. 사용자 발견성(discoverability)이 낮아 핵심 기능 접근이 어렵다.

**Independent Test**: 할 일 아이템 탭 → 아이템 강조 표시 → 액션 버튼 행 표시 → 각 액션(삭제/비활성화/메모) 동작 확인 → 접기(chevron-up) 탭 → 원래 상태 복귀

**Acceptance Scenarios**:

1. **Given** Plan 화면에 할 일 아이템이 있는 상태, **When** 아이템을 탭, **Then** 해당 아이템이 Indigo 50 배경 + 3px Indigo 좌측 border로 강조되고, 아래에 [삭제][비활성화][+ 메모] 버튼 행이 표시된다.
2. **Given** 아이템이 확장된 상태, **When** 삭제 버튼(흰 배경, Slate 200 border, Red 텍스트 `#EF4444`, trash 아이콘)을 탭, **Then** 해당 할 일이 삭제된다.
3. **Given** 아이템이 확장된 상태, **When** 비활성화 버튼(흰 배경, Slate 200 border, Slate 500 텍스트 `#64748B`)을 탭, **Then** 해당 할 일이 비활성화 상태로 전환된다.
4. **Given** 아이템이 확장된 상태, **When** [+ 메모] 버튼(흰 배경, Slate 200 border, Indigo 텍스트 `#6366F1`)을 탭, **Then** Screen 3-1과 동일한 블러 오버레이 + 하단 입력 바가 표시되며("메모를 입력하세요" placeholder), 입력 완료 시 해당 아이템에 메모가 추가된다.
5. **Given** 아이템이 확장되고 메모가 존재하는 상태, **When** 확장 영역을 확인, **Then** 메모 카드 리스트(Indigo 50 배경)가 표시된다.
6. **Given** 아이템이 확장된 상태, **When** chevron-up 아이콘을 탭, **Then** 아이템이 접히고 기본 상태로 돌아간다.
7. **Given** 아이템 A가 확장된 상태, **When** 다른 아이템 B를 탭, **Then** 아이템 A가 접히고 아이템 B가 확장된다.

---

### User Story 3 — 빈 상태 화면 (Empty State) (Priority: P2)

사용자가 Plan 화면에 진입했을 때 오늘의 할 일이 없으면, 디자인 스펙(Screen 3-3)에 맞는 안내 화면이 표시된다. Checkmark 아이콘, "오늘의 할 일이 없어요" 제목, FAB 안내 문구가 중앙에 위치한다.

**Why this priority**: 현재 구현은 단순 텍스트만 표시하여 디자인 스펙과 불일치한다. 첫 인상과 온보딩 경험에 영향을 주지만, 핵심 기능 동작에는 영향이 없어 P2로 분류한다.

**Independent Test**: 할 일이 없는 상태에서 Plan 화면 진입 → 빈 상태 UI(아이콘 + 제목 + 안내 문구) 표시 확인 → FAB 버튼 표시 확인

**Acceptance Scenarios**:

1. **Given** 오늘 날짜에 할 일이 없는 상태, **When** Plan 화면에 진입, **Then** 화면 중앙에 Indigo 50 라운드 컨테이너 안에 Checkmark SVG 아이콘이 표시된다.
2. **Given** 빈 상태 화면, **When** 화면을 확인, **Then** "오늘의 할 일이 없어요" H2 제목과 "우측 하단의 + 버튼을 눌러\n오늘의 계획을 추가해보세요" Caption 안내 문구가 표시된다.
3. **Given** 빈 상태 화면, **When** 화면을 확인, **Then** FAB(+) 버튼과 FAB(mic) 버튼이 우측 하단에 표시된다.

---

### User Story 4 — UIUX 문서 및 디자인 소스 업데이트 (Priority: P2)

docs/UIUX.md 문서를 현재 구현 상태와 디자인 스펙에 맞게 업데이트한다. 모든 구현된 화면과 컴포넌트의 상세 정보(testID, Props, 상태 처리, 사용자 흐름)를 문서화하고, 디자인 소스를 Figma에서 Paper로 공식 전환한다.

**Why this priority**: 문서 정합성은 개발 효율성에 직접적으로 영향을 주지만, 사용자에게 직접 노출되는 기능이 아니므로 P2로 분류한다.

**Independent Test**: UIUX.md 문서의 각 화면 섹션이 실제 구현 코드의 testID, Props, 상태 처리와 일치하는지 비교 확인

**Acceptance Scenarios**:

1. **Given** 현재 docs/UIUX.md 문서, **When** 업데이트 완료, **Then** Input Active(3-1), Item Expanded(3-2), Empty State(3-3) 화면의 구현 상세가 문서에 포함된다.
2. **Given** 현재 docs/UIUX.md 문서, **When** 업데이트 완료, **Then** 디자인 리소스 섹션에서 Figma 참조가 제거되고 Paper 디자인이 공식 소스로 명시된다.
3. **Given** 현재 docs/UIUX.md 문서, **When** 업데이트 완료, **Then** 구현된 모든 화면의 testID, Props 인터페이스, 상태 처리(loading/empty/error), 사용자 흐름이 문서화된다.

---

### User Story 5 — 디자인 시스템 정합성 확보 (Priority: P3)

기존 구현 코드의 컬러, 타이포그래피, 컴포넌트 스타일이 Paper 디자인 시스템(docs/designs/DESIGN_SYSTEM.md)과 정확히 일치하도록 보정한다.

**Why this priority**: 시각적 일관성은 제품 품질에 영향을 주지만, 기능 동작에는 영향이 없어 P3로 분류한다.

**Independent Test**: 각 화면의 색상 값, 타이포그래피, 간격이 DESIGN_SYSTEM.md의 토큰 값과 일치하는지 비교 확인

**Acceptance Scenarios**:

1. **Given** 구현 코드의 색상 값, **When** DESIGN_SYSTEM.md 토큰과 비교, **Then** 모든 색상 값이 정확히 일치한다 (예: Primary `#6366F1`, Surface `#FFFFFF`, Success `#22C55E` 등).
2. **Given** 구현 코드의 FAB 컴포넌트, **When** 디자인 스펙과 비교, **Then** 크기(48x48px), border-radius(24px), 그림자(`#6366F14D 0px 4px 12px`) 스타일이 일치한다.

---

### User Story 6 — 할 일 목록 공유 (Priority: P2)

사용자가 Plan 또는 Review 화면에서 공유 Ghost 버튼을 탭하면, OS 기본 공유 시트(Share Sheet)를 통해 오늘의 할 일 목록을 텍스트 형태로 공유할 수 있다.

**Why this priority**: 디자인 스펙(SCREENS.md)에 명시된 버튼이며 사용자 편의 기능이지만, 핵심 할 일 관리 흐름에는 영향이 없어 P2로 분류한다.

**Independent Test**: 공유 버튼 탭 → OS Share Sheet 표시 → 할 일 목록 텍스트 포함 확인

**Acceptance Scenarios**:

1. **Given** Plan 화면에 할 일이 있는 상태, **When** 공유 버튼(Ghost 스타일)을 탭, **Then** OS 기본 Share Sheet가 표시되며, 오늘의 할 일 목록이 텍스트로 포함된다.
2. **Given** Review 화면에서, **When** 공유 버튼을 탭, **Then** 완료/미완료 분류가 포함된 할 일 요약 텍스트가 Share Sheet에 전달된다.
3. **Given** 할 일이 없는 빈 상태, **When** 공유 버튼을 탭, **Then** "공유할 할 일이 없습니다" 안내 또는 빈 상태 텍스트가 표시된다.

---

### Edge Cases

- 키보드가 올라온 상태에서 화면 회전 시 입력 바 위치가 키보드 위에 유지되는가?
- 매우 긴 할 일 텍스트(255자)가 Item Expanded 상태에서 올바르게 표시되는가?
- 네트워크 오류로 할 일 추가가 실패했을 때 입력 바가 적절한 피드백을 제공하는가?
- 할 일 목록이 화면을 넘길 정도로 많을 때 FAB이 콘텐츠를 가리지 않는가?
- Item Expanded 상태에서 스크롤 시 확장 UI가 유지되는가?
- 블러 오버레이가 활성화된 상태에서 뒤로가기(Android back) 시 오버레이가 닫히는가?

## Clarifications

### Session 2026-04-02

- Q: DESIGN_SYSTEM.md와 RN 레퍼런스 코드 간 불일치(FAB 56→48px, 체크박스 24px circle→22px rounded square, checked 색상 #22C55E→#4ADE80) 시 어느 쪽이 정본인가? → A: **Paper 원본 확인 완료 — RN 레퍼런스가 정본** (FAB 48x48/r24, 체크박스 22x22/r6, checked #4ADE80). DESIGN_SYSTEM.md를 Paper에 맞게 수정 필요
- Q: [+ 메모] 버튼 탭 시 메모 입력 UI가 SCREENS.md에 미정의 — 메모 입력 기능의 범위는? → A: 입력 오버레이 재사용 — Screen 3-1과 동일한 블러 오버레이 + 입력 바로 메모 입력
- Q: Screen 3-1 하단 입력 바 컴포넌트 스타일(높이, 배경색, border, 내부 (+) 버튼)이 DESIGN_SYSTEM.md에 미정의 — 구현 기준은? → A: **Paper 원본 확인 완료** — 컨테이너: 전폭, padding 12px/16px, gap 10px, #FFFFFF 배경, border-top 1px #E2E8F0 / 텍스트 입력: flex-grow 1, 42px, r10, #F1F5F9 배경 / (+) 버튼: 42x42px 원형(r21), #6366F1 / 블러 오버레이: #0F172A4D + backdrop-filter blur(4px)
- Q: 기존 스와이프 삭제/롱프레스 비활성화 제스처를 Item Expanded 버튼 UI와 어떻게 처리할 것인가? → A: 완전 대체 — 기존 제스처 제거, 버튼 UI로 통일
- Q: Plan 헤더의 "공유" Ghost 버튼이 spec에 미포함 — 이번 스펙 범위에서 공유 버튼 처리는? → A: In scope — 공유 기능까지 이번 스펙에 포함

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 시스템은 Plan 화면에서 FAB(+) 탭 시 반투명 블러 오버레이와 하단 입력 바를 표시해야 한다 (Screen 3-1 Input Active)
- **FR-002**: 입력 바는 키보드가 올라올 때 키보드 상단에 위치해야 한다
- **FR-003**: 블러 오버레이 활성 시 FAB 버튼은 숨겨져야 한다
- **FR-004**: 블러 오버레이 영역 탭 또는 Android 뒤로가기 시 오버레이가 닫혀야 한다
- **FR-005**: 시스템은 할 일 아이템 탭 시 시각적 강조(Indigo 50 배경 + 3px Indigo 좌측 border)와 액션 버튼 행을 표시해야 한다 (Screen 3-2 Item Expanded)
- **FR-006**: Item Expanded 상태에서 [삭제], [비활성화], [+ 메모] 3개의 명시적 액션 버튼을 제공해야 한다
- **FR-007**: 메모가 존재하는 아이템의 확장 시 메모 카드 리스트(Indigo 50 배경)를 표시해야 한다
- **FR-008**: 하나의 아이템만 동시에 확장 가능해야 한다 (다른 아이템 탭 시 이전 아이템 자동 접기)
- **FR-008a**: [+ 메모] 버튼 탭 시 Screen 3-1과 동일한 블러 오버레이 + 하단 입력 바("메모를 입력하세요" placeholder)를 표시하고, 입력 완료 시 해당 아이템에 메모를 추가해야 한다
- **FR-009**: 시스템은 할 일이 없을 때 디자인 스펙에 맞는 빈 상태 화면(Checkmark 아이콘 + H2 제목 + Caption 안내)을 표시해야 한다 (Screen 3-3)
- **FR-010**: docs/UIUX.md 문서는 모든 구현된 화면의 testID, Props, 상태 처리, 사용자 흐름을 포함해야 한다
- **FR-011**: 디자인 소스 참조는 Figma에서 Paper로 전환되어야 한다
- **FR-012**: 구현 코드의 모든 색상, 타이포그래피, 컴포넌트 스타일은 DESIGN_SYSTEM.md 토큰과 일치해야 한다
- **FR-013**: 기존 스와이프 삭제 및 롱프레스 비활성화 제스처를 제거하고, Item Expanded의 명시적 버튼 UI로 완전 대체해야 한다
- **FR-014**: Plan/Review 헤더의 공유 Ghost 버튼 탭 시 OS 기본 Share Sheet를 통해 오늘의 할 일 목록을 텍스트로 공유할 수 있어야 한다

### Key Entities

- **Todo Item**: 할 일 항목 — 완료/미완료/비활성화/이월 상태를 가지며, 확장 시 액션 버튼과 메모 목록을 노출
- **Todo Memo**: 할 일에 첨부된 메모 — 아이템 확장 시 카드 형태로 표시
- **Input Overlay**: 할 일 입력을 위한 모달 레이어 — 블러 오버레이 + 하단 입력 바 + 키보드 연동

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 사용자가 FAB(+) 탭부터 할 일 추가 완료까지 3초 이내에 수행할 수 있다
- **SC-002**: 모든 Plan 화면 상태(기본/Input Active/Item Expanded/Empty State)가 디자인 스펙(SCREENS.md)과 시각적으로 일치한다
- **SC-003**: 사용자가 할 일 아이템의 삭제/비활성화/메모 기능을 별도 안내 없이 발견하고 사용할 수 있다 (액션 버튼의 명시적 표시)
- **SC-004**: docs/UIUX.md 문서가 구현 코드와 100% 일치하여, 새 개발자가 문서만으로 화면 구조를 이해할 수 있다
- **SC-005**: 모든 구현 컴포넌트의 색상 값이 DESIGN_SYSTEM.md 토큰과 정확히 일치한다

## Assumptions

- 디자인 소스는 Paper(https://app.paper.design/file/01KN1JJXBWWPNF44VBZ7DEF423?page=01KN1JJXBW47Q3GB6SG4VWQSTF)이며, 기존 Figma 디자인은 더 이상 참조하지 않는다
- docs/designs/DESIGN_SYSTEM.md는 Paper 원본과 불일치 항목이 있으며(FAB 56→48px, 체크박스 24px circle→22px r6, checked #22C55E→#4ADE80), 이번 스펙에서 Paper 원본에 맞게 수정한다. RN 레퍼런스 코드(`docs/designs/rn/`)가 Paper와 일치함을 확인함
- 기존 스와이프 삭제 및 롱프레스 비활성화 제스처는 Item Expanded의 명시적 버튼 UI로 **완전 대체**한다 (제스처 제거)
- 키보드 오버레이 동작은 iOS/Android 기본 KeyboardAvoidingView 동작을 따른다
- 블러 효과는 반투명 오버레이(`#0F172A4D`, rgba(15,23,42,0.3))에 `backdrop-filter: blur(4px)` 가우시안 블러를 포함하여 구현한다 (Paper 원본 확인)
- 현재 frontend/src/ 하위의 기존 컴포넌트(TodoItem, AddTodoInput, VoiceTodoButton, MemoSection 등)를 확장/수정하여 구현한다
