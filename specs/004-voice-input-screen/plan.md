# Implementation Plan: 음성 입력 화면 (Voice Input Screen)

**Branch**: `004-voice-input-screen` | **Date**: 2026-04-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-voice-input-screen/spec.md`

## Summary

기존 오디오 파일 업로드 방식의 단건 음성 할 일 생성을 **디바이스 내장 STT(expo-speech-recognition) + 서버 LLM 텍스트 정리** 구조로 전환한다. 전용 음성 입력 화면(VoiceInputScreen)에서 연속 발화로 여러 할 일을 임시 생성하고, 종료 시 서버에 일괄 생성한다. 기존 `POST /todos/voice` 엔드포인트는 410 Gone으로 deprecated 처리한다.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend & Backend)
**Primary Dependencies**: React Native (Expo ~55), expo-speech-recognition (신규), NestJS v11, @google/generative-ai
**Storage**: Supabase (PostgreSQL) via TypeORM — 기존 Todo 테이블 재사용, 스키마 변경 없음
**Testing**: Jest (Unit/Integration), Maestro MCP (E2E)
**Target Platform**: iOS / Android (React Native cross-platform)
**Project Type**: mobile-app + web-service (monorepo: frontend + backend)
**Performance Goals**: 문장당 LLM 정리 ≤ 2초 (p95), 실시간 STT interim 표시
**Constraints**: iOS STT 60초 제한 (자동 재시작으로 대응), 한국어(ko-KR) 전용
**Scale/Scope**: 세션당 최대 20개 할 일, 텍스트 정리 rate limit 1 req/sec + 30 req/min

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 상태 | 비고 |
|------|------|------|
| I. 한국어 우선 | PASS | 모든 사용자 문구 한국어, 코드 식별자 영어 |
| II. 엄격한 TypeScript | PASS | `any` 금지, DTO 검증, 프론트-백 계약 일치 |
| III. TDD 우선 (NON-NEGOTIABLE) | PASS | 각 Phase에서 테스트 먼저 작성 후 구현 |
| IV. 계층 분리 | PASS | Backend: controller → usecase → repository, Frontend: screen → hook → api |
| V. 실패 처리와 관측성 | PASS | loading/empty/error 상태 설계, 구조화된 에러 코드 |
| VI. 단순성 우선 | PASS | expo-speech-recognition만 신규 추가, useState로 충분 (Zustand 불필요) |
| VII. 명세서 중심 개발 | PASS | PRD_VOICE_INPUT.md, TECH_SPEC_VOICE_INPUT.md 기반 |
| VIII. 주석 전략 | PASS | WHY 중심, deprecated 사유 JSDoc 문서화 |
| IX. 브랜치 전략 | PASS | feature/004-voice-input-screen 브랜치 사용 |
| X. E2E 테스트 (Maestro) | PASS | 각 Phase 프론트엔드 완료 시 Maestro YAML 작성 |

위반 사항 없음. Phase 0 진행 가능.

## Project Structure

### Documentation (this feature)

```text
specs/004-voice-input-screen/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── todo/
│   │   ├── application/
│   │   │   ├── refine-text.usecase.ts          # 신규: 텍스트 정리 유스케이스
│   │   │   ├── batch-create-todo.usecase.ts    # 신규: 일괄 생성 유스케이스
│   │   │   ├── dto/
│   │   │   │   ├── refine-text.dto.ts          # 신규: RefineTextDto
│   │   │   │   └── batch-create-todos.dto.ts   # 신규: BatchCreateTodosDto
│   │   │   ├── create-voice-todo.usecase.ts    # 기존 (deprecated 처리)
│   │   │   └── [기존 usecases...]
│   │   ├── todo.controller.ts                  # 수정: refine, batch 추가 + voice deprecated
│   │   └── todo.module.ts                      # 수정: 새 usecase provider 등록
│   └── ai/
│       └── infrastructure/
│           └── gemini.service.ts               # 수정: refineText 메서드 추가
└── test/
    ├── unit/
    │   ├── ai/infrastructure/
    │   │   └── gemini.service.refine.spec.ts   # 신규
    │   └── todo/application/
    │       ├── refine-text.usecase.spec.ts     # 신규
    │       └── batch-create-todo.usecase.spec.ts # 신규
    └── integration/todo/
        └── todo-voice.controller.spec.ts       # 수정: 410 + refine + batch 테스트 추가

frontend/
├── src/
│   ├── screens/voice/
│   │   └── VoiceInputScreen.tsx                # 신규: 전용 화면
│   ├── features/voice/
│   │   ├── types.ts                            # 신규: DraftTodo 등 타입
│   │   ├── useSpeechRecognition.ts             # 신규: expo-speech-recognition 래퍼 훅
│   │   └── useVoiceTodoSession.ts              # 신규: 임시 todo 세션 관리 훅
│   ├── components/voice/
│   │   ├── DraftTodoList.tsx                   # 신규: 임시 todo FlatList
│   │   ├── DraftTodoItem.tsx                   # 신규: 개별 임시 todo 카드
│   │   ├── LiveTranscript.tsx                  # 신규: 실시간 전사 텍스트
│   │   └── VoiceControls.tsx                   # 신규: 녹음 상태 + 종료 버튼
│   ├── components/todo/
│   │   └── VoiceTodoButton.tsx                 # 수정: 녹음 로직 제거 → 네비게이션
│   ├── screens/main/
│   │   └── MainScreen.tsx                      # 수정: voice 관련 props 제거
│   ├── app/navigation/
│   │   ├── types.ts                            # 수정: VoiceInput 파라미터 추가
│   │   └── AuthNavigator.tsx                   # 수정: VoiceInput Screen 등록 + voice 핸들러 제거
│   └── services/api/
│       └── todoApi.ts                          # 수정: refineText, batchCreateTodos 추가
└── __tests__/
    └── unit/
        ├── features/voice/
        │   └── useVoiceTodoSession.test.ts     # 신규
        └── components/voice/
            └── DraftTodoItem.test.tsx           # 신규

.maestro/
└── voice/
    ├── voice_todo.yml                          # 수정: 새 플로우로 교체
    └── voice_input_screen.yml                  # 신규: 음성 입력 화면 E2E
```

**Structure Decision**: 기존 프로젝트의 frontend/backend 분리 구조를 그대로 따르며, 신규 파일은 `voice/` 서브디렉토리로 그룹화하여 도메인별 응집도를 높인다.
