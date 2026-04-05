# Research: 음성 입력 화면 (Voice Input Screen)

**Created**: 2026-04-04
**Status**: Complete

---

## R1: expo-speech-recognition 도입

**Decision**: `expo-speech-recognition` 패키지를 사용하여 디바이스 내장 STT를 활용한다.

**Rationale**:
- 기존 `expo-audio`는 오디오 녹음만 지원하고 STT 기능이 없어 서버에 오디오를 업로드해야 했음
- `expo-speech-recognition`은 iOS(Apple Speech Framework)와 Android(Google Speech Services)의 내장 STT 엔진을 래핑
- `continuous: true`, `interimResults: true` 옵션으로 실시간 전사 + 연속 인식 가능
- 네트워크 비용 절감: 오디오 파일 대신 텍스트만 서버 전송

**Alternatives considered**:
- `@react-native-voice/voice`: Expo managed workflow와의 호환성 문제
- Google Cloud Speech-to-Text API (서버): 추가 서버 비용, 실시간 스트리밍 복잡성
- Whisper (서버): 실시간 처리에 부적합한 레이턴시

**Known constraints**:
- iOS: 60초 인식 제한 → `end` 이벤트 수신 시 자동 재시작 로직으로 대응
- Android: 기기별 STT 품질 편차 → error 상태 시 원본 텍스트 폴백

---

## R2: 텍스트 정리 전용 엔드포인트 (POST /todos/refine)

**Decision**: 기존 `transcribeAndRefine` (오디오 → 텍스트) 대신 텍스트 전용 `refineText` 메서드를 GeminiService에 추가하고, `POST /todos/refine` 엔드포인트로 노출한다.

**Rationale**:
- 오디오 처리 제거로 Gemini API 토큰 소비 최소화
- 문장 단위 호출로 레이턴시 ≤ 2초 달성 가능
- DB 저장 없이 텍스트 변환만 수행하여 단순성 유지

**Alternatives considered**:
- 클라이언트에서 직접 Gemini API 호출: API 키 노출 위험, rate limit 관리 어려움
- WebSocket 스트리밍: 단방향 요청/응답으로 충분, 불필요한 복잡성

---

## R3: 일괄 생성 엔드포인트 (POST /todos/batch)

**Decision**: 트랜잭션 기반 일괄 생성 API를 추가한다.

**Rationale**:
- 세션 종료 시 N개의 할 일을 개별 API로 호출하면 N회 네트워크 왕복 + 부분 실패 위험
- 트랜잭션으로 전체 성공 또는 전체 실패 보장
- 최대 20개 제한으로 합리적인 상한 설정

**Alternatives considered**:
- 개별 `POST /todos` N회 호출: 네트워크 비용, 부분 실패 문제
- GraphQL mutation: 기존 REST 아키텍처와 불일치

---

## R4: 기존 POST /todos/voice 처리 방식

**Decision**: 엔드포인트를 삭제하지 않고 410 Gone을 반환하는 deprecated 처리한다.

**Rationale**:
- 구버전 클라이언트가 호출할 경우 명확한 에러 메시지 제공
- FileInterceptor, @Throttle 데코레이터 제거하여 불필요한 미들웨어 오버헤드 제거
- 원본 로직은 주석으로 보존하되, 주석 처리된 코드 금지 원칙(VIII)에 따라 JSDoc @deprecated 어노테이션과 간결한 사유 주석만 남김

**Alternatives considered**:
- 완전 삭제: 구버전 클라이언트에서 404 → deprecated 사유 불명확
- 유지하되 redirect: 요청 형식이 다르므로 redirect 불가능

---

## R5: 프론트엔드 상태 관리 전략

**Decision**: VoiceInputScreen 내부에서 `useState` + 커스텀 훅으로 로컬 상태 관리한다. Zustand 불필요.

**Rationale**:
- 임시 할 일(DraftTodo)은 화면 생명주기에 종속된 일시적 상태
- 다른 화면과 공유할 필요 없음
- 단순성 우선 원칙(VI) 준수

**Alternatives considered**:
- Zustand store: 화면 간 공유 불필요, 과도한 추상화
- useReducer: useState + 커스텀 훅으로 충분히 관리 가능한 복잡도

---

## R6: VoiceInputScreen 네비게이션 방식

**Decision**: RootStackParamList에 VoiceInput 추가, 모달 프레젠테이션으로 등록한다.

**Rationale**:
- 기존 AuthNavigator 내 NativeStackNavigator에 추가하여 일관된 네비게이션 패턴 유지
- 모달 프레젠테이션은 전용 작업 화면의 UX에 적합
- `{ todoDate: string }` 파라미터로 생성할 할 일의 날짜 전달

**Alternatives considered**:
- 별도 Navigator: 불필요한 네비게이션 계층 추가
- Bottom Sheet: 복잡한 UI(FlatList + 녹음 컨트롤)에 부적합
