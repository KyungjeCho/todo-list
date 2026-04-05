# Quickstart: 음성 입력 화면 (Voice Input Screen)

**Created**: 2026-04-04

---

## 전제 조건

- Node.js 18+
- Expo CLI (`npx expo`)
- iOS Simulator 또는 Android Emulator (STT는 실제 디바이스 권장)
- 백엔드 서버 실행 중 (`backend/`)
- Gemini API 키 설정 (`GEMINI_API_KEY` 환경변수)

---

## 1. 의존성 설치

### Frontend

```bash
cd frontend
npx expo install expo-speech-recognition
```

> `expo-speech-recognition`은 Expo Config Plugin을 포함하므로 별도 네이티브 설정 불필요. `app.json`에 마이크 권한 설명이 이미 있어야 한다 (기존 expo-audio에서 설정됨).

### Backend

기존 의존성으로 충분. 신규 패키지 없음.

---

## 2. 백엔드 실행

```bash
cd backend
npm run start:dev
```

새 엔드포인트 확인:
- `POST /todos/refine` — 텍스트 정리 (200 OK)
- `POST /todos/batch` — 일괄 생성 (201 Created)
- `POST /todos/voice` — deprecated (410 Gone)

---

## 3. 프론트엔드 실행

```bash
cd frontend
npx expo start
```

테스트 흐름:
1. 로그인 후 Plan 모드 MainScreen 진입
2. 마이크 FAB 버튼 탭 → VoiceInputScreen 이동
3. 한국어로 할 일 발화 → 실시간 전사 + 임시 카드 생성 확인
4. 종료 버튼(■) 탭 → 일괄 생성 후 MainScreen 복귀

---

## 4. 테스트 실행

```bash
# Backend 단위/통합 테스트
cd backend && npm test

# Frontend 단위 테스트
cd frontend && npm test

# Maestro E2E 테스트 (디바이스/에뮬레이터 필요)
maestro test .maestro/voice/
```

---

## 5. 주요 파일 위치

| 영역 | 파일 | 설명 |
|------|------|------|
| 화면 | `frontend/src/screens/voice/VoiceInputScreen.tsx` | 진입점 |
| STT 훅 | `frontend/src/features/voice/useSpeechRecognition.ts` | 음성 인식 래퍼 |
| 세션 훅 | `frontend/src/features/voice/useVoiceTodoSession.ts` | 임시 todo 관리 |
| API | `frontend/src/services/api/todoApi.ts` | refineText, batchCreateTodos |
| 정리 API | `backend/src/todo/todo.controller.ts` | POST /refine, /batch |
| LLM | `backend/src/ai/infrastructure/gemini.service.ts` | refineText 메서드 |
