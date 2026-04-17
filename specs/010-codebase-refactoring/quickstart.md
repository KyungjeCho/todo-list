# Quickstart: Codebase Refactoring

**Feature**: 010-codebase-refactoring  
**Date**: 2026-04-17

## 사전 조건

```bash
# 백엔드 의존성 설치 및 테스트 통과 확인
cd backend && npm install && npm test && npm run lint

# 프론트엔드 의존성 설치 및 테스트 통과 확인
cd frontend && npm install && npm test && npm run lint
```

## 리팩토링 순서

### Phase 1: 백엔드 중복 제거 (가장 큰 효과)

1. `UserValidationService` 추출 → 13개 usecase 수정
2. `TodoAuthorizationService` 추출 → 6개 usecase 수정
3. `TodoItemMapper` 추출 → 4개 usecase 수정
4. `DateHelper` 추출 → 2개 usecase 수정
5. 각 단계 후 `npm test` 통과 확인

### Phase 2: 프론트엔드 대형 컴포넌트 분리

1. `SettingsScreen` 분리 (767줄 → 각 100~150줄)
2. `TodoItem`에 `React.memo` 적용
3. 각 단계 후 `npm test` 통과 확인

### Phase 3: 공통 컴포넌트 추출

1. `Checkbox`, `ErrorBanner`, `LoadingSpinner` 추출
2. 기존 사용처 교체
3. 테스트 통과 확인

### Phase 4: 코드 품질 강화

1. 에러 코드 상수 통합 (`ERROR_CODES`)
2. WHY 주석 추가 (보안 민감 코드 6곳 + 비즈니스 로직 6곳)
3. JSDoc 추가 (컨트롤러 공개 메서드 21개)
4. 인라인 타입 캐스트 정리

### Phase 5: 커스텀 훅 및 성능 최적화

1. `useTimer` 훅 추출
2. Zustand 셀렉터 표준화
3. `Stats` 타입 통합
4. `get-todos` reduce 최적화

## 검증 명령

```bash
# 백엔드 전체 검증
cd backend && npm test && npm run lint

# 프론트엔드 전체 검증
cd frontend && npm test && npm run lint
```

## 핵심 원칙

- **외부 동작 변경 금지**: API 응답, DB 스키마 등 외부 계약 유지
- **TDD 준수**: 리팩토링 전후 모든 기존 테스트 통과 필수
- **단계별 커밋**: 각 서비스/컴포넌트 추출 후 독립 커밋
