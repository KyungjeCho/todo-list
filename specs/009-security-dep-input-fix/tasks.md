# Tasks: Security Hardening — Dependency Upgrades & Input Validation

**Input**: Design documents from `/specs/009-security-dep-input-fix/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/memo-api.md

**Tests**: TDD 필수 (헌법 III. TDD 우선 원칙 — NON-NEGOTIABLE)

**Organization**: 작업은 User Story별로 그룹화하여 독립적 구현/테스트가 가능하도록 구성한다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 의존성 없음)
- **[Story]**: 해당 User Story (US1, US2, US3)
- 모든 설명에 정확한 파일 경로 포함

---

## Phase 1: Setup

**Purpose**: 브랜치 확인 및 현재 상태 검증

- [X] T001 `009-security-dep-input-fix` 브랜치 체크아웃 확인 및 현재 테스트 스위트 전체 통과 검증 (`cd frontend && npm test` / `cd backend && npm test`)

---

## Phase 2: User Story 1 — 의존성 취약점 제거 (Priority: P1) 🎯 MVP

**Goal**: Critical/High 취약점이 있는 의존성 4건을 패치 버전으로 업그레이드하여 공개된 공격 벡터를 제거한다.

**Independent Test**: 업그레이드 후 `npm audit` 실행 시 대상 패키지에서 critical/high 취약점 0건, 전체 테스트 스위트 통과

### Implementation for User Story 1

- [X] T002 [P] [US1] Frontend axios 업그레이드: `axios@1.13.6` → `axios@1.15.0` in `frontend/package.json` (`cd frontend && npm install axios@1.15.0`)
- [X] T003 [P] [US1] Backend NestJS 패키지 업그레이드: core/common/platform-express `@11.1.19`, config `@4.0.4` in `backend/package.json` (`cd backend && npm install @nestjs/core@11.1.19 @nestjs/common@11.1.19 @nestjs/platform-express@11.1.19 @nestjs/config@4.0.4`)
- [X] T004 [P] [US1] Frontend ts-jest 업그레이드: `ts-jest@29.4.6` → `ts-jest@29.4.9` in `frontend/package.json` (`cd frontend && npm install --save-dev ts-jest@29.4.9`)
- [X] T005 [P] [US1] Backend ts-jest 업그레이드: `ts-jest@29.2.5` → `ts-jest@29.4.9` in `backend/package.json` (`cd backend && npm install --save-dev ts-jest@29.4.9`)
- [X] T006 [US1] Frontend xmldom overrides 추가: `"overrides": { "@xmldom/xmldom": "0.8.12" }` in `frontend/package.json` 후 `cd frontend && npm install`
- [X] T007 [US1] Frontend 회귀 테스트 실행: `cd frontend && npm test` — 전체 통과 확인
- [X] T008 [US1] Backend 회귀 테스트 실행: `cd backend && npm test` — 전체 통과 확인
- [X] T009 [US1] 보안 감사 실행: `cd frontend && npm audit` / `cd backend && npm audit` — 대상 패키지 critical/high 0건 확인

**Checkpoint**: 모든 의존성 업그레이드 완료, 취약점 해소, 기존 기능 회귀 없음

---

## Phase 3: User Story 2 — Memo 콘텐츠 길이 제한 (Priority: P2)

**Goal**: Memo content 필드에 5,000자 최대 길이 제한을 추가하여 과도한 입력으로 인한 서비스 품질 저하를 방지한다.

**Independent Test**: 5,000자 초과 메모 생성/수정 요청 시 400 에러 반환, 5,000자 이하는 정상 처리

### Tests for User Story 2 (TDD — Red Phase)

> **NOTE: 테스트를 먼저 작성하고, 실패를 확인한 뒤 구현한다**

- [X] T010 [US2] CreateMemoDto 검증 테스트 작성 in `backend/test/unit/memo/application/memo-dto-validation.spec.ts` — 5,000자 이하 통과, 5,001자 실패, 정확히 5,000자 통과 (경계값), 한국어 등 multi-byte 문자로 구성된 5,000자 통과 확인
- [X] T011 [US2] UpdateMemoDto 검증 테스트 작성 in `backend/test/unit/memo/application/memo-dto-validation.spec.ts` — CreateMemoDto와 동일한 검증 시나리오 (multi-byte 문자 경계값 포함)
- [X] T012 [US2] Red 확인: `cd backend && npm test -- --testPathPattern=memo-dto-validation` 실행하여 테스트 실패 확인

### Implementation for User Story 2 (TDD — Green Phase)

- [X] T013 [P] [US2] CreateMemoDto에 `@MaxLength(5000)` 추가 및 import 수정 in `backend/src/memo/application/dto/create-memo.dto.ts`
- [X] T014 [P] [US2] UpdateMemoDto에 `@MaxLength(5000)` 추가 및 import 수정 in `backend/src/memo/application/dto/update-memo.dto.ts`
- [X] T015 [US2] Green 확인: `cd backend && npm test -- --testPathPattern=memo-dto-validation` 실행하여 테스트 전체 통과 확인
- [X] T016 [US2] Backend 전체 테스트 회귀 확인: `cd backend && npm test` — 전체 통과

**Checkpoint**: Memo MaxLength 검증 완료 — 5,000자 초과 요청은 400 반환, 이하는 정상 처리

---

## Phase 4: User Story 3 — 프로덕션 HTTPS 강제 (Priority: P2)

**Goal**: 프로덕션 빌드에서 HTTP 백엔드 URL 사용을 차단하여 사용자 데이터가 암호화되지 않은 연결로 전송되는 것을 방지한다.

**Independent Test**: 프로덕션 모드(`__DEV__` false) + HTTP URL 시 에러 throw, 개발 모드에서는 HTTP 허용

### Tests for User Story 3 (TDD — Red Phase)

> **NOTE: 테스트를 먼저 작성하고, 실패를 확인한 뒤 구현한다**

- [X] T017 [US3] config HTTPS 강제 검증 테스트 작성 in `frontend/__tests__/services/config.spec.ts` — (1) `__DEV__` true + HTTP URL 시 정상, (2) `__DEV__` false + HTTP URL 시 에러, (3) `__DEV__` false + HTTPS URL 시 정상, (4) 환경변수 미설정 + `__DEV__` true 시 localhost 기본값으로 정상 동작, (5) 환경변수 미설정 + `__DEV__` false 시 localhost HTTP 기본값으로 인해 에러 throw
- [X] T018 [US3] Red 확인: `cd frontend && npm test -- --testPathPattern=config` 실행하여 테스트 실패 확인

### Implementation for User Story 3 (TDD — Green Phase)

- [X] T019 [US3] `frontend/src/services/config.ts`에 HTTPS 강제 검증 추가 — `apiBaseUrl` 추출, `if (!__DEV__ && apiBaseUrl.startsWith('http://'))` 가드, 에러 메시지 포함
- [X] T020 [US3] Green 확인: `cd frontend && npm test -- --testPathPattern=config` 실행하여 테스트 전체 통과 확인
- [X] T021 [US3] Frontend 전체 테스트 회귀 확인: `cd frontend && npm test` — 전체 통과

**Checkpoint**: HTTPS 강제 검증 완료 — 프로덕션에서 HTTP URL 차단, 개발 모드 영향 없음

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 전체 코드 품질 검증 및 마무리

- [X] T022 [P] Frontend 린트 실행: `cd frontend && npm run lint` — 경고/에러 0건
- [X] T023 [P] Backend 린트 실행: `cd backend && npm run lint` — 경고/에러 0건
- [X] T024 최종 보안 감사: `cd frontend && npm audit` / `cd backend && npm audit` — 대상 CVE 전체 해소 확인
- [X] T025 quickstart.md 절차 검증: `specs/009-security-dep-input-fix/quickstart.md` 에 기술된 절차대로 실행하여 정상 동작 확인

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 의존성 없음 — 즉시 시작
- **Phase 2 (US1 — 의존성 업그레이드)**: Phase 1 완료 후 시작 — 모든 후속 User Story의 전제 조건
- **Phase 3 (US2 — Memo MaxLength)**: Phase 2 완료 후 시작 — US3와 독립
- **Phase 4 (US3 — HTTPS 강제)**: Phase 2 완료 후 시작 — US2와 독립
- **Phase 5 (Polish)**: Phase 3, 4 모두 완료 후 시작

### User Story Dependencies

- **US1 (P1)**: 독립 — Phase 1 이후 즉시 시작 가능
- **US2 (P2)**: US1 완료 필요 (업그레이드된 의존성 위에서 작업) — US3과 독립
- **US3 (P2)**: US1 완료 필요 (업그레이드된 의존성 위에서 작업) — US2와 독립

### Within Each User Story

- TDD: 테스트 작성 → 실패 확인 → 구현 → 통과 확인 → 회귀 테스트
- US1은 코드 변경 없으므로 기존 테스트가 회귀 검증 역할

### Parallel Opportunities

- **Phase 2 내**: T004, T005 병렬 (frontend/backend ts-jest 동시 업그레이드)
- **Phase 3, 4 간**: US2와 US3는 서로 독립이므로 병렬 실행 가능
- **Phase 3 내**: T013, T014 병렬 (CreateMemoDto, UpdateMemoDto 동시 수정)
- **Phase 5 내**: T022, T023 병렬 (frontend/backend 린트 동시 실행)

---

## Parallel Example: User Story 2 & 3 동시 진행

```bash
# US2와 US3는 Phase 2 완료 후 병렬 시작 가능:

# Developer A (US2 — Backend):
Task: T010 "CreateMemoDto 검증 테스트 작성 in backend/test/unit/memo/application/memo-dto-validation.spec.ts"
Task: T011 "UpdateMemoDto 검증 테스트 작성 (동일 파일)"
Task: T012 "Red 확인"
Task: T013 "CreateMemoDto @MaxLength(5000) 추가"
Task: T014 "UpdateMemoDto @MaxLength(5000) 추가"
Task: T015 "Green 확인"

# Developer B (US3 — Frontend):
Task: T017 "config HTTPS 검증 테스트 작성 in frontend/__tests__/services/config.spec.ts"
Task: T018 "Red 확인"
Task: T019 "config.ts HTTPS 강제 검증 구현"
Task: T020 "Green 확인"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 완료: Setup
2. Phase 2 완료: 의존성 업그레이드 4건
3. **STOP and VALIDATE**: `npm audit` + 전체 테스트 통과
4. 이 시점에서 가장 긴급한 보안 취약점(CVSS 10.0 포함)이 해소됨

### Incremental Delivery

1. US1 완료 → 의존성 취약점 제거 (MVP)
2. US2 추가 → Memo 입력 검증 강화
3. US3 추가 → 프로덕션 HTTPS 강제
4. 각 Story가 독립적으로 가치를 전달하며, 이전 Story를 깎지 않음

### Single Developer Strategy (권장 순서)

1. Phase 1 → Phase 2 (US1) → Phase 3 (US2) → Phase 4 (US3) → Phase 5
2. 우선순위 순으로 진행하되, US2/US3는 순서 변경 가능 (둘 다 P2)

---

## Notes

- 전체 소스 코드 변경: 3개 파일 (create-memo.dto.ts, update-memo.dto.ts, config.ts)
- 신규 테스트 파일: 2개 (memo-dto-validation.spec.ts, config.spec.ts)
- 의존성 업그레이드는 TDD 대상이 아닌 npm 버전 변경 — 기존 테스트 스위트가 회귀 검증
- 커밋은 Phase별 또는 User Story별로 1개씩 생성 권장
