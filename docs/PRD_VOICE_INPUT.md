> **문서 버전:** v1.0
**작성일:** 2026-04-04
**상태:** Draft
**피처 브랜치:** feature/004-voice-input-screen

---

## 1. 목표

### 1.1 배경

현재 음성 할 일 등록 기능은 마이크 FAB 버튼으로 단일 할 일을 하나씩 생성하는 방식이다. 녹음 완료 후 오디오 파일 전체를 서버에 업로드하여 Gemini Flash가 STT + LLM 정리를 동시에 수행한다.

이 방식에는 다음과 같은 한계가 있다:

- **1회 녹음 = 1개 할 일** — 여러 할 일을 등록하려면 녹음을 반복해야 한다.
- **실시간 피드백 없음** — 녹음이 끝나야 결과를 확인할 수 있다.
- **오디오 업로드 비용** — 매번 오디오 파일을 서버에 전송하므로 네트워크 비용과 레이턴시가 크다.
- **원본 전사 텍스트 미보존** — 모델이 "정리"하면서 사용자가 실제로 말한 내용을 확인할 수 없다.

### 1.2 목표

- 전용 음성 입력 화면에서 **연속 발화로 여러 할 일을 한 번에 등록**할 수 있도록 한다.
- 디바이스 내장 STT(expo-speech-recognition)로 **실시간 전사 텍스트를 표시**하여 즉각적인 피드백을 제공한다.
- 문장 단위로 서버에 **텍스트만 전송**하여 LLM이 정리하고, 사용자가 확인 후 일괄 생성한다.
- **오디오 파일 업로드를 제거**하여 네트워크 비용과 레이턴시를 줄인다.

### 1.3 기존 기능과의 관계

| 항목 | 기존 (마이크 FAB) | 신규 (음성 입력 화면) |
| --- | --- | --- |
| 진입점 | MainScreen 마이크 FAB | MainScreen 마이크 FAB → 화면 이동 |
| STT | Gemini Flash (서버, 오디오 업로드) | 디바이스 내장 STT (expo-speech-recognition) |
| LLM | Gemini Flash (STT + 정리 통합) | Gemini Flash (텍스트 정리만) |
| 할 일 생성 | 1회 녹음 = 1개 즉시 생성 | 연속 녹음 → 임시 목록 → 일괄 생성 |
| 실시간 피드백 | 없음 | 실시간 전사 텍스트 표시 |

기존 `POST /todos/voice` 엔드포인트는 삭제하지 않고 코드에 남겨두되, 로직을 주석 처리하고 호출 시 `410 Gone` 에러를 반환한다. 에러 메시지와 주석에 deprecated 사유("디바이스 내장 STT + POST /todos/refine 으로 대체됨")를 명시한다. 마이크 FAB의 동작을 음성 입력 화면으로의 네비게이션으로 변경한다.

---

## 2. 사용자 스토리

### US-V01: 음성으로 여러 할 일 연속 등록

> **사용자로서 나는** 한 번의 녹음 세션에서 여러 할 일을 연속으로 말하여 등록할 수 있기를 **원한다. 그래서** 할 일을 하나씩 입력하는 번거로움 없이 빠르게 계획을 세울 수 있다.

**Acceptance Scenarios:**

**AC V1.1: 음성 입력 화면 진입**

- **Given** 사용자가 Plan 모드의 MainScreen에 있을 때
- **When** 마이크 FAB 버튼을 탭하면
- **Then** 음성 입력 전용 화면으로 이동하고, 자동으로 녹음이 시작된다.
- **And** 마이크 권한이 없는 경우 권한 요청 다이얼로그가 표시된다.

**AC V1.2: 실시간 전사 텍스트 표시**

- **Given** 녹음이 진행 중일 때
- **When** 사용자가 말을 하면
- **Then** 화면 중하단에 실시간으로 전사 텍스트(interim result)가 표시된다.
- **And** 텍스트는 인식이 진행됨에 따라 실시간으로 업데이트된다.

**AC V1.3: 문장 완료 시 임시 할 일 생성**

- **Given** 사용자가 한 문장을 말하고 잠시 멈출 때 (디바이스 STT가 isFinal 판정)
- **When** 확정된 전사 텍스트가 서버로 전송되면
- **Then** 서버가 LLM으로 텍스트를 정리하여 응답한다.
- **And** 정리된 텍스트가 화면 상단 임시 할 일 목록에 카드로 추가된다.
- **And** 서버 응답 대기 중에는 원본 텍스트와 함께 로딩 표시가 나타난다.

**AC V1.4: 임시 할 일 삭제**

- **Given** 임시 할 일 목록에 1개 이상의 항목이 있을 때
- **When** 사용자가 해당 항목의 ✕ 버튼을 탭하면
- **Then** 해당 항목이 확인 없이 즉시 목록에서 제거된다.

**AC V1.5: 녹음 종료 및 일괄 생성**

- **Given** 녹음이 진행 중이고 임시 할 일이 1개 이상 있을 때
- **When** 사용자가 빨간 네모(■) 종료 버튼을 탭하면
- **Then** 녹음이 중단된다.
- **And** 마지막 발화가 있으면 해당 문장의 서버 정리를 기다린다.
- **And** 정리 중(refining)인 항목이 있으면 완료될 때까지 로딩 상태를 표시한다.
- **And** 모든 임시 할 일이 서버에 일괄 생성된다.
- **And** 성공 시 이전 화면(MainScreen)으로 복귀하고 할 일 목록이 갱신된다.

**AC V1.6: 녹음 종료 — 빈 결과**

- **Given** 녹음이 진행 중이고 임시 할 일이 0개일 때
- **When** 사용자가 빨간 네모(■) 종료 버튼을 탭하면
- **Then** 녹음이 중단되고 "인식된 할 일이 없습니다" 토스트가 표시된다.
- **And** 이전 화면으로 복귀한다.

**AC V1.7: 뒤로가기 — 취소**

- **Given** 음성 입력 화면에서 임시 할 일이 1개 이상 있을 때
- **When** 사용자가 ← 뒤로 버튼을 탭하면
- **Then** "입력 중인 할 일 N개가 삭제됩니다" 확인 다이얼로그가 표시된다.
- **And** [삭제]를 탭하면 녹음 중단 후 임시 할 일을 버리고 이전 화면으로 복귀한다.
- **And** [취소]를 탭하면 화면에 그대로 남는다.

**AC V1.8: 뒤로가기 — 빈 상태**

- **Given** 음성 입력 화면에서 임시 할 일이 0개일 때
- **When** 사용자가 ← 뒤로 버튼을 탭하면
- **Then** 확인 없이 녹음 중단 후 즉시 이전 화면으로 복귀한다.

---

## 3. 화면 설계

### 3.1 레이아웃

```
┌─────────────────────────────┐
│  ← 뒤로    음성 할 일 입력     │  헤더
│                             │
│  ┌─────────────────────────┐│
│  │ ☑ 장보기 가야 돼      ✕ ││  임시 Todo 카드 (확정)
│  │ ☑ 보고서 마감 금요일   ✕ ││  임시 Todo 카드 (확정)
│  │ ◻ 팀 미팅 3시 ...     ✕ ││  임시 Todo 카드 (정리 중)
│  │                         ││
│  │                         ││
│  └─────────────────────────┘│  FlatList (스크롤 가능)
│                             │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                             │
│  "팀 미팅 세시에 해야 돼"    │  실시간 전사 텍스트 (중하단)
│                             │
│         ⏺ 녹음 중 0:23      │  녹음 상태 + 경과 시간
│                             │
│           [ ■ ]             │  종료 버튼 (빨간 네모)
│                             │
└─────────────────────────────┘
```

### 3.2 임시 Todo 카드 상태

| 상태 | 표시 | 설명 |
| --- | --- | --- |
| `refining` | 원본 텍스트 + 로딩 스피너 | 서버에서 LLM 정리 중 |
| `ready` | 정리된 텍스트 + ☑ 아이콘 | 정리 완료, 생성 대기 |
| `error` | 원본 텍스트 + "정리 실패" 라벨 | LLM 실패, 원본 텍스트로 대체 |

### 3.3 실시간 전사 영역

- 녹음 중: 현재 인식 중인 interim 텍스트를 표시 (회색, 이탤릭)
- 문장 확정 시: 전사 영역 초기화 → 임시 카드로 이동
- 말 없을 때: "말씀하세요..." 플레이스홀더

---

## 4. 기술 요구사항

### 4.1 프론트엔드

| 항목 | 상세 |
| --- | --- |
| **새 의존성** | `expo-speech-recognition` |
| **네비게이션** | RootNavigator에 `VoiceInput` 화면 추가 (Native Stack) |
| **파라미터** | `{ todoDate: string }` — 생성할 할 일의 날짜 |
| **STT 설정** | `lang: "ko-KR"`, `continuous: true`, `interimResults: true` |
| **상태 관리** | 로컬 useState (Zustand 불필요 — 화면 내 임시 상태) |

### 4.2 백엔드 — 새 엔드포인트

**POST /todos/voice (Deprecated)**

기존 오디오 업로드 방식의 음성 할 일 생성 엔드포인트. 엔드포인트를 삭제하지 않고 코드에 보존하되, 기존 로직을 주석 처리하고 무조건 `410 Gone`을 반환한다.

```
Response (항상):
HTTP 410 Gone
{
  "statusCode": 410,
  "message": "이 엔드포인트는 더 이상 사용되지 않습니다. 디바이스 내장 STT + POST /todos/refine 조합으로 대체되었습니다.",
  "error": "Gone"
}
```

컨트롤러 코드에 다음 주석을 남긴다:
- deprecated 사유: 오디오 업로드 방식에서 디바이스 내장 STT(expo-speech-recognition) + 텍스트 정리(POST /todos/refine) 방식으로 전환
- 대체 엔드포인트: POST /todos/refine, POST /todos/batch
- 삭제하지 않는 이유: 구버전 클라이언트 호출 시 명확한 에러 메시지 제공

---

**POST /todos/refine**

텍스트를 LLM으로 정리만 하고 할 일을 생성하지 않는다.

```
Request:
{
  "text": "장보기 가야 돼 내일까지"
}

Response:
{
  "refinedText": "내일까지 장보기"
}
```

- 인증 필수 (Bearer token)
- Rate limit: 1 req/sec, 30 req/min
- text 길이 제한: 1-500자

**POST /todos/batch**

여러 할 일을 일괄 생성한다.

```
Request:
{
  "todos": [
    { "content": "내일까지 장보기", "todoDate": "2026-04-04" },
    { "content": "보고서 마감 금요일", "todoDate": "2026-04-04" },
    { "content": "팀 미팅 3시", "todoDate": "2026-04-04" }
  ]
}

Response:
{
  "created": [
    { "id": "uuid-1", "content": "내일까지 장보기", "todoDate": "2026-04-04", ... },
    { "id": "uuid-2", "content": "보고서 마감 금요일", "todoDate": "2026-04-04", ... },
    { "id": "uuid-3", "content": "팀 미팅 3시", "todoDate": "2026-04-04", ... }
  ]
}
```

- 인증 필수 (Bearer token)
- 최대 20개 (한 세션에서 합리적인 상한)
- 개별 content 길이 제한: 1-255자
- 트랜잭션으로 처리 (전체 성공 또는 전체 실패)

### 4.3 GeminiService 변경

기존 `transcribeAndRefine(audioBuffer, mimeType)` 외에 텍스트 정리 전용 메서드 추가:

```typescript
async refineText(rawText: string): Promise<string>
```

- 프롬프트: "다음 문장을 간결한 한국어 할 일(todo) 형태로 정리해줘. 부연 설명 없이 할 일 내용만 반환해."
- 오디오 처리 없음 → 토큰 소비 최소화
- 동일한 retry/rate-limit 정책 적용

---

## 5. 에러 처리

| 시나리오 | 동작 |
| --- | --- |
| 마이크 권한 거부 | "마이크 권한이 필요합니다" 토스트 → 이전 화면 복귀 |
| STT 인식 실패 | 해당 발화 무시, 다음 발화 계속 수신 |
| 텍스트 정리 실패 (LLM) | 원본 텍스트를 그대로 사용 (`error` 상태 카드) |
| 일괄 생성 실패 (서버) | "할 일 생성에 실패했습니다" 에러 토스트 → 화면 유지 (재시도 가능) |
| 네트워크 오프라인 | "네트워크 연결을 확인해주세요" 토스트 → 녹음 중단, 화면 유지 |

---

## 6. 범위 외 (Out of Scope)

- 음성 명령으로 임시 할 일 수정/삭제 ("그거 삭제해줘")
- 날짜/우선순위/프로젝트 자동 추출 (Todoist Ramble 수준의 메타데이터 파싱)
- 다국어 지원 (현재 한국어 전용)
- 오프라인 모드 (LLM 정리가 서버 의존)
- 기존 `POST /todos/voice` 엔드포인트 완전 제거 (코드에 deprecated 상태로 보존)

---

## 7. 성공 지표

| 지표 | 목표 | 측정 방법 |
| --- | --- | --- |
| 문장당 LLM 정리 레이턴시 | ≤ 2초 (p95) | 서버 로그 |
| 세션당 평균 생성 할 일 수 | ≥ 3개 | 클라이언트 이벤트 로깅 |
| 세션 완료율 (종료 버튼 / 뒤로 취소) | ≥ 70% | 클라이언트 이벤트 로깅 |

---

## 8. 의존성 및 리스크

| 리스크 | 영향 | 완화 방안 |
| --- | --- | --- |
| expo-speech-recognition iOS 60초 제한 | 긴 세션 시 인식 중단 | 자동 재시작 로직 구현 |
| Android 기기별 STT 품질 편차 | 일부 기기에서 인식률 저하 | 최소 지원 기기 목록 정의, error 상태 시 원본 텍스트 폴백 |
| Gemini Flash 장애 | 텍스트 정리 불가 | 원본 텍스트 그대로 사용하는 graceful degradation |
| 소음 환경에서 오인식 | 의도하지 않은 임시 할 일 생성 | ✕ 버튼으로 쉽게 삭제 가능 |

---

## 9. 구현 범위

### 프론트엔드 변경

| 유형 | 파일 | 내용 |
| --- | --- | --- |
| 새로 생성 | `screens/voice/VoiceInputScreen.tsx` | 전용 화면 컨테이너 |
| 새로 생성 | `features/voice/useSpeechRecognition.ts` | expo-speech-recognition 래퍼 훅 |
| 새로 생성 | `features/voice/useVoiceTodoSession.ts` | 임시 todo 상태 관리 훅 |
| 새로 생성 | `components/voice/DraftTodoList.tsx` | 임시 todo FlatList |
| 새로 생성 | `components/voice/DraftTodoItem.tsx` | 개별 임시 todo 카드 |
| 새로 생성 | `components/voice/LiveTranscript.tsx` | 실시간 전사 텍스트 |
| 새로 생성 | `components/voice/VoiceControls.tsx` | 녹음 상태 + 종료 버튼 |
| 수정 | `app/navigation/RootNavigator.tsx` | VoiceInput 화면 등록 |
| 수정 | `app/navigation/types.ts` | VoiceInput 파라미터 타입 추가 |
| 수정 | `services/api/todoApi.ts` | refineText, batchCreateTodos 메서드 추가 |
| 수정 | `components/todo/VoiceTodoButton.tsx` | 녹음 로직 제거 → 네비게이션으로 변경 |

### 백엔드 변경

| 유형 | 파일 | 내용 |
| --- | --- | --- |
| 새로 생성 | `todo/application/refine-text.usecase.ts` | 텍스트 정리 유스케이스 |
| 새로 생성 | `todo/application/batch-create-todo.usecase.ts` | 일괄 생성 유스케이스 |
| 수정 | `todo/todo.controller.ts` | POST /todos/refine, POST /todos/batch 추가 + POST /todos/voice deprecated 처리 (410 Gone) |
| 수정 | `ai/infrastructure/gemini.service.ts` | refineText 메서드 추가 |

### 새 의존성

| 패키지 | 위치 | 용도 |
| --- | --- | --- |
| `expo-speech-recognition` | 프론트엔드 | 디바이스 내장 STT |
