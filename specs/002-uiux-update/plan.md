# Implementation Plan: UI/UX 업데이트 — Plan 모드 화면 구현 및 디자인 시스템 정합성

**Branch**: `002-uiux-update` | **Date**: 2026-04-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-uiux-update/spec.md`

## Summary

Plan 모드 화면의 디자인 정합성을 확보한다. 블러 오버레이 입력(Screen 3-1), 아이템 확장 UI(Screen 3-2), 빈 상태 화면(Screen 3-3)을 Paper 디자인에 맞게 구현하고, 기존 스와이프/롱프레스 제스처를 명시적 버튼으로 대체한다. 디자인 토큰 시스템을 도입하고 기존 하드코딩된 색상을 교체한다. 백엔드 변경은 불필요하다 — 모든 필요 API(삭제, 상태 변경, 메모 CRUD)가 이미 존재한다.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend & Backend)
**Primary Dependencies**: React Native (Expo), react-native-gesture-handler, expo-blur, Zustand, NestJS
**Storage**: Supabase (PostgreSQL) — 기존 스키마 변경 없음
**Testing**: Jest (unit/integration), Maestro MCP (E2E)
**Target Platform**: iOS 15+ / Android (Expo managed)
**Project Type**: mobile-app (React Native) + web-service (NestJS)
**Performance Goals**: FAB 탭 → 할 일 추가 완료 3초 이내 (SC-001)
**Constraints**: Paper 디자인 원본 정합성, 기존 API 계약 유지
**Scale/Scope**: 6 User Stories, 14 Functional Requirements, Frontend 변경 중심

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | 원칙 | 상태 | 비고 |
|---|------|------|------|
| I | 한국어 우선 | PASS | 모든 문서/UI 텍스트 한국어 |
| II | 엄격한 TypeScript | PASS | `any` 금지, DTO 계약 일치 |
| III | TDD 우선 (NON-NEGOTIABLE) | PASS | Phase별 테스트 선행 계획 |
| IV | 계층 분리 | PASS | screen → feature → service → store 유지 |
| V | 실패 처리와 관측성 | PASS | loading/empty/error 상태 설계 포함 |
| VI | 단순성 우선 | PASS | 기존 컴포넌트 확장, 최소 의존성 추가 |
| VII | 명세서 중심 개발 | PASS | UIUX.md, DESIGN_SYSTEM.md 동기화 |
| VIII | 주석 전략 | PASS | WHY 중심, JSDoc 공개 API |
| IX | 브랜치 전략 | PASS | `002-uiux-update` 브랜치 |
| X | E2E 테스트 (Maestro) | PASS | Phase별 Maestro YAML 작성 계획 |

**Result**: 모든 게이트 PASS — Phase 0 진행 가능

## Project Structure

### Documentation (this feature)

```text
specs/002-uiux-update/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A — 기존 API 유지)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/                          # 변경 없음 — 기존 API로 충분
├── src/
│   ├── todo/                     # DELETE, PATCH /status, GET 이미 존재
│   └── memo/                     # POST, PATCH, DELETE 이미 존재
└── test/

frontend/
├── src/
│   ├── theme/                    # [NEW] 디자인 토큰 시스템
│   │   ├── colors.ts             # Paper 기반 색상 토큰
│   │   ├── typography.ts         # Noto Sans 타이포그래피
│   │   ├── spacing.ts            # spacing/radius 토큰
│   │   └── index.ts              # 통합 export
│   ├── components/
│   │   └── todo/
│   │       ├── TodoItem.tsx       # [MODIFY] 확장 UI + 제스처 제거
│   │       ├── AddTodoInput.tsx   # [MODIFY] → InputOverlay로 진화
│   │       ├── InputOverlay.tsx   # [NEW] 블러 오버레이 + 입력 바
│   │       ├── TodoActionButtons.tsx  # [NEW] 삭제/비활성화/메모 버튼
│   │       ├── MemoSection.tsx    # [MODIFY] 카드 스타일 업데이트
│   │       ├── EmptyState.tsx     # [NEW] 빈 상태 화면 (Screen 3-3)
│   │       ├── ShareButton.tsx    # [MODIFY] 공유 기능 (이미 존재)
│   │       └── VoiceTodoButton.tsx # [MODIFY] FAB 스타일 토큰 적용
│   ├── screens/
│   │   └── main/
│   │       └── MainScreen.tsx     # [MODIFY] 레이아웃 + 확장 상태 관리
│   ├── store/
│   │   └── todoStore.ts           # [MODIFY] expandedTodoId UI 상태 추가
│   ├── features/
│   │   └── share/                 # [EXISTS] useShareTodo, formatShareData
│   ├── services/api/
│   │   ├── todoApi.ts             # [EXISTS] 삭제/상태변경 API
│   │   └── memoApi.ts             # [EXISTS] 메모 CRUD API
│   └── types/
│       └── todo.ts                # [EXISTS] Todo, TodoMemo 타입
├── __tests__/                     # [MODIFY] 컴포넌트 테스트 추가
└── app.json

.maestro/
├── plan/                          # [NEW] Plan 모드 E2E 테스트
│   ├── input-overlay.yml          # US1: 입력 오버레이
│   ├── item-expanded.yml          # US2: 아이템 확장
│   ├── empty-state.yml            # US3: 빈 상태
│   └── share.yml                  # US6: 공유
└── config.yaml
```

**Structure Decision**: 기존 frontend/backend 구조를 유지하되, `frontend/src/theme/` 디렉토리를 신규 생성하여 디자인 토큰 시스템을 도입한다. 백엔드는 변경하지 않는다.

## Complexity Tracking

> 헌법 위반 없음 — 해당 없음
