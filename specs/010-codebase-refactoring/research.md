# Research: Codebase Refactoring

**Date**: 2026-04-17  
**Feature**: 010-codebase-refactoring

## 1. 백엔드 중복 코드 현황 확인

### Decision: REFACTORING_REPORT.md 대비 실제 코드 확인 완료

**사용자 검증 중복 (확인됨)**:
- 동일 패턴 13곳 이상: `findByUserAuthId` → `NotFoundException('USER_NOT_FOUND')`
- 파일: create-todo, change-todo-status, delete-todo, create-memo, update-memo, delete-memo, update-todo, get-todos, get-monthly-summary, batch-create-todo, refine-text, update-settings, complete-onboarding, complete-day

**Todo 소유권 검증 중복 (확인됨)**:
- 동일 패턴 6곳: `todo.userId !== user.id` → `ForbiddenException('FORBIDDEN')`
- 파일: change-todo-status, delete-todo, update-todo, create-memo, update-memo, delete-memo

**TodoItemDto 매핑 중복 (확인됨)**:
- 인라인 타입 캐스트 + memos 변환 + todo→DTO 패턴이 create-todo, change-todo-status, update-todo, get-todos에 반복

**날짜 계산 중복 (확인됨)**:
- `getNextDate()` 함수가 `carryover-scheduler.usecase.ts:108-112`와 `complete-day.usecase.ts:126-130`에 동일하게 존재

### Rationale
코드 탐색으로 보고서의 중복 항목이 모두 실재함을 확인. 통합 대상이 명확하다.

---

## 2. DTO 검증 누락 현황 (보고서 대비 변경 사항)

### Decision: 일부 항목은 feature/009에서 이미 수정됨

- **refine-text.dto.ts**: `@MaxLength(500)` 이미 적용됨 ✓
- **batch-create-todos.dto.ts**: `@ArrayMaxSize(20)` 이미 적용됨 ✓
- **OAuth @Query() 파라미터**: 미검증 상태 유지 (확인 필요)

### Rationale
009 브랜치에서 DTO 검증 강화가 진행되어 일부 항목이 해결됨. OAuth Query 파라미터 검증만 잔여.

### Alternatives Considered
- 전체 DTO 검증 재점검 → 불필요 (이미 수정된 항목 존재)
- OAuth 파라미터만 집중 → 채택

---

## 3. `any` 타입 현황

### Decision: DTO/Entity 파일에는 `any` 없음, 인라인 캐스트만 잔존

- `todo-response.dto.ts` — `any` 없음 (이미 수정됨)
- `notification-log.entity.ts` — `any` 없음 (이미 수정됨)
- 인라인 타입 캐스트: usecase 내 `todo.memos as { ... }[]` 패턴이 4곳에 존재 → TodoItemMapper 추출 시 해결

### Rationale
보고서 작성 시점 대비 009에서 일부 수정됨. 인라인 캐스트는 매퍼 추출로 자연스럽게 해소.

---

## 4. 에러 코드 비일관성

### Decision: 3가지 패턴 확인, ERROR_CODES 상수로 통합 필요

- `USER_NOT_FOUND`: 16곳 (대부분의 usecase)
- `NOT_FOUND`: 3곳 (get-profile, complete-onboarding, update-settings)
- `USER_NOT_FOUND_FOR_OAUTH`: 1곳 (oauth-callback, InternalServerErrorException)

### Rationale
동일 의미의 에러에 다른 코드를 사용하면 클라이언트 에러 처리가 복잡해진다.

---

## 5. 프론트엔드 컴포넌트 분석

### SettingsScreen.tsx (767줄)
- 9개 인라인 아이콘 컴포넌트 (BellIcon, GlobeIcon 등)
- 설정 관리 로직 + 시간 선택기 통합
- **분리 전략**: 아이콘 → 공통 아이콘, 각 설정 섹션 → 독립 컴포넌트

### TodoItem.tsx (304줄)
- React.memo **미적용**
- useCallback 6개 사용 중
- 체크박스 렌더링 중복 (ReviewModeView와 동일 패턴)

### AuthNavigator.tsx (426줄)
- 인증/온보딩/메인/타임존 로직 혼재
- 10+ 상태 변수, 10+ 핸들러
- **분리 전략**: 네비게이션 로직 → 커스텀 훅, 래퍼 → 독립 컴포넌트

---

## 6. Zustand 셀렉터 현황

### Decision: 불일치 패턴 확인

- LoginScreen: `useAuthStore((s) => s.isLoading)` (셀렉터 사용 ✓)
- AuthNavigator 등: `const { isAuthenticated, isLoading, user } = useAuthStore()` (전체 구독 ✗)
- **결론**: 셀렉터 패턴 표준화 필요

---

## 7. 중복 타입 현황

### Decision: Stats만 중복 확인, CarriedOverResult 미발견

- **Stats**: `ReviewModeView.tsx:8-14`와 `MainScreen.tsx:24-30`에 동일 정의
- **CarriedOverResult**: 코드베이스에서 발견되지 않음 (이미 해결되었거나 보고서 오류)

---

## 8. WHY 주석 / JSDoc 현황

### Decision: 보고서 분석 그대로 유효

- 4개 컨트롤러 (todo, auth, user, memo) 공개 메서드에 JSDoc 없음
- app.controller만 JSDoc 존재
- 보안 민감 코드 (OAuth state, 토큰 해싱, refresh rotation) WHY 주석 없음
- 프론트엔드 tokenManager, soundService, CalendarScreen 등에 WHY 주석 부재
