# Research: 공유 버튼 기능 변경

**Feature**: 003-share-button-update | **Date**: 2026-04-03

## 1. 토스트 위치 변경 — 화면 중하단 배치 전략

### Decision
React Native의 `useWindowDimensions` 훅을 사용하여 화면 높이를 동적으로 계산하고,
`position: 'absolute'`와 `top` 값으로 토스트를 화면 높이의 약 65% 지점에 배치한다.
토스트를 `ShareButton` 컴포넌트 내부에서 분리하여 화면 전체 좌표계를 사용하는 방식으로 구현한다.

### Rationale
- `useWindowDimensions`는 React Native 내장 API로 추가 의존성이 불필요하다.
- 화면 회전이나 크기 변경에도 자동으로 반응한다 (reactive).
- 기존 `ShareButton` 컴포넌트의 상대적 위치 기반 토스트(`marginTop: spacing.xs`)를
  절대 위치 기반으로 변경하면 화면 중하단에 정확히 배치할 수 있다.

### Alternatives Considered
1. **Portal 패턴 (react-native-portalize)**: 토스트를 루트 레벨에 렌더링. 
   신규 라이브러리 추가 필요 → 단순성 원칙(VI) 위반. 기각.
2. **전역 토스트 라이브러리 (react-native-toast-message)**: 프로젝트 전역에 토스트 시스템 도입.
   이 기능에만 필요한 변경에 과도한 추상화. 기각.
3. **Dimensions API (정적)**: `Dimensions.get('window')` 사용.
   반응형이 아님 (화면 변경 시 업데이트 안 됨). 기각.

## 2. 메뉴 순서 변경 — "공유하기" → "클립보드 복사"

### Decision
기존 메뉴 순서: "나에게 전송" → "공유하기"  
변경 메뉴 순서: "공유하기" → "클립보드 복사"

`ShareButton.tsx`의 `<Modal>` 내부 메뉴 아이템 순서를 재배치하고,
"나에게 전송" 관련 코드를 제거한 뒤 "클립보드 복사" 문구와 testID를 적용한다.

### Rationale
- spec.md FR-003에 의해 순서가 명시됨.
- "나에게 전송"과 "클립보드 복사"는 동일한 기능(clipboard copy)이므로
  `useShareTodo.shareToSelf`를 그대로 재사용할 수 있다.

### Alternatives Considered
- 별도 리네이밍 없이 `shareToSelf` 함수명 유지: 기능 이름과 코드 식별자 불일치.
  명확성을 위해 `copyToClipboard`로 리네이밍 선택.

## 3. "나에게 전송" 기능 제거 범위

### Decision
- `ShareButton.tsx`: "나에게 전송" 메뉴 아이템 JSX 및 `handleShareToSelf` 핸들러 제거
- `useShareTodo.ts`: `shareToSelf` → `copyToClipboard` 리네이밍 (기능 동일, 명칭만 변경)
- `useShareTodo.test.ts`: 테스트 설명(describe/it) 업데이트
- Maestro E2E: `share-to-self` testID 제거, `copy-to-clipboard` testID 추가

### Rationale
- spec.md FR-001에 의해 "나에게 전송" 버튼 제거 필수.
- 클립보드 복사 로직 자체는 동일하므로 함수 내부 구현은 변경 불필요.
- testID 변경은 E2E 테스트와의 일관성을 위해 필요.

## 4. 기존 동작 유지 확인

### Decision
다음 항목은 변경하지 않는다:
- 공유 버튼 위치, 아이콘, 비활성화 조건 (할 일 없을 때)
- "공유하기" 기능 (네이티브 공유 시트)
- 클립보드 복사 데이터 포맷 (`formatShareData` 함수)
- 토스트 자동 소멸 시간 (2초, `TOAST_DURATION_MS`)
- 빈 할 일 목록 시 "공유할 할 일이 없습니다" Alert

### Rationale
- spec.md FR-008 및 Assumptions에 명시된 기존 동작 유지 원칙.
