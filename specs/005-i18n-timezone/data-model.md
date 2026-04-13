# 데이터 모델: 다국어(i18n) 지원 및 전 세계 타임존 확장

**브랜치**: `005-i18n-timezone` | **날짜**: 2026-04-10

## 1. 엔티티 변경

### 1.1 User 엔티티 (기존 수정)

**파일**: `backend/src/user/domain/user.entity.ts`

| 필드 | 변경 유형 | 기존 | 변경 후 |
|------|----------|------|---------|
| `language` | 수정 | `varchar(10)`, 값 `'ko-KR'` | `varchar(10)`, 값 `'ko'`/`'en'`/`'ja'`/`'es'`, 기본값 `'en'` |
| `timezone` | 변경 없음 | `varchar`, `nullable: true` | 동일 (회원가입 시 자동 설정됨) |

**검증 규칙**:
- `language`: `['ko', 'en', 'ja', 'es']` 화이트리스트 검증 (`@IsIn`)
- `timezone`: 기존 `Intl.DateTimeFormat` 검증 유지

### 1.2 번역 파일 (신규)

**위치**: `frontend/src/i18n/locales/`

번역 파일은 DB 엔티티가 아닌 정적 JSON 파일로 관리된다.

| 파일 | 역할 | 비고 |
|------|------|------|
| `ko.json` | 한국어 원본 | 모든 번역 키의 기준 |
| `en.json` | 영어 (기본/fallback) | 키 누락 시 이 파일에서 fallback |
| `ja.json` | 일본어 | AI 번역 + 교차 검수 |
| `es.json` | 스페인어 | AI 번역 + 교차 검수 |

**키 구조** (최상위 네임스페이스):

```
common     — 공통 텍스트 (저장, 취소, 삭제, 확인, 로딩 등)
auth       — 로그인 관련
main       — 메인 화면 (계획/회고 모드)
todo       — 할 일 관련
settings   — 설정 화면
onboarding — 온보딩
voice      — 음성 입력
timezone   — 타임존 선택
calendar   — 캘린더
memo       — 메모
error      — 에러 메시지
```

## 2. DB 마이그레이션

### 2.1 language 컬럼 형식 변환

**파일**: `backend/src/migration/xxxx-update-language-format.ts`

**up (순방향)**:
1. `language = 'ko-KR'` → `language = 'ko'`
2. `language = 'en-US'` → `language = 'en'`
3. `language = 'ja-JP'` → `language = 'ja'`
4. `language = 'es-ES'` → `language = 'es'`
5. 매핑되지 않는 값 → `language = 'en'`
6. 기본값: `'ko-KR'` → `'en'`

**down (역방향)**:
1. `language = 'ko'` → `language = 'ko-KR'`
2. 기본값: `'en'` → `'ko-KR'`

## 3. 프론트엔드 타입 변경

### 3.1 SupportedLanguage 타입 (신규)

**위치**: `frontend/src/i18n/index.ts`

```
SupportedLanguage = 'ko' | 'en' | 'ja' | 'es'
```

### 3.2 UserProfile 타입 (수정)

**위치**: `frontend/src/types/user.ts`

| 필드 | 기존 | 변경 후 |
|------|------|---------|
| `language` | `string` | `SupportedLanguage` (`'ko' \| 'en' \| 'ja' \| 'es'`) |

### 3.3 TimezoneItem 타입 (신규)

**위치**: `frontend/src/screens/settings/TimezoneSelectScreen.tsx` 내부

```
TimezoneItem {
  name: string        // 'Asia/Seoul'
  offset: string      // 'UTC+09:00'
  offsetMinutes: number // 540 (정렬용)
}
```

### 3.4 RootStackParamList 확장 (수정)

**위치**: `frontend/src/app/navigation/types.ts`

| 기존 | 추가 |
|------|------|
| Auth, Onboarding, Main, Settings, VoiceInput | `TimezoneSelect: undefined` |

## 4. 상수/매핑

### 4.1 STT 로케일 매핑

```
STT_LOCALE_MAP = {
  ko → 'ko-KR',
  en → 'en-US',
  ja → 'ja-JP',
  es → 'es-ES'
}
```

### 4.2 언어 레이블

```
LANGUAGE_LABELS = {
  ko → '한국어',
  en → 'English',
  ja → '日本語',
  es → 'Español'
}
```

### 4.3 LLM 프롬프트 매핑

```
REFINE_PROMPTS = {
  ko → '다음 음성 인식 텍스트를 간결한 할 일(todo) 형태로 정리해줘...',
  en → 'Refine the following speech-to-text result into a concise todo item...',
  ja → '次の音声認識テキストを簡潔なToDo形式に整理してください...',
  es → 'Refina el siguiente texto de reconocimiento de voz en un elemento de tarea conciso...'
}
```
