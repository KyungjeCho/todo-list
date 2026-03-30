# Implementation Plan: Todo Mobile Service

**Branch**: `001-todo-mobile-service` | **Date**: 2026-03-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-todo-mobile-service/spec.md`

## Summary

"계획 → 실행 → 회고" 루틴 기반의 Todo 일정 관리 모바일 앱을 개발한다. React Native(Expo, TypeScript) 프론트엔드와 NestJS(TypeScript) 백엔드로 구성하며, Supabase(PostgreSQL)를 데이터 저장소로 사용한다. OAuth 소셜 로그인, 할 일 CRUD, 시간대별 모드 전환, 자동 이월, 푸시 알림, 음성 인식(STT+LLM), 캘린더, 공유 기능을 포함한다. AWS Lambda(Container Image) + API Gateway 기반으로 배포한다. 모든 기능은 TDD(Red → Green → Refactor) 원칙을 준수하여 개발한다.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend & Backend)
**Primary Dependencies**:
- Frontend: React Native (Expo), React Navigation, Zustand (상태 관리), Axios, Zod (검증)
- Backend: NestJS, TypeORM, Passport (OAuth), node-cron, firebase-admin, class-validator
**Storage**: Supabase (PostgreSQL) — 디스크 수준 AES-256 암호화, 추가 앱 레벨 암호화 없음
**Testing**:
- Frontend: Jest, React Native Testing Library, Maestro MCP (E2E)
- Backend: Jest, Supertest (통합 테스트)
**Target Platform**: iOS 15+, Android 12+
**Project Type**: Mobile App + API Server (Monorepo: `frontend/` + `backend/`)
**Performance Goals**: 앱 로딩 2초 이내, API 응답 200ms 이내, 음성 인식 전체 3초 이내
**Constraints**: 알림 ±1분 정확도, 서비스 가용률 99.5%+, 오프라인 미지원 (v1)
**Scale/Scope**: 3개 타겟 페르소나, 8개 사용자 스토리, 27개 기능 요구사항, 9개 DB 테이블
**Accessibility**: v1 기본 접근성 (접근성 라벨, 색상 대비 4.5:1). WCAG 2.1 AA 완전 준수는 v2

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 상태 | 근거 |
|------|------|------|
| I. 한국어 우선 | PASS | 모든 문서가 한국어로 작성됨. 코드 식별자/기술 용어는 영어 유지 |
| II. 엄격한 TypeScript | PASS | `any` 금지, 외부 입력 런타임 검증(class-validator/Zod), DTO 계약 일치 |
| III. TDD 우선 | PASS | 모든 기능에 Red → Green → Refactor 적용. unit/integration/e2e 테스트 계획 포함 |
| IV. 계층 분리 | PASS | Frontend: screen → feature/usecase → service/api → infra. Backend: controller → usecase → domain → infrastructure |
| V. 실패 처리와 관측성 | PASS | loading/empty/error 상태 설계. 구조화 로그 + 추적 가능 에러 코드 |
| VI. 단순성 우선 | PASS | 최소 라이브러리, premature abstraction 회피, SRP 준수 |
| VII. 명세서 중심 개발 | PASS | `specify/` 디렉토리에 PRD, TECH_SPEC, DDL, API_SPEC, COMPONENT_DIAGRAM, ARCHITECTURE_DIAGRAM 존재 확인 |
| VIII. 주석 전략 | PASS | WHY 중심 주석, 공개 API JSDoc/TSDoc 문서화, TODO/FIXME는 `TODO(담당자): #이슈번호 설명` 형식 (GitHub Issues 연동) |
| IX. 브랜치 전략 | PASS | `feature/001-todo-mobile-service` 브랜치에서 작업 중. main 병합 시 PR 필수 |
| X. E2E 테스트 (Maestro) | PASS | P1-P2 Phase별 Maestro E2E 테스트 작성, P3-P4는 Polish 전 별도 Phase에서 진행. appId: `com.todolist.app`, testID 기반 요소 탐색 |

**결과: 모든 Gate 통과 (10/10). Phase 0 진행.**

## Project Structure

### Documentation (this feature)

```text
specs/001-todo-mobile-service/
├── plan.md              # 이 파일
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-contracts.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/                    # 공통 유틸, 필터, 인터셉터, 데코레이터
│   │   ├── filters/
│   │   ├── interceptors/
│   │   ├── decorators/
│   │   └── dto/
│   ├── auth/                      # 인증 모듈
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── application/           # usecase
│   │   ├── domain/                # 도메인 로직
│   │   └── infrastructure/        # OAuth strategy, JWT, repository
│   ├── user/                      # 사용자 모듈
│   │   ├── user.module.ts
│   │   ├── user.controller.ts
│   │   ├── application/
│   │   ├── domain/
│   │   └── infrastructure/
│   ├── todo/                      # 할 일 모듈
│   │   ├── todo.module.ts
│   │   ├── todo.controller.ts
│   │   ├── application/
│   │   ├── domain/
│   │   └── infrastructure/
│   ├── memo/                      # 메모 모듈
│   │   ├── memo.module.ts
│   │   ├── memo.controller.ts
│   │   ├── application/
│   │   ├── domain/
│   │   └── infrastructure/
│   ├── notification/              # 알림 모듈
│   │   ├── notification.module.ts
│   │   ├── application/
│   │   ├── domain/
│   │   └── infrastructure/        # FCM 서비스
│   ├── scheduler/                 # 스케줄러 모듈
│   │   ├── scheduler.module.ts
│   │   └── application/           # 이월, 알림 스케줄러
│   └── ai/                        # AI 모듈 (STT + LLM)
│       ├── ai.module.ts
│       ├── application/
│       └── infrastructure/        # 외부 API 클라이언트
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── Dockerfile
├── nest-cli.json
├── tsconfig.json
└── package.json

frontend/
├── src/
│   ├── app/                       # 앱 진입점, 네비게이션
│   │   ├── App.tsx
│   │   └── navigation/
│   ├── screens/                   # 화면 컴포넌트
│   │   ├── auth/
│   │   ├── onboarding/
│   │   ├── main/                  # Plan/Review 메인 화면
│   │   ├── calendar/
│   │   └── settings/
│   ├── features/                  # 기능별 usecase/hook
│   │   ├── auth/
│   │   ├── todo/
│   │   ├── memo/
│   │   ├── notification/
│   │   └── share/
│   ├── services/                  # API 통신 계층
│   │   ├── api/
│   │   └── storage/
│   ├── components/                # 공용 UI 컴포넌트
│   │   ├── common/
│   │   └── todo/
│   ├── store/                     # Zustand 상태 관리
│   └── types/                     # 공유 타입 정의
├── __tests__/
│   ├── unit/
│   └── integration/
├── app.json
├── tsconfig.json
└── package.json

.maestro/                           # Maestro E2E 테스트 (헌법 X조)
├── auth/                           # US1: OAuth 인증/온보딩
│   ├── login.yml
│   └── onboarding.yml
├── todo/                           # US2: 할 일 CRUD
│   ├── create.yml
│   ├── update.yml
│   └── delete.yml
├── review/                         # US3: 회고/이월
│   └── daily_review.yml
├── notification/                   # US4: 푸시 알림
│   └── push_notification.yml
├── memo/                           # US5: 메모 첨부
│   └── memo_crud.yml
└── config.yaml                     # appId: com.todolist.app
```

**Structure Decision**: Frontend + Backend 분리 구조를 선택한다. Monorepo 내에 `frontend/`와 `backend/` 디렉토리를 배치한다. Backend는 NestJS의 모듈 기반 구조에 계층 분리(controller → application → domain → infrastructure)를 적용한다. Frontend는 screen → features → services → components 계층으로 분리한다.

## Complexity Tracking

> 해당 없음. Constitution Check에 위반 사항 없음.
