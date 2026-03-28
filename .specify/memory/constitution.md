<!--
=== Sync Impact Report ===
Version change: 1.1.0 → 1.2.0
Modified principles: N/A
Added sections:
  - IX. 브랜치 전략 (Branch Strategy)
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ compatible
    (Constitution Check section exists; gates will be derived
     from these 9 principles at plan time)
  - .specify/templates/spec-template.md ✅ compatible
    (no changes needed)
  - .specify/templates/tasks-template.md ✅ compatible
    (no changes needed)
  - .specify/templates/commands/*.md — no command files found
  - .specify/scripts/bash/common.sh ✅ updated
    (check_feature_branch, find_feature_dir_by_prefix now support
     feature/*, fix/*, hotfix/* branch patterns)
Follow-up TODOs: none
-->

# Todo List 헌법 (Constitution)

## Core Principles

### I. 한국어 우선 원칙

모든 spec, plan, tasks, ADR, 코드리뷰 설명은 한국어로 작성한다.
코드 식별자와 기술 표준 용어(e.g., controller, usecase, DTO)는
영어를 유지한다. 사용자에게 노출되는 문구는 한국어 기준으로 설계한다.

**근거**: 팀 커뮤니케이션과 문서 접근성을 한국어 사용자 기준으로
최적화하되, 코드 가독성과 글로벌 기술 생태계 호환성을 유지한다.

### II. 엄격한 TypeScript 원칙

- 모든 코드에서 `any` 사용을 **금지**한다.
- 외부 입력(API 요청, 사용자 입력, 환경 변수 등)은 반드시
  런타임 검증(validation)을 거쳐야 한다.
- 프론트엔드와 백엔드의 계약은 DTO 정의, validation 로직,
  API 문서, 테스트가 일치해야 한다.

**근거**: 타입 안전성은 런타임 오류를 사전에 차단하고,
계약 일치는 프론트-백 간 통합 결함을 방지한다.

### III. TDD 우선 원칙 (NON-NEGOTIABLE)

- 모든 기능 개발과 버그 수정은 **실패하는 테스트를 먼저 작성**한
  뒤 구현한다 (Red → Green → Refactor).
- 최소한 unit test, integration test, e2e test 중 적절한 수준의
  테스트가 포함되어야 한다.
- 테스트 없는 기능 완료를 **허용하지 않는다**.

**근거**: 테스트 선행은 요구사항 이해를 강제하고,
회귀 결함을 구조적으로 방지한다.

### IV. 계층 분리 원칙

- **React Native**: screen → feature/usecase → service/api → infra
  계층을 분리한다.
- **NestJS**: controller → application/usecase → domain →
  infrastructure 계층을 분리한다.
- 비즈니스 규칙은 프레임워크나 UI 세부사항에 직접 의존하면
  **안 된다**.

**근거**: 계층 분리는 테스트 용이성, 교체 가능성, 변경 영향
범위 최소화를 보장한다.

### V. 실패 처리와 관측성 원칙

- 모든 기능은 성공 상태뿐 아니라 **loading, empty, error** 상태를
  설계해야 한다.
- 서버는 구조화된 로그와 추적 가능한 에러 코드를 남겨야 한다.
- 클라이언트는 사용자 친화적 오류 메시지를 제공해야 한다.

**근거**: 실패 상태를 설계하지 않으면 사용자 경험이 불완전하고,
구조화된 로그 없이는 프로덕션 디버깅이 불가능하다.

### VI. 단순성 우선 원칙

- 새 라이브러리 추가와 추상화는 **명확한 이유가 있을 때만**
  허용한다.
- 중복보다 premature abstraction을 더 경계한다.
- 각 모듈은 하나의 책임만 가진다 (Single Responsibility).

**근거**: 불필요한 복잡성은 유지보수 비용을 기하급수적으로
증가시킨다. YAGNI 원칙을 준수한다.

### VII. 명세서 중심 개발

참고 사항이 생기면 다음 문서를 우선 참고한다:

- `@PRD.md` — 제품 요구사항
- `@TECH_SPEC.md` — 기술 명세
- `@COMPONENT_DIAGRAM.md` — 컴포넌트 다이어그램
- `@ARCHITECTURE_DIAGRAM.md` — 아키텍처 다이어그램
- `@DDL.sql` — 데이터베이스 스키마
- `@API_SPEC.md` — API 명세

**근거**: 명세서를 단일 진실 공급원(Single Source of Truth)으로
유지하여 구현과 문서 간 불일치를 방지한다.

### VIII. 주석 전략 (Commenting Strategy)

- **WHY 중심 주석**: 코드가 "무엇을 하는지"가 아니라
  "왜 이렇게 하는지"를 설명하는 주석만 작성한다.
  코드 자체가 WHAT을 설명해야 한다.
- **공개 API 문서화**: 외부에 노출되는 함수, 클래스, 모듈은
  JSDoc/TSDoc 형식으로 목적, 매개변수, 반환값을 문서화한다.
- **복잡한 비즈니스 로직 설명**: 도메인 규칙이나 비자명한
  알고리즘에는 의사결정 배경을 주석으로 남긴다.
- **TODO/FIXME 규칙**: `TODO(담당자): 설명` 또는
  `FIXME(담당자): 설명` 형식을 사용하며, 이슈 번호를
  함께 기재한다 (e.g., `TODO(jkjk396): #42 캐시 무효화 로직 추가`).
- **금지 사항**:
  - 코드를 그대로 반복하는 주석 (e.g., `// i를 1 증가`)
  - 주석 처리된 코드 (삭제하고 git history에 위임)
  - 변경 로그 주석 (git commit에 위임)

**근거**: 좋은 주석은 코드만으로 전달할 수 없는 맥락을 보존하고,
나쁜 주석은 코드와 동기화되지 않아 오히려 혼란을 야기한다.
팀 전체가 일관된 주석 기준을 공유해야 코드 리뷰 품질이 향상된다.

### IX. 브랜치 전략 (Branch Strategy)

- **main**: 프로덕션 배포 가능 상태를 유지하는 보호 브랜치.
  직접 push를 **금지**하며, **PR(Pull Request)을 통해서만**
  병합한다.
- **feature/NNN-name**: 새 기능 개발 브랜치.
  `/speckit.specify`로 새 기능을 시작하면 `feature/*` 브랜치를
  생성한다 (e.g., `feature/001-todo-mobile-service`).
- **fix/NNN-name**: 버그 수정 브랜치.
  기존 기능의 결함을 수정할 때 사용한다.
- **hotfix/NNN-name**: 긴급 수정 브랜치.
  프로덕션 장애 대응 시 main에서 분기하여 즉시 수정한다.
- 모든 브랜치는 main으로 병합 전 **PR 리뷰를 필수**로 거친다.
- 병합 완료된 브랜치는 삭제한다.

**근거**: 브랜치 전략을 명확히 하면 동시 작업 시 충돌을
최소화하고, PR 필수 정책은 코드 품질 게이트로 기능한다.

## 거버넌스 (Governance)

- 본 헌법은 모든 spec, plan, tasks보다 **상위 규범**이다.
- 모든 spec과 plan은 위 헌법 원칙을 위반할 수 없다.
- 구현 전 `/speckit.analyze` 단계에서 헌법 위반 여부를 점검하고,
  위반 시 spec 또는 plan을 수정해야 한다.
- 헌법 개정은 변경 사유, 영향 범위, 마이그레이션 계획을
  문서화한 뒤 반영한다.
- 버전 관리는 Semantic Versioning을 따른다:
  - **MAJOR**: 원칙 삭제 또는 비호환 재정의
  - **MINOR**: 원칙 추가 또는 기존 원칙의 실질적 확장
  - **PATCH**: 문구 명확화, 오타 수정, 비의미적 개선

## 완료 기준 (Definition of Done)

모든 작업은 다음 조건을 **모두** 만족해야 완료로 간주한다:

1. 요구사항 충족
2. 테스트 통과 (관련 테스트 전체)
3. TypeScript 타입 오류 없음
4. 린트 통과
5. 문서 동기화 (변경된 기능에 대한 문서 업데이트)
6. 실패 처리 구현 (loading, empty, error 상태)

**Version**: 1.2.0 | **Ratified**: 2026-03-26 | **Last Amended**: 2026-03-28
