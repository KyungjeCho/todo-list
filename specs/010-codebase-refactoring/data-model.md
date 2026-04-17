# Data Model: Codebase Refactoring

**Date**: 2026-04-17  
**Feature**: 010-codebase-refactoring

> 이번 리팩토링은 **DB 스키마 변경 없음**. 코드 구조만 변경.

## 신규 서비스/클래스 (백엔드)

### UserValidationService

- **역할**: 사용자 인증 ID로 사용자 엔티티 조회 및 존재 검증
- **메서드**: `ensureUserExists(userAuthId: string): Promise<User>`
- **관계**: 13개 usecase에서 의존
- **위치**: `backend/src/common/services/` 또는 `backend/src/user/application/services/`

### TodoAuthorizationService

- **역할**: Todo 존재 확인 + 소유권(userId) 검증
- **메서드**: `validateOwnership(todoId: string, userId: string): Promise<Todo>`
- **관계**: 6개 usecase에서 의존
- **위치**: `backend/src/todo/application/services/`

### TodoItemMapper

- **역할**: Todo 엔티티 + Memo 관계 → TodoItemDto 변환
- **메서드**: `toDto(todo: Todo): TodoItemDto`
- **관계**: 4개 usecase에서 사용
- **위치**: `backend/src/todo/application/mappers/`

### DateHelper

- **역할**: 날짜 계산 유틸리티 (getNextDate 등)
- **메서드**: `getNextDate(dateStr: string): string`
- **관계**: carryover-scheduler, complete-day에서 사용
- **위치**: `backend/src/common/utils/`

### ERROR_CODES

- **역할**: 에러 코드 상수 객체
- **위치**: `backend/src/common/constants/error-codes.ts`

## 신규 컴포넌트 (프론트엔드)

### 공통 UI 컴포넌트

| 컴포넌트 | 역할 | 추출 위치 |
|----------|------|----------|
| Checkbox | 체크박스 렌더링 (22x22, ✓) | `frontend/src/components/common/` |
| ErrorBanner | 에러 메시지 + 재시도 버튼 | `frontend/src/components/common/` |
| LoadingSpinner | 로딩 인디케이터 | `frontend/src/components/common/` |

### SettingsScreen 분리 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| SettingsIcons | 9개 인라인 아이콘 통합 |
| NotificationSettings | 알림 섹션 |
| LanguagePicker | 언어 선택 섹션 |
| TimePicker | 시간 선택 섹션 |
| AccountSettings | 계정/로그아웃 섹션 |

### 커스텀 훅

| 훅 | 역할 | 추출 위치 |
|----|------|----------|
| useTimer | setTimeout/setInterval 관리 | `frontend/src/features/common/` |
| useOptimisticUpdate | 낙관적 업데이트 패턴 | `frontend/src/features/settings/` |

### 타입 통합

| 타입 | 현재 위치 | 통합 위치 |
|------|----------|----------|
| Stats | MainScreen + ReviewModeView | `frontend/src/types/todo.ts` |

## 기존 엔티티 변경 없음

- Todo, User, Memo, Session, NotificationLog 등 모든 엔티티 구조 유지
- API 응답 형식 유지 (내부 매핑만 통합)
