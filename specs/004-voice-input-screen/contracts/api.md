# API Contracts: 음성 입력 화면

**Created**: 2026-04-04
**Base URL**: `/todos`
**Authentication**: Bearer token (JWT) — 모든 엔드포인트 필수

---

## 1. POST /todos/voice (Deprecated)

기존 오디오 업로드 방식. 무조건 410 Gone 반환.

### Request

해당 없음 (어떤 요청이든 410 반환)

### Response

**Status**: `410 Gone`

```json
{
  "statusCode": 410,
  "code": "ENDPOINT_DEPRECATED",
  "message": "이 엔드포인트는 더 이상 사용되지 않습니다. 디바이스 내장 STT + POST /todos/refine 조합으로 대체되었습니다."
}
```

---

## 2. POST /todos/refine

전사 텍스트를 LLM으로 간결한 할 일 형태로 정리한다. DB 저장 없음.

### Rate Limit

- 1 req/sec (short burst)
- 30 req/min (sustained)

### Request

**Content-Type**: `application/json`

```json
{
  "text": "장보기 가야 돼 내일까지"
}
```

| 필드 | 타입 | 필수 | 검증 |
|------|------|------|------|
| text | string | Y | 1-500자 |

### Response

**Status**: `200 OK`

```json
{
  "refinedText": "내일까지 장보기"
}
```

### Error Responses

| Status | Code | 조건 |
|--------|------|------|
| 400 | BAD_REQUEST | text 누락 또는 길이 초과 |
| 401 | UNAUTHORIZED | 인증 실패 |
| 429 | VOICE_AI_RATE_LIMIT | Gemini API rate limit 초과 (3회 retry 후) |
| 500 | VOICE_AI_API_ERROR | Gemini API 장애 |

---

## 3. POST /todos/batch

여러 할 일을 트랜잭션으로 일괄 생성한다.

### Request

**Content-Type**: `application/json`

```json
{
  "todos": [
    { "content": "내일까지 장보기", "todoDate": "2026-04-04" },
    { "content": "보고서 마감 금요일", "todoDate": "2026-04-04" },
    { "content": "팀 미팅 3시", "todoDate": "2026-04-04" }
  ]
}
```

| 필드 | 타입 | 필수 | 검증 |
|------|------|------|------|
| todos | array | Y | 1-20개 |
| todos[].content | string | Y | 1-255자 |
| todos[].todoDate | string | Y | YYYY-MM-DD 형식 |

### Response

**Status**: `201 Created`

```json
{
  "created": [
    {
      "id": "uuid-1",
      "content": "내일까지 장보기",
      "todoDate": "2026-04-04",
      "status": "ACTIVE",
      "isCarriedOver": false,
      "memos": [],
      "createdAt": "2026-04-04T10:00:00.000Z",
      "updatedAt": "2026-04-04T10:00:00.000Z"
    }
  ]
}
```

### Error Responses

| Status | Code | 조건 |
|--------|------|------|
| 400 | BAD_REQUEST | todos 빈 배열, 20개 초과, content/todoDate 검증 실패 |
| 401 | UNAUTHORIZED | 인증 실패 |
| 500 | INTERNAL_SERVER_ERROR | 트랜잭션 실패 (전체 롤백) |

---

## 4. 프론트엔드 API 클라이언트 계약

`todoApi` 객체에 추가되는 메서드:

```typescript
interface RefineTextRequest {
  text: string;
}

interface RefineTextResponse {
  refinedText: string;
}

interface BatchCreateTodosRequest {
  todos: { content: string; todoDate: string }[];
}

interface BatchCreateTodosResponse {
  created: Todo[];
}

// todoApi에 추가
refineText(request: RefineTextRequest): Promise<RefineTextResponse>
batchCreateTodos(request: BatchCreateTodosRequest): Promise<BatchCreateTodosResponse>
```
