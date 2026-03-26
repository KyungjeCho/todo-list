헌법 원칙은 다음과 같다.

1. 한국어 우선 원칙
모든 spec, plan, tasks, ADR, 코드리뷰 설명은 한국어로 작성한다. 코드 식별자와 기술 표준 용어는 영어를 유지한다. 사용자 노출 문구는 한국어 기준으로 설계한다.

2. 엄격한 TypeScript 원칙
모든 코드에서 any 사용을 금지한다. 외부 입력은 런타임 검증을 거쳐야 하며, 프론트엔드와 백엔드의 계약은 DTO, validation, 문서, 테스트가 일치해야 한다.

3. TDD 우선 원칙
모든 기능 개발과 버그 수정은 실패하는 테스트를 먼저 작성한 뒤 구현한다. 최소한 unit test, integration test, e2e test 중 적절한 수준의 테스트가 포함되어야 하며, 테스트 없는 기능 완료를 허용하지 않는다.

4. 계층 분리 원칙
React Native는 screen, feature/usecase, service/api, infra 계층을 분리한다. NestJS는 controller, application/usecase, domain, infrastructure 계층을 분리한다. 비즈니스 규칙은 프레임워크나 UI 세부사항에 직접 의존하면 안 된다.

5. 실패 처리와 관측성 원칙
모든 기능은 성공 상태뿐 아니라 loading, empty, error 상태를 설계해야 한다. 서버는 구조화된 로그와 추적 가능한 에러 코드를 남겨야 하며, 클라이언트는 사용자 친화적 오류 메시지를 제공해야 한다.

6. 단순성 우선 원칙
새 라이브러리 추가와 추상화는 명확한 이유가 있을 때만 허용한다. 중복보다 premature abstraction을 더 경계하며, 각 모듈은 하나의 책임만 가진다.

7. 명세서 중심 개발
참고 사항이 생기면 @PRD.md @TECH_SPEC.md @COMPONENT_DIAGRAM.md @ARCHITECTURE_DIAGRAM.md @DDL.sql @API_SPEC.md 를 참고한다.

거버넌스
모든 spec과 plan은 위 헌법을 위반할 수 없다. 구현 전 analyze 단계에서 헌법 위반 여부를 점검하고, 위반 시 spec 또는 plan을 수정해야 한다.

완료 기준
모든 작업은 요구사항 충족, 테스트 통과, 타입 오류 없음, 린트 통과, 문서 동기화, 실패 처리 구현을 만족해야 완료로 간주한다.