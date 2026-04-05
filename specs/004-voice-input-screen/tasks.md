# Tasks: 음성 입력 화면 (Voice Input Screen)

**Input**: Design documents from `/specs/004-voice-input-screen/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: TDD 필수 (헌법 III조 — NON-NEGOTIABLE). 모든 구현 전 실패하는 테스트 먼저 작성.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (프로젝트 초기화)

**Purpose**: 신규 의존성 설치 및 공통 타입 정의

- [x] T001 Install expo-speech-recognition dependency in frontend/ (`npx expo install expo-speech-recognition`)
- [x] T002 Create DraftTodo types and DraftTodoStatus enum in frontend/src/features/voice/types.ts

---

## Phase 2: Foundational (백엔드 API + 프론트엔드 API 클라이언트)

**Purpose**: 모든 User Story에 필요한 백엔드 엔드포인트와 프론트엔드 API 클라이언트 구축

**TDD 원칙**: 테스트 먼저 작성 (Red) → 구현 (Green) → 리팩토링 (Refactor)

### 백엔드: GeminiService.refineText

- [x] T003 [P] Write unit tests for GeminiService.refineText in backend/test/unit/ai/infrastructure/gemini.service.refine.spec.ts (정상 정리, 빈 응답 시 원본 반환, 429 retry, 429 최종 실패, 일반 에러)
- [x] T004 Implement GeminiService.refineText method in backend/src/ai/infrastructure/gemini.service.ts (텍스트 전용 LLM 정리, REFINE_PROMPT 상수, 3회 retry, 원본 폴백)

### 백엔드: RefineText 유스케이스 + DTO

- [x] T005 [P] Write unit tests for RefineTextUsecase in backend/test/unit/todo/application/refine-text.usecase.spec.ts (정상 흐름, 사용자 미존재, Gemini 에러 전파)
- [x] T006 [P] Create RefineTextDto with validation in backend/src/todo/application/dto/refine-text.dto.ts (@IsString, @MinLength(1), @MaxLength(500))
- [x] T007 Implement RefineTextUsecase in backend/src/todo/application/refine-text.usecase.ts (사용자 확인 → GeminiService.refineText → 결과 반환)

### 백엔드: BatchCreateTodo 유스케이스 + DTO

- [x] T008 [P] Write unit tests for BatchCreateTodoUsecase in backend/test/unit/todo/application/batch-create-todo.usecase.spec.ts (정상 다건 생성, 사용자 미존재, 트랜잭션 롤백)
- [x] T009 [P] Create BatchCreateTodosDto with validation in backend/src/todo/application/dto/batch-create-todos.dto.ts (@IsArray, @ArrayMinSize(1), @ArrayMaxSize(20), @ValidateNested, BatchCreateTodoItemDto)
- [x] T010 Implement BatchCreateTodoUsecase in backend/src/todo/application/batch-create-todo.usecase.ts (사용자 확인 → 트랜잭션 내 N건 생성 → created 배열 반환)

### 백엔드: Controller + Module

- [x] T011 Write integration tests for new endpoints in backend/test/integration/todo/todo-voice.controller.spec.ts (POST /refine 200/400/401, POST /batch 201/400/401, POST /voice 410 Gone)
- [x] T012 Update TodoController in backend/src/todo/todo.controller.ts: add POST /todos/refine (200, @Throttle), POST /todos/batch (201), deprecate POST /todos/voice (410 Gone with @deprecated JSDoc)
- [x] T013 Update TodoModule in backend/src/todo/todo.module.ts: register RefineTextUsecase, BatchCreateTodoUsecase as providers

### 프론트엔드: API 클라이언트 + 네비게이션

- [x] T014 [P] Write unit tests for new todoApi methods in frontend/__tests__/unit/services/api/todoApi.test.ts (refineText 정상/에러, batchCreateTodos 정상/에러)
- [x] T015 [P] Add refineText and batchCreateTodos methods to frontend/src/services/api/todoApi.ts
- [x] T016 [P] Add VoiceInput route params to RootStackParamList in frontend/src/app/navigation/types.ts (`VoiceInput: { todoDate: string }`)

**Checkpoint**: 백엔드 API 3개 (refine, batch, voice deprecated) + 프론트엔드 API 클라이언트 완성. User Story 구현 가능.

---

## Phase 3: User Story 1 — 연속 음성 발화로 여러 할 일 한 번에 등록 (Priority: P1) MVP

**Goal**: 마이크 FAB → 음성 입력 화면 → 연속 발화 → 실시간 전사 → LLM 정리 → 임시 카드 → 종료 시 일괄 생성

**Independent Test**: FAB 탭 → VoiceInputScreen → 발화 → 카드 생성 → 종료 → 일괄 생성 후 MainScreen 복귀

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T017 [P] [US1] Write unit tests for useSpeechRecognition hook in frontend/__tests__/unit/features/voice/useSpeechRecognition.test.ts (start/stop, interimText 업데이트, isFinal 콜백, error 처리, iOS 60초 자동 재시작)
- [x] T018 [P] [US1] Write unit tests for useVoiceTodoSession hook in frontend/__tests__/unit/features/voice/useVoiceTodoSession.test.ts (addDraft → refining → ready, addDraft → refine 실패 → error 원본 폴백, removeDraft, confirmAll 정상, confirmAll 실패, hasRefining 상태)
- [x] T019 [P] [US1] Write unit tests for DraftTodoItem component in frontend/__tests__/unit/components/voice/DraftTodoItem.test.tsx (ready 상태 렌더링, refining 로딩 스피너, error 라벨 표시)
- [x] T020 [P] [US1] Write unit tests for VoiceTodoButton navigation in frontend/__tests__/unit/components/todo/VoiceTodoButton.test.tsx (탭 시 navigation.navigate('VoiceInput') 호출 확인)

### Implementation for User Story 1

- [x] T021 [P] [US1] Implement useSpeechRecognition hook in frontend/src/features/voice/useSpeechRecognition.ts (ExpoSpeechRecognitionModule.start with lang: ko-KR, continuous: true, interimResults: true; interim/final result 처리; iOS 60초 자동 재시작; cleanup)
- [x] T022 [P] [US1] Implement useVoiceTodoSession hook in frontend/src/features/voice/useVoiceTodoSession.ts (drafts useState, addDraft → refining + todoApi.refineText 비동기 → ready/error, removeDraft, confirmAll → todoApi.batchCreateTodos, hasRefining 계산)
- [x] T023 [US1] Implement DraftTodoItem component in frontend/src/components/voice/DraftTodoItem.tsx (ready: 정리 텍스트 + 체크 아이콘 + X 버튼, refining: 원본 텍스트 + 스피너 + X 버튼, error: 원본 텍스트 + "정리 실패" 라벨 + X 버튼)
- [x] T024 [P] [US1] Implement DraftTodoList component in frontend/src/components/voice/DraftTodoList.tsx (FlatList wrapping DraftTodoItem, 스크롤 가능)
- [x] T025 [P] [US1] Implement LiveTranscript component in frontend/src/components/voice/LiveTranscript.tsx (녹음 중: interim 텍스트 회색 이탤릭, 말 없을 때: "말씀하세요..." 플레이스홀더)
- [x] T026 [P] [US1] Implement VoiceControls component in frontend/src/components/voice/VoiceControls.tsx (녹음 상태 표시 + 경과 시간 + 빨간 네모 종료 버튼)
- [x] T027 [US1] Implement VoiceInputScreen in frontend/src/screens/voice/VoiceInputScreen.tsx (Header + DraftTodoList + LiveTranscript + VoiceControls 조립, 자동 녹음 시작, 마이크 권한 처리, 종료 로직: stop → refining 대기 → confirmAll/빈 결과 토스트)
- [x] T028 [US1] Register VoiceInput screen in AuthNavigator in frontend/src/app/navigation/AuthNavigator.tsx (Stack.Screen name="VoiceInput" with modal presentation, headerShown: false)
- [x] T029 [US1] Update VoiceTodoButton in frontend/src/components/todo/VoiceTodoButton.tsx (useVoiceRecording 의존 제거, onPress → navigation.navigate('VoiceInput', { todoDate }), 기존 props 정리)
- [x] T030 [US1] Write Maestro E2E test for voice input flow in .maestro/voice/voice_input_screen.yml (FAB 탭 → 화면 진입 확인 → 녹음 시작 확인 → 종료 버튼 탭 → 이전 화면 복귀)

**Checkpoint**: 음성 입력 핵심 플로우 완성. 연속 발화 → 임시 카드 → 일괄 생성 전체 동작 가능.

---

## Phase 4: User Story 2 — 임시 할 일 삭제 (Priority: P2)

**Goal**: 임시 할 일 카드의 X 버튼으로 개별 항목 즉시 삭제

**Independent Test**: 임시 할 일 존재 상태에서 X 탭 → 확인 없이 즉시 제거

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T031 [US2] Write unit tests for DraftTodoItem delete interaction in frontend/__tests__/unit/components/voice/DraftTodoItem.test.tsx (X 버튼 탭 시 onRemove 콜백 호출, 확인 다이얼로그 없이 즉시 호출)

### Implementation for User Story 2

- [x] T032 [US2] Implement delete interaction in DraftTodoItem in frontend/src/components/voice/DraftTodoItem.tsx (X 버튼 onPress → onRemove(id) 콜백, 확인 없이 즉시 삭제)
- [x] T033 [US2] Write Maestro E2E test for draft deletion in .maestro/voice/voice_draft_delete.yml (임시 카드 존재 → X 탭 → 카드 제거 확인)

**Checkpoint**: 임시 할 일 삭제 기능 동작. US1 + US2 독립적으로 테스트 가능.

---

## Phase 5: User Story 3 — 뒤로가기 취소 처리 (Priority: P3)

**Goal**: 뒤로가기 시 임시 할 일이 있으면 확인 다이얼로그로 데이터 손실 방지

**Independent Test**: 임시 할 일 있는 상태에서 뒤로가기 → 확인 다이얼로그 → 삭제/취소 동작 확인

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T034 [US3] Write unit tests for back navigation handling in frontend/__tests__/unit/screens/voice/VoiceInputScreen.test.tsx (임시 할 일 1+ → 확인 다이얼로그 표시, [삭제] → goBack, [취소] → 화면 유지, 임시 할 일 0 → 즉시 goBack)

### Implementation for User Story 3

- [x] T035 [US3] Implement back button confirmation dialog in frontend/src/screens/voice/VoiceInputScreen.tsx (beforeRemove 이벤트 가로채기, drafts.length > 0 → Alert.alert "입력 중인 할 일 N개가 삭제됩니다" [삭제/취소], drafts.length === 0 → 녹음 중단 + 즉시 goBack)
- [x] T036 [US3] Write Maestro E2E test for back navigation in .maestro/voice/voice_back_navigation.yml (뒤로가기 → 확인 다이얼로그 → [삭제] 탭 → 이전 화면 복귀)

**Checkpoint**: 뒤로가기 안전장치 완성. US1 + US2 + US3 모두 독립적으로 동작.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 기존 코드 정리 및 최종 통합

- [X] T037 Remove voice-related state/handlers from AuthNavigator in frontend/src/app/navigation/AuthNavigator.tsx (handleVoiceTodo, isVoiceProcessing, voiceProcessingError 제거)
- [X] T038 Remove voice-related props from MainScreen in frontend/src/screens/main/MainScreen.tsx (onVoiceTodoCreated, isVoiceProcessing, voiceProcessingError props 제거)
- [X] T039 Update existing Maestro voice test in .maestro/voice/voice_todo.yml (새로운 VoiceInputScreen 플로우에 맞게 갱신)
- [X] T040 Run backend lint and test suite (`cd backend && npm run lint && npm test`)
- [X] T041 Run frontend lint and test suite (`cd frontend && npm run lint && npm test`)
- [X] T042 Validate quickstart.md flow (전체 플로우 수동 검증: FAB → 음성 입력 → 발화 → 카드 → 종료 → 일괄 생성)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Phase 2 completion
  - US2, US3는 US1의 컴포넌트/훅에 의존하므로 US1 완료 후 진행
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Phase 2 완료 후 시작 — 핵심 화면/훅/컴포넌트 전체 생성
- **US2 (P2)**: US1 완료 후 시작 — DraftTodoItem에 삭제 인터랙션 추가
- **US3 (P3)**: US1 완료 후 시작 — VoiceInputScreen에 뒤로가기 다이얼로그 추가

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD Red → Green → Refactor)
- 훅 before 컴포넌트
- 컴포넌트 before 화면 조립
- 구현 before E2E 테스트

### Parallel Opportunities

**Phase 2 내부**:
- T003, T005, T008 (백엔드 테스트 3개) — 동시 실행 가능
- T006, T009 (DTO 2개) — 동시 실행 가능
- T014, T015, T016 (프론트엔드 API/타입) — 동시 실행 가능

**Phase 3 (US1) 내부**:
- T017, T018, T019, T020 (테스트 4개) — 동시 실행 가능
- T021, T022 (훅 2개) — 동시 실행 가능
- T024, T025, T026 (하위 컴포넌트 3개) — 동시 실행 가능

---

## Parallel Example: User Story 1

```bash
# Launch all tests for US1 together (TDD Red phase):
Task: T017 "useSpeechRecognition tests"
Task: T018 "useVoiceTodoSession tests"
Task: T019 "DraftTodoItem tests"
Task: T020 "VoiceTodoButton navigation tests"

# Launch hooks in parallel (TDD Green phase):
Task: T021 "useSpeechRecognition implementation"
Task: T022 "useVoiceTodoSession implementation"

# Launch sub-components in parallel:
Task: T024 "DraftTodoList"
Task: T025 "LiveTranscript"
Task: T026 "VoiceControls"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (expo-speech-recognition 설치, 타입 정의)
2. Complete Phase 2: Foundational (백엔드 API 3개 + 프론트엔드 API 클라이언트)
3. Complete Phase 3: User Story 1 (핵심 음성 입력 플로우)
4. **STOP and VALIDATE**: 연속 발화 → 카드 생성 → 일괄 생성 독립 검증
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → 백엔드 API 준비 완료
2. Add US1 → 핵심 플로우 완성 → Deploy/Demo (MVP!)
3. Add US2 → 삭제 기능 추가 → Deploy/Demo
4. Add US3 → 뒤로가기 안전장치 → Deploy/Demo
5. Polish → 기존 코드 정리, 최종 검증

---

## Notes

- [P] tasks = 서로 다른 파일, 의존성 없음
- [Story] label = 특정 User Story에 매핑
- 헌법 III조(TDD): 모든 구현 전 실패하는 테스트 먼저 작성 필수
- 헌법 VIII조(주석): deprecated 처리 시 JSDoc @deprecated 사용, 주석 처리된 코드 금지
- 헌법 X조(E2E): 각 Phase 프론트엔드 완료 시 Maestro YAML 작성
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
