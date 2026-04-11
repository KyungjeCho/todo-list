# API 변경 계약: 다국어(i18n) 지원 및 전 세계 타임존 확장

**브랜치**: `005-i18n-timezone` | **날짜**: 2026-04-10

## 1. OAuth 콜백 (기존 수정)

### `GET /auth/google/callback`

**변경 사항**: 쿼리 파라미터에 `timezone`, `language` 추가

**요청 쿼리 파라미터** (추가분):

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `timezone` | `string` | 선택 | 디바이스 IANA 타임존 (예: `Asia/Seoul`). 유효하지 않으면 `null`로 저장 |
| `language` | `string` | 선택 | 디바이스 언어 코드 (예: `ko`). 유효하지 않으면 `'en'`으로 저장 |

**동작 변경**:
- 기존: 신규 사용자 생성 시 `timezone: null`, `language: 'ko-KR'`
- 변경: 신규 사용자 생성 시 `timezone: <감지값 또는 null>`, `language: <감지값 또는 'en'>`
- `language` 유효값: `['ko', 'en', 'ja', 'es']`
- `timezone` 유효성: `Intl.DateTimeFormat(undefined, { timeZone: tz })`로 검증

---

## 2. 사용자 설정 업데이트 (기존 수정)

### `PATCH /users/me/settings`

**변경 사항**: `language` 필드 검증 강화

**요청 바디** (변경분):

| 필드 | 기존 검증 | 변경 후 검증 |
|------|----------|------------|
| `language` | `@IsString() @IsOptional()` | `@IsString() @IsOptional() @IsIn(['ko', 'en', 'ja', 'es'])` |

**에러 응답** (추가):

| 상황 | HTTP 상태 | 에러 코드 | 메시지 |
|------|----------|----------|--------|
| 비지원 언어 값 | 400 | `BAD_REQUEST` | class-validator `@IsIn` 검증 실패 메시지 |

---

## 3. 음성 텍스트 정리 (기존 수정)

### `POST /todos/refine`

**변경 사항**: 내부 로직 변경 (API 인터페이스 변경 없음)

**동작 변경**:
- 기존: 한국어 프롬프트로 LLM 호출
- 변경: 요청 사용자의 `language` 설정에 따라 해당 언어 프롬프트로 LLM 호출
- API 요청/응답 형식은 변경 없음 (사용자 프로필에서 언어를 읽음)

---

## 4. 하위 호환성

| 항목 | 영향 | 대응 |
|------|------|------|
| OAuth 콜백 `timezone`/`language` 파라미터 | 선택적 파라미터로 추가되어 기존 클라이언트 영향 없음 | 미전송 시 기존 동작 유지 (`null`/`'en'`) |
| `PATCH /settings` language 검증 | 기존 `'ko-KR'` 형식 값 전송 시 400 에러 | 프론트엔드에서 새 형식(`'ko'`) 사용. DB 마이그레이션으로 기존 데이터 변환 |
| `POST /todos/refine` | API 인터페이스 변경 없음 | 내부 프롬프트만 변경 |
