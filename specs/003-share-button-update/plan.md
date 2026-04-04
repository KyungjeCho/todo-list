# Implementation Plan: 공유 버튼 기능 변경

**Branch**: `feature/003-share-button-update` | **Date**: 2026-04-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-share-button-update/spec.md`

## Summary

공유 팝업에서 "나에게 전송" 버튼을 제거하고, "공유하기" → "클립보드 복사" 순서로 메뉴를 재구성한다.
클립보드 복사 결과 토스트를 기존 공유 버튼 바로 아래가 아닌 화면 중하단(60~75% 지점)에 표시하도록 변경한다.
기존 `useShareTodo` 훅의 `shareToSelf` 함수를 `copyToClipboard`로 리네이밍하고, 토스트 위치를 전역 레이아웃 기반으로 재배치한다.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: React Native (Expo), expo-clipboard, react-native-safe-area-context  
**Storage**: N/A (프론트엔드 전용 변경, 백엔드/DB 변경 없음)  
**Testing**: Jest + @testing-library/react-native (Unit), Maestro MCP (E2E)  
**Target Platform**: iOS / Android (React Native Expo)  
**Project Type**: mobile-app  
**Performance Goals**: N/A (UI 변경으로 성능 목표 없음)  
**Constraints**: 토스트 위치가 화면 높이의 60~75% 지점에 표시되어야 함  
**Scale/Scope**: 프론트엔드 변경 3~4개 파일, 테스트 2~3개 파일, E2E 2개 파일

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 상태 | 비고 |
|------|------|------|
| I. 한국어 우선 | ✅ PASS | UI 문구 한국어, 코드 식별자 영어 유지 |
| II. 엄격한 TypeScript | ✅ PASS | `any` 사용 없음, 기존 타입 재사용 |
| III. TDD 우선 (NON-NEGOTIABLE) | ✅ PASS | 단위 테스트 → 구현 → E2E 순서 준수 |
| IV. 계층 분리 | ✅ PASS | component(UI) → feature/hook(로직) 분리 유지 |
| V. 실패 처리와 관측성 | ✅ PASS | 복사 실패 시 오류 토스트 유지 |
| VI. 단순성 우선 | ✅ PASS | 신규 라이브러리 추가 없음, `useWindowDimensions` 활용 |
| VII. 명세서 중심 개발 | ✅ PASS | spec.md 기반 구현 |
| VIII. 주석 전략 | ✅ PASS | WHY 중심 주석 유지 |
| IX. 브랜치 전략 | ✅ PASS | `feature/003-share-button-update` 브랜치 사용 |
| X. E2E 테스트 원칙 | ✅ PASS | Maestro E2E 테스트 작성 포함 |

**결과**: 전체 PASS — 위반 사항 없음

## Project Structure

### Documentation (this feature)

```text
specs/003-share-button-update/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (변경 대상 파일)

```text
frontend/
├── src/
│   ├── components/
│   │   └── todo/
│   │       └── ShareButton.tsx          # 팝업 메뉴 순서 변경, 토스트 위치 변경
│   └── features/
│       └── share/
│           └── useShareTodo.ts          # shareToSelf → copyToClipboard 리네이밍
└── __tests__/
    └── unit/
        └── features/
            └── share/
                └── useShareTodo.test.ts # 테스트 업데이트

.maestro/
├── share/
│   └── share_todo.yml                   # E2E 업데이트 (메뉴 순서/문구 변경)
└── plan/
    └── share.yml                        # E2E 업데이트 (메뉴 순서/문구 변경)
```

**Structure Decision**: 기존 프로젝트 구조 그대로 유지. 신규 파일 생성 없이 기존 파일 수정으로 완료.

## Complexity Tracking

> 위반 사항 없음 — 이 섹션은 비어 있음.
