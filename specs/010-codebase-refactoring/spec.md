# Feature Specification: Codebase Refactoring

**Feature Branch**: `010-codebase-refactoring`  
**Created**: 2026-04-17  
**Status**: Draft  
**Input**: User description: "REFACTORING_REPORT.md를 기반으로 백엔드/프론트엔드 코드 리팩토링 실시"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 백엔드 중복 로직 통합 (Priority: P1)

개발자가 usecase 코드를 수정할 때, 사용자 검증(13곳)과 Todo 소유권 검증(6곳)이 단일 서비스로 통합되어 있어 한 곳만 수정하면 전체에 반영된다. Todo DTO 매핑(4곳)도 하나의 매퍼로 통합되어 일관된 응답 형식을 보장한다.

**Why this priority**: 19곳의 중복 코드가 가장 큰 유지보수 부담이며, 이를 해결하면 이후 모든 리팩토링 작업의 기반이 된다.

**Independent Test**: 기존 백엔드 단위/통합 테스트 40+개가 모두 통과하면 검증 완료. 사용자 검증 서비스를 변경했을 때 모든 usecase에 일괄 반영되는지 확인.

**Acceptance Scenarios**:

1. **Given** 사용자 검증이 필요한 usecase가 호출될 때, **When** 유효하지 않은 userAuthId가 전달되면, **Then** 통합된 검증 서비스에서 일관된 에러(USER_NOT_FOUND)가 반환된다.
2. **Given** Todo 소유권 검증이 필요한 usecase가 호출될 때, **When** 다른 사용자의 todoId가 전달되면, **Then** 통합된 인가 서비스에서 일관된 에러(FORBIDDEN)가 반환된다.
3. **Given** Todo를 생성/조회/수정하는 usecase가 실행될 때, **When** 응답 DTO가 생성되면, **Then** 모든 usecase에서 동일한 매퍼를 통해 일관된 형식의 응답이 반환된다.
4. **Given** 날짜 계산이 필요한 carryover/complete-day 로직이 실행될 때, **When** 다음 날짜를 계산하면, **Then** 통합된 유틸리티를 통해 동일한 결과가 반환된다.

---

### User Story 2 - 프론트엔드 대형 컴포넌트 분리 (Priority: P2)

SettingsScreen(767줄)이 여러 작은 컴포넌트로 분리되어, 개발자가 특정 설정 섹션만 수정할 때 해당 파일만 열면 된다. TodoItem에 성능 최적화가 적용되어 목록 스크롤 시 불필요한 리렌더링이 줄어든다.

**Why this priority**: 가장 큰 컴포넌트(767줄)의 분리는 프론트엔드 유지보수성에 직접적 영향을 미치며, TodoItem 최적화는 사용자 체감 성능을 개선한다.

**Independent Test**: SettingsScreen의 모든 기존 기능(언어 변경, 알림 설정, 시간 선택 등)이 분리 후에도 동일하게 동작하는지 E2E 테스트로 확인. TodoItem FlatList 스크롤 시 리렌더 횟수가 감소하는지 프로파일링으로 확인.

**Acceptance Scenarios**:

1. **Given** SettingsScreen이 분리된 상태에서, **When** 사용자가 언어를 변경하면, **Then** 기존과 동일하게 즉시 언어가 전환된다.
2. **Given** SettingsScreen이 분리된 상태에서, **When** 사용자가 알림 시간을 변경하면, **Then** 기존과 동일하게 낙관적 업데이트 후 서버 동기화가 이루어진다.
3. **Given** TodoItem에 memo 최적화가 적용된 상태에서, **When** 100개 이상의 할일 목록을 스크롤하면, **Then** 불필요한 리렌더가 발생하지 않는다.

---

### User Story 3 - 공통 컴포넌트 추출 (Priority: P3)

체크박스, 에러 배너, 로딩 인디케이터 등 반복되는 UI 패턴이 공통 컴포넌트로 추출되어, 디자인 변경 시 한 곳만 수정하면 전체 앱에 반영된다.

**Why this priority**: UI 일관성과 유지보수성을 높이지만, 기능적 변화가 아닌 구조적 개선이므로 중복 로직 통합/대형 컴포넌트 분리보다 후순위.

**Independent Test**: 공통 컴포넌트를 사용하는 모든 화면에서 기존과 동일한 UI/동작이 유지되는지 시각적 테스트로 확인.

**Acceptance Scenarios**:

1. **Given** 에러가 발생한 화면에서, **When** 공통 에러 배너가 표시되면, **Then** 에러 메시지와 재시도 버튼이 기존과 동일하게 동작한다.
2. **Given** 데이터 로딩 중인 화면에서, **When** 공통 로딩 인디케이터가 표시되면, **Then** 기존과 동일한 위치와 스타일로 표시된다.

---

### User Story 4 - 코드 품질 강화 (Priority: P4)

any 타입이 구체 타입으로 교체되고, DTO 검증이 강화되며, 에러 코드가 상수로 통합되어, 타입 안전성과 입력 검증이 개선된다. WHY 주석과 JSDoc이 보안 민감 코드 및 공개 API에 추가된다.

**Why this priority**: 타입 안전성과 입력 검증은 보안과 직결되지만, 기존 기능에 영향을 주지 않는 점진적 개선이므로 구조적 리팩토링 이후 진행.

**Independent Test**: TypeScript 컴파일 시 any 관련 오류가 0건인지 확인. DTO 검증 테스트에서 과도한 입력이 차단되는지 확인. 보안 민감 코드에 WHY 주석이 존재하는지 코드 리뷰로 확인.

**Acceptance Scenarios**:

1. **Given** memo 필드가 구체 타입으로 변경된 상태에서, **When** TypeScript 컴파일을 실행하면, **Then** any 관련 경고 없이 성공한다.
2. **Given** batch-create DTO에 배열 크기 제한이 적용된 상태에서, **When** 100개 이상의 할일을 한번에 생성 요청하면, **Then** 요청이 거부된다.
3. **Given** 에러 코드가 상수로 통합된 상태에서, **When** 동일한 에러 상황이 발생하면, **Then** 모든 usecase에서 일관된 에러 코드가 반환된다.

---

### User Story 5 - 커스텀 훅 및 성능 최적화 (Priority: P5)

타이머/인터벌 관리, API 호출 상태, 낙관적 업데이트 패턴이 커스텀 훅으로 추출된다. Zustand 셀렉터가 도입되어 불필요한 리렌더가 줄어들고, 중복 타입 정의가 통합된다.

**Why this priority**: 코드 재사용성과 성능을 개선하지만, 사용자에게 직접적으로 보이는 변화가 적으므로 최후순위.

**Independent Test**: 훅 추출 후 기존 기능 테스트가 모두 통과하는지 확인. Zustand 셀렉터 도입 후 불필요한 리렌더가 감소하는지 프로파일링으로 확인.

**Acceptance Scenarios**:

1. **Given** useTimer 훅이 추출된 상태에서, **When** 음성 입력/토스트 등에서 타이머를 사용하면, **Then** 기존과 동일하게 타이머가 동작하고 cleanup이 이루어진다.
2. **Given** Zustand 셀렉터가 적용된 상태에서, **When** 인증 토큰만 변경되면, **Then** 토큰을 구독하지 않는 컴포넌트는 리렌더되지 않는다.

---

### Edge Cases

- 리팩토링 과정에서 기존 테스트가 실패하면 어떻게 하는가? → 리팩토링 전후 모든 기존 테스트가 통과해야 하며, 실패 시 원인을 파악하여 수정한다.
- 공통 서비스/컴포넌트 추출 시 기존 import 경로가 변경되면? → 모든 참조를 업데이트하고, 린트/컴파일로 누락을 검출한다.
- DTO 검증 강화 시 기존 클라이언트 요청이 거부될 수 있는가? → 기존 정상 사용 패턴에 영향을 주지 않는 범위 내에서 검증을 추가한다.
- 매퍼 통합 시 usecase별 미세한 응답 차이가 있다면? → 통합 전 각 usecase의 응답 형식을 비교하여 차이점을 확인하고, 필요 시 매퍼에 옵션을 둔다.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 시스템은 사용자 검증 로직을 단일 서비스로 통합하여 13개 usecase에서 재사용해야 한다.
- **FR-002**: 시스템은 Todo 소유권 검증 로직을 단일 서비스로 통합하여 6개 usecase에서 재사용해야 한다.
- **FR-003**: 시스템은 TodoItem DTO 매핑을 단일 매퍼로 통합하여 4개 usecase에서 일관된 응답을 반환해야 한다.
- **FR-004**: 시스템은 날짜 계산 로직을 단일 유틸리티로 통합하여 2개 usecase에서 재사용해야 한다.
- **FR-005**: SettingsScreen(767줄)은 각 100~150줄 이하의 독립 컴포넌트로 분리되어야 한다.
- **FR-006**: TodoItem 컴포넌트에 메모이제이션 및 콜백 최적화가 적용되어야 한다.
- **FR-007**: 체크박스, 에러 배너, 로딩 인디케이터가 공통 컴포넌트로 추출되어야 한다.
- **FR-008**: memos: any[]와 data: any가 구체 타입으로 교체되어야 한다.
- **FR-009**: DTO에 누락된 검증(@MaxLength, @ArrayMaxSize)이 추가되어야 한다.
- **FR-010**: 에러 코드가 상수 객체로 통합되어 일관되게 사용되어야 한다.
- **FR-011**: 보안 민감 코드(OAuth state, 토큰 해싱, refresh rotation 등)에 WHY 주석이 추가되어야 한다.
- **FR-012**: 모든 컨트롤러 공개 메서드(21개)에 JSDoc이 추가되어야 한다.
- **FR-013**: 비즈니스 로직, 설정값 근거, 타입 단언에 WHY 주석이 추가되어야 한다.
- **FR-014**: 타이머/인터벌 관리, 낙관적 업데이트 패턴이 커스텀 훅으로 추출되어야 한다.
- **FR-015**: Zustand 스토어에 세분화된 셀렉터가 도입되어야 한다.
- **FR-016**: 중복 타입 정의(CarriedOverResult, Stats)가 단일 위치로 통합되어야 한다.
- **FR-017**: get-todos.usecase의 다중 순회(filter 3회)가 단일 순회(reduce)로 최적화되어야 한다.
- **FR-018**: 리팩토링 전후 모든 기존 테스트(백엔드 40+, 프론트엔드 60+, E2E 25)가 통과해야 한다.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 백엔드 중복 코드가 19곳에서 0곳으로 감소한다 (사용자 검증 13 + 소유권 검증 6).
- **SC-002**: DTO 매핑 중복이 4곳에서 1곳(매퍼)으로 통합된다.
- **SC-003**: SettingsScreen이 767줄에서 각 150줄 이하의 컴포넌트로 분리된다.
- **SC-004**: any 타입 사용이 2곳에서 0곳으로 제거된다.
- **SC-005**: 보안 민감 코드 WHY 주석이 6곳에 추가되고, 공개 API JSDoc이 21개 메서드에 추가된다.
- **SC-006**: 리팩토링 전후 모든 기존 테스트가 100% 통과한다.
- **SC-007**: 공통 컴포넌트 추출로 UI 코드 중복이 13곳(체크박스 3 + 에러배너 5 + 로딩 5)에서 각 1곳으로 감소한다.
- **SC-008**: DTO 검증 누락이 3곳(refine-text MaxLength, batch-create ArrayMaxSize, OAuth Query 파라미터)에서 0곳으로 해소된다.

## Assumptions

- 기존 테스트 스위트(백엔드 단위 40, 통합 6, 프론트엔드 60+, E2E 25)가 충분한 커버리지를 제공하여 리팩토링 안전성을 검증할 수 있다.
- 리팩토링은 외부 동작을 변경하지 않으며, API 스키마/응답 형식/DB 스키마에 영향을 주지 않는다.
- 리팩토링 보고서에 명시된 항목만 범위에 포함하며, 추가 기능 개발은 포함하지 않는다.
- 프론트엔드 공통 컴포넌트 추출 시 기존 디자인 토큰(theme, StyleSheet)을 그대로 사용한다.
- 긴 메서드 분해(30줄 초과, 5개 파일)는 이번 범위에 포함하되, 복잡도가 높은 경우 별도 단계로 분리할 수 있다.
