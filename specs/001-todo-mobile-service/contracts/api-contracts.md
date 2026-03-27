# API Contracts: Todo Mobile Service

**Branch**: `001-todo-mobile-service` | **Date**: 2026-03-26
**Source**: `specify/API_SPEC.md`

## 공통 사항

- **Base URL**: `https://api.todolist.com/v1`
- **인증**: Bearer Token (JWT) — `Authorization: Bearer {access_token}`
- **Content-Type**: `application/json` (음성 API 제외)

### 공통 에러 응답

```typescript
interface ErrorResponse {
  statusCode: number;       // HTTP 상태 코드
  code: string;             // 에러 코드 (e.g., "UNAUTHORIZED")
  message: string;          // 에러 메시지
  timestamp: string;        // ISO 8601 (e.g., "2026-03-25T09:00:00.000Z")
}
```

### 페이지네이션 (필요 시)

```typescript
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}
```

---

## 1. Auth

### 1.1 GET `/auth/oauth/{provider}`
OAuth 로그인 요청. 302 redirect.

| Param | Type | In | Required | Description |
|-------|------|----|----------|-------------|
| provider | string | path | Y | google / naver / kakao / apple |
| fcmToken | string | query | Y | FCM 디바이스 토큰 |
| deviceType | string | query | Y | IOS / ANDROID |
| deviceName | string | query | N | 디바이스 이름 |

**Response**: 302 → provider OAuth 인증 페이지

### 1.2 GET `/auth/oauth/{provider}/callback`
OAuth 콜백. 302 → 앱 딥링크.

**Response 302**:
```
todolist://auth/callback?accessToken={jwt}&refreshToken={jwt}&isNewUser={boolean}
```

### 1.3 POST `/auth/token/refresh`

```typescript
// Request
interface TokenRefreshRequest {
  refreshToken: string;
}

// Response 200
interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
}
```

### 1.4 POST `/auth/logout`

```typescript
// Request
interface LogoutRequest {
  refreshToken: string;
  fcmToken: string;
}

// Response 200
interface LogoutResponse {
  message: string;  // "Successfully logged out"
}
```

---

## 2. User

### 2.1 GET `/users/me`

```typescript
// Response 200
interface UserProfile {
  id: string;               // UUID
  userName: string;
  planTime: string | null;  // "HH:mm" or null
  reviewTime: string | null;
  timezone: string;         // IANA timezone
  language: string;         // BCP-47
}
```

### 2.2 PATCH `/users/me/settings`

```typescript
// Request (모든 필드 optional)
interface UpdateSettingsRequest {
  userName?: string;              // max 100자
  planTime?: string | null;       // "HH:mm" or null
  reviewTime?: string | null;
  timezone?: string;
  language?: string;
}

// Response 200: UserProfile
```

---

## 3. Todo

### 3.1 GET `/todos?date={date}`

```typescript
// Response 200
interface TodoListResponse {
  date: string;             // "YYYY-MM-DD"
  mode: "PLAN" | "REVIEW";
  stats: {
    total: number;
    completed: number;
    active: number;
    inactive: number;
    progressRate: number;   // 0.0 ~ 100.0
  };
  todos: TodoItem[];
}

interface TodoItem {
  id: string;
  content: string;
  status: "ACTIVE" | "INACTIVE" | "COMPLETED" | "CARRIED_OVER";
  isCarriedOver: boolean;
  todoDate: string;
  memos: MemoItem[];
  createdAt: string;
  updatedAt: string;
}

interface MemoItem {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 POST `/todos`

```typescript
// Request
interface CreateTodoRequest {
  content: string;          // 1~255자
  todoDate?: string;        // "YYYY-MM-DD", 기본 오늘
}

// Response 201: TodoItem
```

### 3.3 POST `/todos/voice`
**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| audio | file | Y | wav, m4a, mp3 |
| todoDate | string | N | "YYYY-MM-DD", 기본 오늘 |

```typescript
// Response 201
interface VoiceTodoResponse extends TodoItem {
  rawText: string;          // STT 원본 텍스트
}
```

### 3.4 PATCH `/todos/{todoId}`

```typescript
// Request
interface UpdateTodoRequest {
  content?: string;         // max 255자
}

// Response 200: TodoItem
```

### 3.5 PATCH `/todos/{todoId}/status`

```typescript
// Request
interface UpdateTodoStatusRequest {
  status: "ACTIVE" | "INACTIVE" | "COMPLETED";
  // CARRIED_OVER는 사용자가 직접 설정 불가
}

// Response 200: TodoItem
```

### 3.6 DELETE `/todos/{todoId}`

```typescript
// Response 200
interface DeleteTodoResponse {
  id: string;
  deletedAt: string;
}
```

---

## 4. Memo

### 4.1 POST `/todos/{todoId}/memos`

```typescript
// Request
interface CreateMemoRequest {
  content: string;
}

// Response 201
interface MemoResponse {
  id: string;
  todoId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 PATCH `/todos/{todoId}/memos/{memoId}`

```typescript
// Request
interface UpdateMemoRequest {
  content: string;
}

// Response 200: MemoResponse
```

### 4.3 DELETE `/todos/{todoId}/memos/{memoId}`

```typescript
// Response 200
interface DeleteMemoResponse {
  id: string;
  deletedAt: string;
}
```

---

## 5. Todo 완료 및 리포트

### 5.1 POST `/todos/complete`

```typescript
// Request
interface CompleteDayRequest {
  date: string;             // "YYYY-MM-DD"
}

// Response 200
interface CompleteDayResponse {
  date: string;
  stats: {
    total: number;
    completed: number;
    active: number;
    inactive: number;
    progressRate: number;
  };
  carriedOverCount: number;
  carriedOverTodos: Array<{
    fromTodoId: string;
    toTodoId: string;
    content: string;
  }>;
}
```

### 5.2 GET `/todos/report/summary?year={year}&month={month}`

```typescript
// Response 200
interface MonthlySummaryResponse {
  year: number;
  month: number;
  days: Array<{
    date: string;           // "YYYY-MM-DD"
    totalCount: number;
    completedCount: number;
    activeCount: number;
  }>;
}
```

---

## 에러 코드 목록

| Code | HTTP | 설명 |
|------|------|------|
| BAD_REQUEST | 400 | 요청 파라미터 유효성 검증 실패 |
| UNAUTHORIZED | 401 | 인증 토큰 누락/만료 |
| FORBIDDEN | 403 | 타인 리소스 접근 |
| NOT_FOUND | 404 | 리소스 없음 |
| INVALID_PROVIDER | 400 | 지원하지 않는 OAuth provider |
| AUTHENTICATION_FAILED | 401 | 인증 실패 |
| EMAIL_REQUIRED | 400 | provider 이메일 미제공 |
| INVALID_TIME_FORMAT | 400 | 시간 형식 오류 |
| INVALID_TIMEZONE | 400 | 유효하지 않은 타임존 |
| CONTENT_REQUIRED | 400 | content 누락/빈 문자열 |
| CONTENT_TOO_LONG | 400 | content 255자 초과 |
| INVALID_AUDIO_FORMAT | 400 | 지원하지 않는 오디오 형식 |
| STT_API_ERROR | 500 | STT API 호출 실패 |
| LLM_API_ERROR | 500 | LLM API 호출 실패 |
| INVALID_STATUS | 400 | 유효하지 않은 상태값 |
| INVALID_STATUS_TRANSITION | 400 | 허용되지 않는 상태 전이 |
| TODO_NOT_FOUND | 404 | 할 일 없음 |
| MEMO_NOT_FOUND | 404 | 메모 없음 |
| FUTURE_DATE | 400 | 미래 날짜 완료 시도 |
| ALREADY_COMPLETED | 409 | 이미 완료된 날짜 |
