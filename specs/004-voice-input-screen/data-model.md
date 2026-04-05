# Data Model: 음성 입력 화면 (Voice Input Screen)

**Created**: 2026-04-04
**Status**: Complete

---

## 1. 기존 엔티티 (변경 없음)

### Todo (서버, DB)

기존 `todo.entity.ts`의 Todo 엔티티를 그대로 사용한다. 스키마 변경 없음.

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK, 자동 생성 |
| userId | UUID | FK → User |
| content | string (1-255자) | 할 일 내용 |
| todoDate | string (YYYY-MM-DD) | 할 일 날짜 |
| status | TodoStatus (enum) | ACTIVE / INACTIVE / COMPLETED / CARRIED_OVER |
| isCarriedOver | boolean | 이월 여부 |
| createdBy | UUID | 생성자 |
| updatedBy | UUID | 수정자 |
| createdAt | timestamp | 생성일시 |
| updatedAt | timestamp | 수정일시 |

---

## 2. 신규 엔티티 (클라이언트 전용)

### DraftTodo (클라이언트 로컬 상태)

음성 입력 세션 중 클라이언트에서만 관리되는 임시 항목. DB에 저장되지 않는다.

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (UUID v4) | 클라이언트에서 생성하는 고유 ID |
| rawText | string | STT 원본 전사 텍스트 |
| refinedText | string \| null | LLM 정리된 텍스트 (null = 정리 중) |
| status | DraftTodoStatus | 현재 상태 |

### DraftTodoStatus (enum)

| 값 | 설명 | UI 표시 |
|----|------|---------|
| `refining` | 서버에서 LLM 정리 중 | 원본 텍스트 + 로딩 스피너 |
| `ready` | 정리 완료, 생성 대기 | 정리된 텍스트 + 체크 아이콘 |
| `error` | LLM 실패, 원본 텍스트로 대체 | 원본 텍스트 + "정리 실패" 라벨 |

### 상태 전이

```
[isFinal 이벤트] → refining → [refine 성공] → ready
                            → [refine 실패] → error (refinedText = rawText)
```

---

## 3. DTO (서버)

### RefineTextDto (POST /todos/refine 요청)

| 필드 | 타입 | 검증 규칙 |
|------|------|----------|
| text | string | 필수, 1-500자 |

### RefineTextResponse (POST /todos/refine 응답)

| 필드 | 타입 | 설명 |
|------|------|------|
| refinedText | string | LLM이 정리한 텍스트 |

### BatchCreateTodoItemDto (POST /todos/batch 요청 항목)

| 필드 | 타입 | 검증 규칙 |
|------|------|----------|
| content | string | 필수, 1-255자 |
| todoDate | string | 필수, YYYY-MM-DD 형식 |

### BatchCreateTodosDto (POST /todos/batch 요청)

| 필드 | 타입 | 검증 규칙 |
|------|------|----------|
| todos | BatchCreateTodoItemDto[] | 필수, 1-20개 |

### BatchCreateTodosResponse (POST /todos/batch 응답)

| 필드 | 타입 | 설명 |
|------|------|------|
| created | Todo[] | 생성된 할 일 배열 |

---

## 4. 관계도

```
VoiceInputScreen (클라이언트)
  │
  ├── DraftTodo[] (로컬 상태, N개)
  │     │
  │     ├── rawText → POST /todos/refine → refinedText
  │     │
  │     └── 종료 시 → POST /todos/batch
  │                     │
  │                     └── Todo[] (서버 DB, 트랜잭션)
  │                           │
  │                           └── userId → User (FK)
  │
  └── todoDate (파라미터) → 모든 생성 Todo의 todoDate
```
