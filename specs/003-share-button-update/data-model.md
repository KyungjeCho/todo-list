# Data Model: 공유 버튼 기능 변경

**Feature**: 003-share-button-update | **Date**: 2026-04-03

## 개요

이 기능은 순수 프론트엔드 UI 변경으로, 데이터 모델(DB 스키마, API 계약)에 대한 변경은 없다.
기존 엔티티와 타입을 그대로 재사용한다.

## 재사용 엔티티

### Todo (변경 없음)

```typescript
// frontend/src/types/todo.ts — 기존 그대로
interface Todo {
  id: string;
  todoDate: string;
  content: string;
  status: TodoStatus;
  isCarriedOver: boolean;
  memos: Memo[];
  createdAt: string;
  updatedAt: string;
}

type TodoStatus = 'COMPLETED' | 'ACTIVE' | 'INACTIVE' | 'CARRIED_OVER';
```

## 상태 모델 (State)

### UseShareTodoReturn (변경)

```typescript
// 변경 전
interface UseShareTodoReturn {
  shareTodos: (todos: Todo[], date: string) => Promise<void>;
  shareToSelf: (todos: Todo[], date: string) => Promise<void>;  // 제거
  isSharing: boolean;
  copied: boolean;
  error: string | null;
}

// 변경 후
interface UseShareTodoReturn {
  shareTodos: (todos: Todo[], date: string) => Promise<void>;
  copyToClipboard: (todos: Todo[], date: string) => Promise<void>;  // 리네이밍
  isSharing: boolean;
  copied: boolean;
  error: string | null;
}
```

### ShareButton 컴포넌트 상태 (변경)

| 상태 | 타입 | 변경 | 설명 |
|------|------|------|------|
| `menuVisible` | `boolean` | 유지 | 팝업 표시 여부 |
| `copied` | `boolean` | 유지 (훅에서) | 복사 성공 토스트 표시 트리거 |
| `error` | `string \| null` | 유지 (훅에서) | 오류 토스트 표시 트리거 |
| `isSharing` | `boolean` | 유지 (훅에서) | 로딩 상태 |

## UI 상태 전이

```text
[Idle] --tap share button--> [Menu Open]
  [Menu Open] --tap "공유하기"--> [Native Share Sheet] --> [Idle]
  [Menu Open] --tap "클립보드 복사"--> [Copying] --> [Toast Visible] --2s--> [Idle]
  [Menu Open] --tap "클립보드 복사"--> [Copying] --> [Error Toast Visible] --2s--> [Idle]
  [Menu Open] --tap outside--> [Idle]
```

## 변경 없는 항목

- `formatShareData()`: 클립보드 복사 데이터 포맷 동일
- `formatShareTitle()`: 공유 제목 포맷 동일
- Backend API: 변경 없음
- Database 스키마: 변경 없음
