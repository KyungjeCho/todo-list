# Implementation Plan: Security Hardening — Dependency Upgrades & Input Validation

**Branch**: `009-security-dep-input-fix` | **Date**: 2026-04-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-security-dep-input-fix/spec.md`

## Summary

공개된 Critical/High 취약점을 가진 의존성 4건(axios, NestJS core/common/platform-express/config, ts-jest, xmldom)을 패치 버전으로 업그레이드하고, 백엔드 Memo DTO에 `MaxLength(5000)` 검증을 추가하며, 프론트엔드 config에 프로덕션 HTTPS 강제 검증을 추가한다.

사용자 입력: `frontend는 ReactNative + TypeScript로 구현한다. backend는 Nest.js + TypeScript로 구현한다.`

## Technical Context

**Language/Version**: TypeScript 5.9 (Frontend), TypeScript 5.7 (Backend)
**Primary Dependencies**:
- Frontend: React Native 0.83 (Expo ~55), axios ^1.13.6
- Backend: NestJS ^11.0.1, class-validator ^0.15.1, TypeORM ^0.3.28
**Storage**: Supabase (PostgreSQL) via TypeORM — 스키마 변경 없음
**Testing**: Jest 30.x, ts-jest ^29.x (양측), @testing-library/react-native (Frontend), supertest (Backend)
**Target Platform**: iOS/Android (React Native), Linux Server (NestJS)
**Project Type**: Mobile App (Frontend) + REST API (Backend)
**Performance Goals**: 기존 성능 기준 유지 (변경으로 인한 성능 저하 없음)
**Constraints**: 소스 코드 변경 최소화 (3개 파일), 기존 테스트 전체 통과 필수
**Scale/Scope**: 의존성 업그레이드 4건 + 소스 코드 수정 3파일

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 상태 | 비고 |
|------|------|------|
| I. 한국어 우선 | PASS | 문서 한국어, 코드 식별자 영어 |
| II. 엄격한 TypeScript | PASS | `any` 미사용, DTO에 런타임 검증(MaxLength) 추가 |
| III. TDD 우선 | PASS | DTO MaxLength · HTTPS 강제 각각 테스트 선행 작성 |
| IV. 계층 분리 | PASS | DTO 수정은 application 계층, config는 infra 계층 — 계층 경계 준수 |
| V. 실패 처리와 관측성 | PASS | MaxLength 초과 시 400 에러, HTTPS 미충족 시 명확한 에러 메시지 |
| VI. 단순성 우선 | PASS | 새 라이브러리 추가 없음, 최소 변경 |
| VII. 명세서 중심 개발 | PASS | spec.md 기반 구현 |
| VIII. 주석 전략 | PASS | WHY 주석만 필요 시 추가 |
| IX. 브랜치 전략 | PASS | feature/009-security-dep-input-fix 브랜치에서 작업 |
| X. E2E 테스트 | N/A | UI 변경 없음 — 사용자에게 보이는 화면 변경 없으므로 Maestro E2E 불필요 |

**위반 사항**: 없음

## Project Structure

### Documentation (this feature)

```text
specs/009-security-dep-input-fix/
├── plan.md              # 이 파일
├── research.md          # Phase 0: 의존성 취약점 조사 결과
├── data-model.md        # Phase 1: Memo 엔티티 변경 사항
├── quickstart.md        # Phase 1: 빠른 시작 가이드
├── contracts/           # Phase 1: API 계약 변경
│   └── memo-api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2: /speckit.tasks 생성
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── memo/
│       └── application/
│           └── dto/
│               ├── create-memo.dto.ts    # MaxLength(5000) 추가
│               └── update-memo.dto.ts    # MaxLength(5000) 추가
└── test/
    └── unit/
        └── memo/
            └── application/
                └── memo-dto-validation.spec.ts  # DTO 검증 테스트 (신규)

frontend/
├── src/
│   └── services/
│       └── config.ts                    # HTTPS 강제 검증 추가
├── __tests__/
│   └── services/
│       └── config.spec.ts               # config 검증 테스트 (신규)
└── package.json                         # overrides 추가 (xmldom)
```

**Structure Decision**: 기존 프로젝트 구조를 그대로 유지한다. 새 디렉토리 생성 없이 기존 경로에 파일 수정 및 테스트 추가만 수행한다.

## Complexity Tracking

위반 사항 없음 — 이 섹션은 해당 없음.

---

## Phase 0: Research

→ [research.md](./research.md) 참조

## Phase 1: Design & Contracts

→ [data-model.md](./data-model.md) 참조
→ [contracts/memo-api.md](./contracts/memo-api.md) 참조
→ [quickstart.md](./quickstart.md) 참조

---

## Phase 2: Implementation Plan

### Phase 2-1: 의존성 업그레이드 (코드 변경 없음)

TDD 대상 아님 — npm 패키지 버전만 변경하며, 기존 테스트 스위트가 회귀 검증 역할을 한다.

**작업 순서**:

1. **Frontend axios 업그레이드**: `axios@1.13.6` → `axios@1.15.0`
   - `cd frontend && npm install axios@1.15.0`
   - 검증: `npm audit` 에서 axios 관련 취약점 0건

2. **Backend NestJS 패키지 업그레이드**: core/common/platform-express `@11.1.19`, config `@4.0.4`
   - `cd backend && npm install @nestjs/core@11.1.19 @nestjs/common@11.1.19 @nestjs/platform-express@11.1.19 @nestjs/config@4.0.4`
   - 검증: `npm audit` 에서 NestJS 관련 취약점 0건

3. **Frontend/Backend ts-jest 업그레이드**: `ts-jest@29.4.6/29.2.5` → `ts-jest@29.4.9`
   - `cd frontend && npm install --save-dev ts-jest@29.4.9`
   - `cd backend && npm install --save-dev ts-jest@29.4.9`
   - 검증: handlebars 취약점 해소

4. **Frontend xmldom overrides 추가**: `@xmldom/xmldom@0.8.11` → `0.8.12`
   - `frontend/package.json`에 `"overrides": { "@xmldom/xmldom": "0.8.12" }` 추가
   - `cd frontend && npm install`
   - 검증: xmldom 취약점 해소

5. **회귀 테스트**: 양측 전체 테스트 스위트 실행
   - `cd frontend && npm test`
   - `cd backend && npm test`

### Phase 2-2: Memo DTO MaxLength 추가 (TDD)

**Red → Green → Refactor 순서**:

1. **Red**: `backend/test/unit/memo/application/memo-dto-validation.spec.ts` 작성
   - 테스트 1: content가 5000자 이하일 때 검증 통과
   - 테스트 2: content가 5001자일 때 검증 실패 (MaxLength 에러)
   - 테스트 3: content가 정확히 5000자일 때 검증 통과 (경계값)
   - CreateMemoDto, UpdateMemoDto 양쪽에 대해 동일 테스트

2. **Green**: DTO 파일 수정
   - `backend/src/memo/application/dto/create-memo.dto.ts`: `@MaxLength(5000)` 추가, import에 `MaxLength` 추가
   - `backend/src/memo/application/dto/update-memo.dto.ts`: 동일 수정

3. **Refactor**: 중복 제거가 필요하면 수행 (현재 2파일 × 1줄이므로 추상화 불필요)

### Phase 2-3: HTTPS 강제 검증 (TDD)

**Red → Green → Refactor 순서**:

1. **Red**: `frontend/__tests__/services/config.spec.ts` 작성
   - 테스트 1: `__DEV__`가 true일 때 HTTP URL 허용 (에러 없음)
   - 테스트 2: `__DEV__`가 false이고 HTTP URL일 때 에러 throw
   - 테스트 3: `__DEV__`가 false이고 HTTPS URL일 때 정상 동작
   - 테스트 4: 환경변수 미설정 + `__DEV__` true 시 localhost 기본값으로 정상 동작
   - 테스트 5: 환경변수 미설정 + `__DEV__` false 시 localhost HTTP 기본값으로 에러 throw

2. **Green**: `frontend/src/services/config.ts` 수정
   - `apiBaseUrl` 추출 후 `if (!__DEV__ && apiBaseUrl.startsWith('http://'))` 가드 추가
   - 에러 메시지: `'EXPO_PUBLIC_API_BASE_URL must use HTTPS in production builds'`

3. **Refactor**: 단순 조건문이므로 추가 리팩토링 불필요

### Phase 2-4: 최종 검증

1. 전체 린트: `cd frontend && npm run lint` / `cd backend && npm run lint`
2. 전체 테스트: `cd frontend && npm test` / `cd backend && npm test`
3. `npm audit` 실행하여 대상 CVE 해소 확인
