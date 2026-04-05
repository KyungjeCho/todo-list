> **문서 버전:** v1.0
**작성일:** 2026-04-04
**상태:** Draft
**관련 PRD:** `PRD_VOICE_INPUT.md`
**피처 브랜치:** feature/004-voice-input-screen

---

## 1. 요약

기존 음성 할 일 기능(오디오 파일 업로드 → Gemini STT+LLM 통합 처리)을 **디바이스 내장 STT(expo-speech-recognition) + 서버 LLM 텍스트 정리** 구조로 전환한다. 전용 음성 입력 화면(VoiceInputScreen)에서 연속 발화로 여러 할 일을 임시 생성하고, 녹음 종료 시 서버에 일괄 생성한다.

---

## 2. 배경

현재 구조의 기술적 한계:

- **오디오 업로드 오버헤드**: m4a 파일을 multipart/form-data로 전송 → 네트워크 비용 + 30초 타임아웃
- **1회 1개 제한**: `POST /todos/voice`가 단건 생성만 지원
- **실시간 피드백 불가**: 녹음 완료 후에야 결과 확인
- **원본 전사 미보존**: Gemini가 STT+정리를 통합 처리하여 원본 텍스트 추적 불가

---

## 3. 목표

- 디바이스 내장 STT로 오디오 업로드를 제거하고, 텍스트만 서버에 전송한다.
- 실시간 전사 텍스트를 사용자에게 표시하여 즉각적 피드백을 제공한다.
- 문장 단위 LLM 정리 + 일괄 생성 API로 연속 발화 → 다건 할 일 생성을 지원한다.
- 기존 `POST /todos/voice` 엔드포인트를 deprecated 처리한다 (410 Gone).

---

## 4. 목표가 아닌 것

- **오프라인 STT 지원**: LLM 정리가 서버 의존이므로 네트워크 필수
- **음성 명령 파싱**: "삭제해줘", "수정해줘" 등 음성 제어
- **메타데이터 자동 추출**: 날짜, 우선순위, 프로젝트 자동 할당 (Todoist Ramble 수준)
- **다국어 지원**: 현재 한국어(ko-KR) 전용

---

## 5. 설계

### 5.1 아키텍처 변경

**기존 (AS-IS)**
```
[RN] 오디오 녹음 (expo-audio)
  ↓ multipart/form-data (m4a 파일)
[Server] POST /todos/voice
  ↓ audioBuffer + mimeType
[Gemini Flash] STT + LLM 통합 (오디오 → 정리된 텍스트)
  ↓
[Server] Todo 단건 생성
```

**신규 (TO-BE)**
```
[RN] 실시간 STT (expo-speech-recognition, 디바이스 엔진)
  ↓ isFinal 이벤트 (텍스트)
[Server] POST /todos/refine
  ↓ rawText
[Gemini Flash] LLM 텍스트 정리만 (텍스트 → 정리된 텍스트)
  ↓ refinedText
[RN] 임시 카드로 표시 (클라이언트 로컬 상태)
  ↓ 녹음 종료 시
[Server] POST /todos/batch (일괄 생성)
```

### 5.2 Sequence Diagram

```
사용자          VoiceInputScreen    expo-speech-recognition    Server (refine)    Server (batch)
  │                  │                      │                      │                   │
  │  화면 진입        │                      │                      │                   │
  │─────────────────>│  start()             │                      │                   │
  │                  │─────────────────────>│                      │                   │
  │                  │                      │                      │                   │
  │  "장보기 가야 돼" │  interim result      │                      │                   │
  │                  │<─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                      │                   │
  │  실시간 텍스트 표시│                      │                      │                   │
  │<─ ─ ─ ─ ─ ─ ─ ─│                      │                      │                   │
  │                  │                      │                      │                   │
  │  (침묵)          │  isFinal result      │                      │                   │
  │                  │<─────────────────────│                      │                   │
  │                  │  POST /todos/refine  │                      │                   │
  │                  │─────────────────────────────────────────────>│                   │
  │  임시 카드 (로딩) │                      │                      │                   │
  │<─ ─ ─ ─ ─ ─ ─ ─│                      │                      │                   │
  │                  │  { refinedText }     │                      │                   │
  │                  │<─────────────────────────────────────────────│                   │
  │  임시 카드 (확정) │                      │                      │                   │
  │<─ ─ ─ ─ ─ ─ ─ ─│                      │                      │                   │
  │                  │                      │                      │                   │
  │  ■ 종료 탭       │  stop()              │                      │                   │
  │─────────────────>│─────────────────────>│                      │                   │
  │                  │  POST /todos/batch   │                      │                   │
  │                  │────────────────────────────────────────────────────────────────>│
  │                  │  { created: [...] }  │                      │                   │
  │                  │<────────────────────────────────────────────────────────────────│
  │  이전 화면 복귀   │                      │                      │                   │
  │<─────────────────│                      │                      │                   │
```

### 5.3 네비게이션 변경

현재 네비게이션은 `AuthNavigator` 내 `NativeStackNavigator`로 Auth → Onboarding → Main 분기를 처리한다. VoiceInputScreen은 Main 내부에서 진입하므로 **RootStackParamList에 추가**한다.

```typescript
// navigation/types.ts
export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
  Settings: undefined;
  VoiceInput: { todoDate: string };  // 추가
};
```

```typescript
// AuthNavigator.tsx — Main 분기 내에 VoiceInput 화면 등록
// Stack.Screen name="VoiceInput" 추가 (모달 프레젠테이션)
<Stack.Screen
  name="VoiceInput"
  component={VoiceInputScreen}
  options={{ presentation: 'modal', headerShown: false }}
/>
```

VoiceTodoButton에서 `navigation.navigate('VoiceInput', { todoDate: selectedDate })`로 진입한다.

### 5.4 프론트엔드 컴포넌트 설계

#### 5.4.1 화면 구조

```
VoiceInputScreen
├── Header (← 뒤로 + 제목)
├── DraftTodoList (FlatList)
│   └── DraftTodoItem × N
├── LiveTranscript (실시간 전사 텍스트)
└── VoiceControls (녹음 상태 + ■ 버튼)
```

#### 5.4.2 핵심 타입

```typescript
// features/voice/types.ts
interface DraftTodo {
  id: string;                                    // uuid.v4() 클라이언트 생성
  rawText: string;                               // STT 원본 텍스트
  refinedText: string | null;                    // LLM 정리된 텍스트 (null = 정리 중)
  status: 'refining' | 'ready' | 'error';
}
```

#### 5.4.3 useSpeechRecognition 훅

```typescript
// features/voice/useSpeechRecognition.ts
interface UseSpeechRecognitionReturn {
  isListening: boolean;
  interimText: string;           // 현재 인식 중인 텍스트 (interim result)
  error: string | null;
  start: () => Promise<void>;    // 녹음 시작
  stop: () => Promise<void>;     // 녹음 중단
}
```

**구현 핵심:**
- `ExpoSpeechRecognitionModule.start({ lang: 'ko-KR', continuous: true, interimResults: true })`
- `result` 이벤트 리스너에서 `isFinal: false` → `interimText` 업데이트, `isFinal: true` → `onFinalResult` 콜백 호출
- iOS 60초 제한 대응: `end` 이벤트 수신 시 `isListening`이 true면 자동 재시작
- 컴포넌트 언마운트 시 리스너 정리 (`removeAllListeners`)

#### 5.4.4 useVoiceTodoSession 훅

```typescript
// features/voice/useVoiceTodoSession.ts
interface UseVoiceTodoSessionReturn {
  drafts: DraftTodo[];
  addDraft: (rawText: string) => void;       // isFinal 시 호출
  removeDraft: (id: string) => void;          // ✕ 탭 시 호출
  confirmAll: (todoDate: string) => Promise<void>;  // ■ 종료 시 호출
  isConfirming: boolean;
  hasRefining: boolean;                       // refining 중인 항목 존재 여부
}
```

**상태 흐름:**
1. `addDraft(rawText)` → `{ id, rawText, refinedText: null, status: 'refining' }` 추가
2. `todoApi.refineText({ text: rawText })` 비동기 호출
3. 성공 → `status: 'ready'`, `refinedText` 설정
4. 실패 → `status: 'error'`, `refinedText: rawText` (원본 텍스트 폴백)
5. `confirmAll` → `drafts`에서 `refining` 아닌 항목만 수집 → `todoApi.batchCreateTodos()`

#### 5.4.5 VoiceTodoButton 변경

기존 `useVoiceRecording` 훅 의존을 제거하고, 네비게이션만 수행하는 단순 버튼으로 변경한다.

```typescript
// 변경 전: onPress → startRecording() → stopRecording() → onVoiceTodoCreated(audioUri)
// 변경 후: onPress → navigation.navigate('VoiceInput', { todoDate })
```

- Props에서 `onVoiceTodoCreated`, `isProcessing`, `processingError` 제거
- `todoDate` prop 추가
- `useVoiceRecording` import 제거

#### 5.4.6 ■ 종료 버튼 동작 상세

```typescript
const handleStop = async () => {
  await speechRecognition.stop();

  // 마지막 isFinal 이벤트 처리 대기 (stop 직후 발생 가능)
  // useSpeechRecognition 내부에서 stop 후 pending result flush

  if (session.hasRefining) {
    // refining 완료 대기 (로딩 UI 표시)
    await waitForAllRefining();
  }

  if (session.drafts.length === 0) {
    showToast('인식된 할 일이 없습니다');
    navigation.goBack();
    return;
  }

  try {
    await session.confirmAll(todoDate);
    navigation.goBack();
  } catch {
    showToast('할 일 생성에 실패했습니다');
    // 화면 유지 — 사용자가 재시도 또는 뒤로 가기
  }
};
```

### 5.5 백엔드 API 설계

#### 5.5.1 POST /todos/voice — Deprecated (410 Gone)

기존 로직을 주석 처리하고, 무조건 410을 반환한다.

```typescript
/**
 * @deprecated 디바이스 내장 STT + POST /todos/refine 조합으로 대체됨.
 * 대체 엔드포인트: POST /todos/refine (텍스트 정리), POST /todos/batch (일괄 생성)
 * 삭제하지 않는 이유: 구버전 클라이언트 호출 시 명확한 에러 메시지 제공
 */
@Post('voice')
@HttpCode(HttpStatus.GONE)
async createVoiceTodo() {
  throw new HttpException(
    {
      statusCode: HttpStatus.GONE,
      code: 'ENDPOINT_DEPRECATED',
      message: '이 엔드포인트는 더 이상 사용되지 않습니다. 디바이스 내장 STT + POST /todos/refine 조합으로 대체되었습니다.',
    },
    HttpStatus.GONE,
  );
}
```

기존 `createVoiceTodo` 메서드의 원본 로직은 주석으로 보존한다. `FileInterceptor`, `@Throttle` 데코레이터도 제거한다.

#### 5.5.2 POST /todos/refine

```typescript
// DTO
class RefineTextDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text: string;
}

// Response
interface RefineTextResponse {
  refinedText: string;
}
```

**컨트롤러:**
```typescript
@Post('refine')
@HttpCode(HttpStatus.OK)
@Throttle({
  short: { ttl: 1000, limit: 1 },
  medium: { ttl: 60000, limit: 30 },
})
async refineText(
  @Req() req: AuthenticatedRequest,
  @Body() body: RefineTextDto,
): Promise<RefineTextResponse> {
  return this.refineTextUsecase.execute({
    userAuthId: req.user.userAuthId,
    text: body.text,
  });
}
```

**유스케이스 (refine-text.usecase.ts):**
1. 사용자 존재 확인 (`UserRepository.findByUserAuthId`)
2. `GeminiService.refineText(rawText)` 호출
3. 결과가 비어있으면 원본 텍스트 반환 (fallback)
4. `{ refinedText }` 반환 — DB 저장 없음

#### 5.5.3 POST /todos/batch

```typescript
// DTO
class BatchCreateTodoItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  content: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  todoDate: string;
}

class BatchCreateTodosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BatchCreateTodoItemDto)
  todos: BatchCreateTodoItemDto[];
}

// Response
interface BatchCreateTodosResponse {
  created: Todo[];
}
```

**컨트롤러:**
```typescript
@Post('batch')
@HttpCode(HttpStatus.CREATED)
async batchCreateTodos(
  @Req() req: AuthenticatedRequest,
  @Body() body: BatchCreateTodosDto,
): Promise<BatchCreateTodosResponse> {
  return this.batchCreateTodoUsecase.execute({
    userAuthId: req.user.userAuthId,
    todos: body.todos,
  });
}
```

**유스케이스 (batch-create-todo.usecase.ts):**
1. 사용자 존재 확인
2. 트랜잭션 내에서 `TodoRepository.create()` × N 실행
3. 전체 성공 또는 전체 롤백
4. 생성된 Todo 배열 반환

```typescript
// 트랜잭션 처리
async execute(input: BatchCreateTodoInput): Promise<BatchCreateTodosResponse> {
  const user = await this.userRepository.findByUserAuthId(input.userAuthId);
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  const created = await this.todoRepository.manager.transaction(async (manager) => {
    const todos: Todo[] = [];
    for (const item of input.todos) {
      const todo = await manager.save(Todo, {
        userId: user.id,
        content: item.content,
        todoDate: item.todoDate,
        status: TodoStatus.ACTIVE,
        createdBy: user.id,
        updatedBy: user.id,
      });
      todos.push(todo);
    }
    return todos;
  });

  return { created };
}
```

#### 5.5.4 GeminiService.refineText 메서드

```typescript
private static readonly REFINE_PROMPT =
  '다음 문장을 간결한 한국어 할 일(todo) 형태로 정리해줘. 부연 설명 없이 할 일 내용만 반환해.';

async refineText(rawText: string): Promise<string> {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await this.model.generateContent([
        `${GeminiService.REFINE_PROMPT}\n\n"${rawText}"`,
      ]);

      const text = result.response.text().trim();
      return text || rawText;  // 빈 응답 시 원본 반환
    } catch (error) {
      // 기존 transcribeAndRefine과 동일한 retry/rate-limit 패턴
      const status = (error as { status?: number }).status;
      if (status === 429 && attempt < maxRetries) {
        const delay = attempt * 2000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (status === 429) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            code: 'VOICE_AI_RATE_LIMIT',
            message: 'AI 서비스 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'VOICE_AI_API_ERROR',
          message: 'Gemini API 호출에 실패했습니다.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  return rawText;  // 최종 실패 시 원본 반환
}
```

**기존 `transcribeAndRefine`과의 차이:**
- 오디오 `inlineData` 없음 → 텍스트만 전송 → 토큰 소비 최소화
- 실패 시 원본 텍스트 반환 (기존은 에러 throw)

### 5.6 프론트엔드 API 클라이언트 추가

```typescript
// services/api/todoApi.ts에 추가

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

// todoApi 객체에 추가
async refineText(request: RefineTextRequest): Promise<RefineTextResponse> {
  const response = await apiClient.post('/todos/refine', request);
  return response.data;
},

async batchCreateTodos(request: BatchCreateTodosRequest): Promise<BatchCreateTodosResponse> {
  const response = await apiClient.post('/todos/batch', request);
  return response.data;
},
```

### 5.7 의존성

| 패키지 | 버전 | 위치 | 용도 |
| --- | --- | --- | --- |
| `expo-speech-recognition` | latest | 프론트엔드 | 디바이스 내장 STT 래퍼 |
| `class-transformer` | 기존 | 백엔드 | `@Type()` 데코레이터 (nested DTO 변환) |

`expo-audio`, `useVoiceRecording` 훅은 더 이상 음성 할 일에서 사용하지 않지만, 다른 기능에서 사용할 가능성이 있으므로 제거하지 않는다.

---

## 6. 에러 처리 상세

### 6.1 프론트엔드

| 시나리오 | 처리 |
| --- | --- |
| 마이크 권한 거부 | 토스트 "마이크 권한이 필요합니다" → `navigation.goBack()` |
| STT `error` 이벤트 | 해당 발화 무시, `isListening` 유지 → 다음 발화 계속 수신 |
| STT `end` 이벤트 (의도치 않은 종료) | `isListening === true`면 자동 `start()` 재시작 (iOS 60초 제한 대응) |
| `/todos/refine` 실패 | 해당 DraftTodo를 `status: 'error'`로 변경, `refinedText: rawText` (원본 사용) |
| `/todos/batch` 실패 | 토스트 "할 일 생성에 실패했습니다" → 화면 유지 (■ 버튼 재시도 가능) |
| 네트워크 오프라인 | 토스트 "네트워크 연결을 확인해주세요" → 녹음 중단, 화면 유지 |

### 6.2 백엔드

| 시나리오 | HTTP | Code | 처리 |
| --- | --- | --- | --- |
| `POST /todos/voice` 호출 | 410 | `ENDPOINT_DEPRECATED` | deprecated 메시지 반환 |
| `/refine` text 빈 문자열 | 400 | `BAD_REQUEST` | DTO 검증 실패 |
| `/refine` Gemini 429 | 429 | `VOICE_AI_RATE_LIMIT` | 3회 retry 후 rate limit 에러 |
| `/refine` Gemini 장애 | 500 | `VOICE_AI_API_ERROR` | Gemini API 에러 |
| `/batch` todos 빈 배열 | 400 | `BAD_REQUEST` | DTO 검증 실패 |
| `/batch` todos > 20개 | 400 | `BAD_REQUEST` | DTO 검증 실패 |
| `/batch` 트랜잭션 실패 | 500 | `INTERNAL_SERVER_ERROR` | 전체 롤백 |

---

## 7. 테스트 전략

### 7.1 백엔드 단위 테스트

| 대상 | 테스트 케이스 |
| --- | --- |
| `GeminiService.refineText` | 정상 정리, 빈 응답 시 원본 반환, 429 retry, 429 최종 실패, 일반 에러 |
| `RefineTextUsecase` | 정상 흐름, 사용자 미존재, Gemini 에러 전파 |
| `BatchCreateTodoUsecase` | 정상 다건 생성, 사용자 미존재, 트랜잭션 롤백, 빈 배열 |
| `TodoController` (voice deprecated) | 410 Gone 반환 확인 |
| `TodoController` (refine) | 정상 200, 빈 text 400, 인증 실패 401 |
| `TodoController` (batch) | 정상 201, 빈 배열 400, 초과 400, 인증 실패 401 |

### 7.2 프론트엔드 단위 테스트

| 대상 | 테스트 케이스 |
| --- | --- |
| `useVoiceTodoSession` | addDraft 정상, addDraft refine 실패 시 원본 폴백, removeDraft, confirmAll 정상, confirmAll 실패 |
| `DraftTodoItem` | ready 상태 렌더링, refining 로딩 표시, error 라벨 표시, ✕ 탭 시 콜백 |
| `VoiceTodoButton` | 탭 시 VoiceInput 네비게이션 호출 |

### 7.3 E2E 테스트 (Maestro)

```yaml
# .maestro/voice/voice-input-flow.yaml
- launchApp
- tapOn: "마이크 FAB"
- assertVisible: "음성 할 일 입력"      # VoiceInputScreen 진입 확인
- assertVisible: "녹음 중"              # 자동 녹음 시작 확인
# STT는 실제 음성 입력이 어려우므로 mock 또는 수동 테스트로 대체
- tapOn: "종료 버튼"                    # ■ 탭
- assertNotVisible: "음성 할 일 입력"    # 이전 화면 복귀 확인
```

---

## 8. 변경 파일 목록

### 프론트엔드

| 유형 | 파일 경로 | 설명 |
| --- | --- | --- |
| 신규 | `src/screens/voice/VoiceInputScreen.tsx` | 전용 화면 컨테이너 |
| 신규 | `src/features/voice/useSpeechRecognition.ts` | expo-speech-recognition 래퍼 훅 |
| 신규 | `src/features/voice/useVoiceTodoSession.ts` | 임시 todo 상태 관리 훅 |
| 신규 | `src/features/voice/types.ts` | DraftTodo 등 타입 정의 |
| 신규 | `src/components/voice/DraftTodoList.tsx` | 임시 todo FlatList |
| 신규 | `src/components/voice/DraftTodoItem.tsx` | 개별 임시 todo 카드 |
| 신규 | `src/components/voice/LiveTranscript.tsx` | 실시간 전사 텍스트 |
| 신규 | `src/components/voice/VoiceControls.tsx` | 녹음 상태 + ■ 종료 버튼 |
| 수정 | `src/app/navigation/types.ts` | `VoiceInput` 파라미터 추가 |
| 수정 | `src/app/navigation/AuthNavigator.tsx` | VoiceInput Stack.Screen 등록 + MainWrapper voice 관련 상태/핸들러 제거 |
| 수정 | `src/services/api/todoApi.ts` | `refineText`, `batchCreateTodos` 메서드 추가 |
| 수정 | `src/components/todo/VoiceTodoButton.tsx` | 녹음 로직 제거 → `navigation.navigate('VoiceInput')` |
| 수정 | `src/screens/main/MainScreen.tsx` | voice 관련 props 제거 (`isVoiceProcessing`, `voiceProcessingError`, `onVoiceTodoCreated` 시그니처 변경) |

### 백엔드

| 유형 | 파일 경로 | 설명 |
| --- | --- | --- |
| 신규 | `src/todo/application/refine-text.usecase.ts` | 텍스트 정리 유스케이스 |
| 신규 | `src/todo/application/batch-create-todo.usecase.ts` | 일괄 생성 유스케이스 |
| 신규 | `src/todo/application/dto/refine-text.dto.ts` | RefineTextDto |
| 신규 | `src/todo/application/dto/batch-create-todos.dto.ts` | BatchCreateTodosDto |
| 수정 | `src/todo/todo.controller.ts` | `POST /refine`, `POST /batch` 추가 + `POST /voice` deprecated (410 Gone) |
| 수정 | `src/todo/todo.module.ts` | `RefineTextUsecase`, `BatchCreateTodoUsecase` provider 등록 |
| 수정 | `src/ai/infrastructure/gemini.service.ts` | `refineText(rawText)` 메서드 추가 |

### 테스트

| 유형 | 파일 경로 | 설명 |
| --- | --- | --- |
| 신규 | `backend/test/unit/ai/infrastructure/gemini.service.refine.spec.ts` | refineText 단위 테스트 |
| 신규 | `backend/test/unit/todo/application/refine-text.usecase.spec.ts` | 정리 유스케이스 테스트 |
| 신규 | `backend/test/unit/todo/application/batch-create-todo.usecase.spec.ts` | 일괄 생성 유스케이스 테스트 |
| 신규 | `frontend/__tests__/features/voice/useVoiceTodoSession.test.ts` | 세션 훅 테스트 |
| 신규 | `frontend/__tests__/components/voice/DraftTodoItem.test.tsx` | 카드 컴포넌트 테스트 |
| 수정 | `backend/test/unit/todo/todo.controller.spec.ts` | deprecated 엔드포인트 410 검증 추가 |

---

## 9. 마일스톤

| 단계 | 범위 | 산출물 |
| --- | --- | --- |
| M1: 백엔드 API | `POST /refine`, `POST /batch`, `POST /voice` deprecated, GeminiService.refineText | API 엔드포인트 + 단위 테스트 |
| M2: 프론트엔드 훅 | useSpeechRecognition, useVoiceTodoSession, todoApi 클라이언트 | 훅 + 단위 테스트 |
| M3: 화면 조립 | VoiceInputScreen + 하위 컴포넌트, 네비게이션 연결 | 동작하는 화면 |
| M4: 기존 코드 정리 | VoiceTodoButton 변경, MainWrapper/MainScreen voice 관련 props 제거 | 기존 코드 마이그레이션 |
| M5: E2E 검증 | Maestro 테스트, 수동 음성 테스트 | 테스트 통과 |
