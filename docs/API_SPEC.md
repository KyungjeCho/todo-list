> **Version:** v1.1
**Base URL:** `https://api.todolist.com/v1`   
**인증:** Bearer Token (JWT)
**Content-Type:** `application/json`
> 

---

## 공통 사항

### 인증 헤더

```
Authorization: Bearer {access_token}
```

### 공통 에러 응답

| HTTP Status | Code | Description |
| --- | --- | --- |
| 400 | BAD_REQUEST | 요청 파라미터 유효성 검증 실패 |
| 401 | UNAUTHORIZED | 인증 토큰 누락 또는 만료 |
| 403 | FORBIDDEN | 권한 없음 (타인의 리소스 접근) |
| 404 | NOT_FOUND | 리소스 없음 |
| 500 | INTERNAL_SERVER_ERROR | 서버 내부 오류 |

### 공통 에러 응답 형식

```json
{
  "statusCode": 401,
  "code": "UNAUTHORIZED",
  "message": "Access token has expired",
  "timestamp": "2026-03-25T09:00:00.000Z"
}
```

### 페이지네이션

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalCount": 100,
    "totalPages": 5
  }
}
```

---

## 1. 인증 (Auth)

### 1.1 OAuth 로그인 요청

OAuth provider의 로그인 페이지로 리다이렉트합니다. 모바일 앱에서는 in-app 브라우저로 이 엔드포인트를 호출합니다. FCM 토큰 등 디바이스 정보를 함께 전달하면 로그인 완료 시 자동으로 디바이스가 등록됩니다.

**GET** `/auth/oauth/{provider}?fcmToken={token}&deviceType={type}&deviceName={name}`

**Auth:** 불필요

**Path Parameters:**

| Param | Type | Description |
| --- | --- | --- |
| provider | string | `google` / `naver` / `kakao` / `apple` |

**Query Parameters:**

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| fcmToken | string | Y | FCM 디바이스 토큰 |
| deviceType | string | Y | `IOS` / `ANDROID` |
| deviceName | string | N | 디바이스 이름 (예: iPhone 16 Pro) |

> 서버는 디바이스 정보를 state 값과 함께 임시 저장하고, OAuth 콜백 처리 시 디바이스를 등록합니다.

**Response 302:** provider의 OAuth 인증 페이지로 리다이렉트

| Provider | 리다이렉트 대상 |
| --- | --- |
| google | `https://accounts.google.com/o/oauth2/v2/auth?...` |
| naver | `https://nid.naver.com/oauth2.0/authorize?...` |
| kakao | `https://kauth.kakao.com/oauth/authorize?...` |
| apple | `https://appleid.apple.com/auth/authorize?...` |

**Errors:**

| Status | Code | 상황 |
| --- | --- | --- |
| 400 | INVALID_PROVIDER | 지원하지 않는 provider |

---

### 1.2 OAuth 콜백

provider 인증 완료 후 authorization code를 수신합니다. 서버가 code를 provider 토큰으로 교환하고, 사용자 정보를 조회하여 JWT를 발급합니다. 신규 유저는 자동 생성됩니다. 로그인 시 provider에서 조회한 이메일을 `TODOLIST_USER_AUTH_OAUTH.provider_user_email`에 동기화합니다.

**GET** `/auth/oauth/{provider}/callback`

**Auth:** 불필요

**Path Parameters:**

| Param | Type | Description |
| --- | --- | --- |
| provider | string | `google` / `naver` / `kakao` / `apple` |

**Query Parameters (provider가 전달):**

| Param | Type | Description |
| --- | --- | --- |
| code | string | Authorization code |
| state | string | CSRF 방지용 state 값 |
| error | string | 인증 실패 시 에러 코드 (선택) |

**처리 흐름:**

```
1. state 값 검증 (CSRF 방지)
2. authorization code → provider 토큰 교환
3. provider API로 사용자 정보 조회 (id, email)
4. provider_user_id로 기존 유저 조회 또는 신규 생성
5. provider_user_email 동기화
6. state에 연결된 디바이스 정보로 FCM 토큰 등록/갱신
7. JWT (Access Token + Refresh Token) 발급
8. 앱 딥링크로 리다이렉트
```

**Response 302 (기존 유저):**

```
todolist://auth/callback?accessToken={jwt}&refreshToken={jwt}&isNewUser=false
```

**Response 302 (신규 유저):**

```
todolist://auth/callback?accessToken={jwt}&refreshToken={jwt}&isNewUser=true
```

**Response 302 (인증 실패):**

```
todolist://auth/callback?error=AUTHENTICATION_FAILED
```

**서버 내부 처리 결과 (딥링크 파라미터 설명):**

| Field | Type | Description |
| --- | --- | --- |
| accessToken | string | JWT Access Token |
| refreshToken | string | JWT Refresh Token |
| isNewUser | boolean | 신규 유저 여부 (true면 온보딩 필요) |
| error | string | 인증 실패 시 에러 코드 |

**Errors (딥링크 error 파라미터):**

| Code | 상황 |
| --- | --- |
| AUTHENTICATION_FAILED | provider 인증 실패, code 교환 실패 |
| INVALID_PROVIDER | 지원하지 않는 provider |
| EMAIL_REQUIRED | provider에서 이메일을 제공하지 않음 |

---

### 1.3 토큰 갱신

만료된 Access Token을 Refresh Token으로 갱신합니다.

**POST** `/auth/token/refresh`

**Auth:** 불필요

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 200:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**

| Status | Code | 상황 |
| --- | --- | --- |
| 401 | AUTHENTICATION_FAILED | Refresh Token 유효하지 않음 또는 만료 |

---

### 1.4 로그아웃

현재 세션의 Refresh Token을 무효화하고, 해당 디바이스의 FCM 토큰을 삭제합니다.

**POST** `/auth/logout`

**Auth:** Bearer Token

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "fcmToken": "dGVzdC1mY20tdG9rZW4..."
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| refreshToken | string | Y | 무효화할 Refresh Token |
| fcmToken | string | Y | 삭제할 FCM 디바이스 토큰 |

**Response 200:**

```json
{
  "message": "Successfully logged out"
}
```

---

## 2. 사용자 (User)

### 2.1 내 프로필 조회

**GET** `/users/me`

**Auth:** Bearer Token

**Response 200:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userName": "홍길동",
  "planTime": "08:00",
  "reviewTime": "22:00",
  "timezone": "Asia/Seoul",
  "language": "ko-KR"
}
```

> `planTime`, `reviewTime`은 null일 수 있습니다. null인 경우 해당 알림은 비활성 상태입니다.

---

### 2.2 프로필 설정 변경

사용자 프로필 및 루틴 시간을 변경합니다. 온보딩 시에도 이 엔드포인트를 사용합니다. (FR-16, FR-17)

> **온보딩 흐름:** 신규 유저는 `GET /users/me` 응답에서 `timezone`이 null입니다. 클라이언트는 이를 확인하여 온보딩 화면을 표시하고, 이 엔드포인트로 설정을 완료합니다. `planTime`과 `reviewTime`은 선택 사항이며, null로 유지하면 해당 알림이 발송되지 않습니다.

**PATCH** `/users/me/settings`

**Auth:** Bearer Token

**Request Body:**

```json
{
  "userName": "홍길동",
  "planTime": "07:30",
  "reviewTime": "21:00",
  "timezone": "Asia/Seoul",
  "language": "ko-KR"
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| userName | string | N | 사용자 이름 (max 100자) |
| planTime | string\|null | N | 계획 알림 시간 (HH:mm). null로 설정 시 알림 해제 |
| reviewTime | string\|null | N | 회고 알림 시간 (HH:mm). null로 설정 시 알림 해제 |
| timezone | string | N | IANA timezone |
| language | string | N | BCP-47 언어 코드 (예: ko-KR, en-US) |

**Response 200:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userName": "홍길동",
  "planTime": "07:30",
  "reviewTime": "21:00",
  "timezone": "Asia/Seoul",
  "language": "ko-KR"
}
```

**Errors:**

| Status | Code | 상황 |
| --- | --- | --- |
| 400 | INVALID_TIME_FORMAT | 시간 형식 오류 |
| 400 | INVALID_TIMEZONE | 유효하지 않은 timezone |

---

## 3. 할 일 (Todo)

### 3.1 오늘 할 일 목록 조회

오늘 날짜의 할 일 목록을 조회합니다. 이월된 항목을 포함합니다. (FR-01, AC 1.2)

**GET** `/todos?date={date}`

**Auth:** Bearer Token

**Query Parameters:**

| Param | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| date | string | N | 오늘 | 조회 날짜 (YYYY-MM-DD) |

**Response 200:**

```json
{
  "date": "2026-03-25",
  "mode": "PLAN",
  "stats": {
    "total": 5,
    "completed": 2,
    "active": 2,
    "inactive": 1,
    "progressRate": 40.0
  },
  "todos": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "content": "NestJS API 개발",
      "status": "ACTIVE",
      "isCarriedOver": true,
      "todoDate": "2026-03-25",
      "memos": [],
      "createdAt": "2026-03-24T08:30:00.000Z",
      "updatedAt": "2026-03-25T00:00:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "content": "PRD 리뷰",
      "status": "COMPLETED",
      "isCarriedOver": false,
      "todoDate": "2026-03-25",
      "memos": [
        {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "content": "피드백 반영 완료",
          "createdAt": "2026-03-25T11:00:00.000Z",
          "updatedAt": "2026-03-25T11:00:00.000Z"
        }
      ],
      "createdAt": "2026-03-25T08:00:00.000Z",
      "updatedAt": "2026-03-25T14:30:00.000Z"
    }
  ]
}
```

`mode` 필드는 사용자의 planTime/reviewTime과 현재 시간을 비교하여 자동 결정됩니다. reviewTime이 null인 경우 항상 `PLAN`이 반환됩니다.

---

### 3.2 할 일 생성

새로운 할 일을 추가합니다. (FR-02)

**POST** `/todos`

**Auth:** Bearer Token

**Request Body:**

```json
{
  "content": "ERD 설계",
  "todoDate": "2026-03-25"
}
```

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| content | string | Y | - | 할 일 내용 (max 255자) |
| todoDate | string | N | 오늘 | 날짜 (YYYY-MM-DD) |

**Response 201:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "content": "ERD 설계",
  "status": "ACTIVE",
  "isCarriedOver": false,
  "todoDate": "2026-03-25",
  "memos": [],
  "createdAt": "2026-03-25T09:00:00.000Z",
  "updatedAt": "2026-03-25T09:00:00.000Z"
}
```

**Errors:**

| Status | Code | 상황 |
| --- | --- | --- |
| 400 | CONTENT_REQUIRED | content 누락 또는 빈 문자열 |
| 400 | CONTENT_TOO_LONG | content 255자 초과 |

---

### 3.3 음성으로 할 일 생성

음성 데이터를 Gemini Flash 멀티모달 API로 처리하여 할 일을 생성합니다. (FR-03)

**POST** `/todos/voice`

**Auth:** Bearer Token

**Content-Type:** `multipart/form-data`

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| audio | file | Y | 음성 파일 (wav, m4a, mp3) |
| todoDate | string | N | 날짜 (YYYY-MM-DD), 기본 오늘 |

**Response 201:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440004",
  "content": "오후 3시 팀 미팅 참석",
  "rawText": "오후 3시에 팀 미팅 가야 되는데",
  "status": "ACTIVE",
  "isCarriedOver": false,
  "todoDate": "2026-03-25",
  "memos": [],
  "createdAt": "2026-03-25T09:00:00.000Z",
  "updatedAt": "2026-03-25T09:00:00.000Z"
}
```

**Errors:**

| Status | Code | 상황 |
| --- | --- | --- |
| 400 | INVALID_AUDIO_FORMAT | 지원하지 않는 오디오 형식 |
| 500 | VOICE_AI_API_ERROR | Gemini 음성 AI API 호출 실패 |

---

### 3.4 할 일 수정

할 일 내용을 수정합니다. (FR-04)

**PATCH** `/todos/{todoId}`

**Auth:** Bearer Token

**Path Parameters:**

| Param | Type | Description |
| --- | --- | --- |
| todoId | UUID | 할 일 ID |

**Request Body:**

```json
{
  "content": "수정된 할 일 내용"
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| content | string | N | 수정할 내용 (max 255자) |

**Response 200:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "content": "수정된 할 일 내용",
  "status": "ACTIVE",
  "isCarriedOver": false,
  "todoDate": "2026-03-25",
  "memos": [],
  "createdAt": "2026-03-25T08:00:00.000Z",
  "updatedAt": "2026-03-25T10:30:00.000Z"
}
```

---

### 3.5 할 일 상태 변경

할 일의 상태를 변경합니다. 완료 처리(FR-08), 비활성화(FR-05) 모두 이 API를 사용합니다.

**PATCH** `/todos/{todoId}/status`

**Auth:** Bearer Token

**Request Body:**

```json
{
  "status": "COMPLETED"
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| status | string | Y | ACTIVE / INACTIVE / COMPLETED |

**Response 200:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "content": "NestJS API 개발",
  "status": "COMPLETED",
  "isCarriedOver": false,
  "todoDate": "2026-03-25",
  "memos": [],
  "createdAt": "2026-03-25T08:00:00.000Z",
  "updatedAt": "2026-03-25T15:00:00.000Z"
}
```

**Errors:**

| Status | Code | 상황 |
| --- | --- | --- |
| 400 | INVALID_STATUS | 유효하지 않은 상태값 |
| 400 | INVALID_STATUS_TRANSITION | 허용되지 않는 상태 전이 (예: CARRIED_OVER 직접 설정) |

---

### 3.6 할 일 삭제

할 일을 삭제합니다. Soft Delete로 처리되어 deleted_at이 설정됩니다. (FR-06)

**DELETE** `/todos/{todoId}`

**Auth:** Bearer Token

**Response 200:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "deletedAt": "2026-03-25T15:30:00.000Z"
}
```

**Errors:**

| Status | Code | 상황 |
| --- | --- | --- |
| 404 | TODO_NOT_FOUND | 존재하지 않는 할 일 |
| 403 | FORBIDDEN | 타인의 할 일 삭제 시도 |

---

## 4. 메모 (Memo)

### 4.1 메모 추가

할 일에 메모를 추가합니다. 하나의 할 일에 여러 개의 메모를 추가할 수 있습니다. (FR-09)

**POST** `/todos/{todoId}/memos`

**Auth:** Bearer Token

**Request Body:**

```json
{
  "content": "회의 중 나온 피드백 정리 필요"
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| content | string | Y | 메모 내용 |

**Response 201:**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "todoId": "550e8400-e29b-41d4-a716-446655440001",
  "content": "회의 중 나온 피드백 정리 필요",
  "createdAt": "2026-03-25T11:00:00.000Z",
  "updatedAt": "2026-03-25T11:00:00.000Z"
}
```

**Errors:**

| Status | Code | 상황 |
| --- | --- | --- |
| 400 | CONTENT_REQUIRED | content 누락 또는 빈 문자열 |
| 404 | TODO_NOT_FOUND | 존재하지 않는 할 일 |

---

### 4.2 메모 수정

특정 메모의 내용을 수정합니다. (FR-09)

**PATCH** `/todos/{todoId}/memos/{memoId}`

**Auth:** Bearer Token

**Request Body:**

```json
{
  "content": "수정된 메모 내용"
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| content | string | Y | 수정할 메모 내용 |

**Response 200:**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "todoId": "550e8400-e29b-41d4-a716-446655440001",
  "content": "수정된 메모 내용",
  "createdAt": "2026-03-25T11:00:00.000Z",
  "updatedAt": "2026-03-25T14:00:00.000Z"
}
```

**Errors:**

| Status | Code | 상황 |
| --- | --- | --- |
| 404 | MEMO_NOT_FOUND | 존재하지 않는 메모 |
| 403 | FORBIDDEN | 타인의 메모 수정 시도 |

---

### 4.3 메모 삭제

메모를 삭제합니다. Soft Delete로 처리되어 deleted_at이 설정됩니다. (FR-09)

**DELETE** `/todos/{todoId}/memos/{memoId}`

**Auth:** Bearer Token

**Response 200:**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "deletedAt": "2026-03-25T16:00:00.000Z"
}
```

**Errors:**

| Status | Code | 상황 |
| --- | --- | --- |
| 404 | MEMO_NOT_FOUND | 존재하지 않는 메모 |
| 403 | FORBIDDEN | 타인의 메모 삭제 시도 |

---

## 5. 할 일 완료 및 리포트

### 5.1 오늘의 일정 완료

회고 모드에서 하루를 마감합니다. 미완료 항목은 자동 이월 대상이 됩니다. (FR-12)

**POST** `/todos/complete`

**Auth:** Bearer Token

**Request Body:**

```json
{
  "date": "2026-03-25"
}
```

**Response 200:**

```json
{
  "date": "2026-03-25",
  "stats": {
    "total": 5,
    "completed": 4,
    "active": 1,
    "inactive": 0,
    "progressRate": 80.0
  },
  "carriedOverCount": 1,
  "carriedOverTodos": [
    {
      "fromTodoId": "550e8400-e29b-41d4-a716-446655440001",
      "toTodoId": "550e8400-e29b-41d4-a716-446655440010",
      "content": "NestJS API 개발"
    }
  ]
}
```

**Errors:**

| Status | Code | 상황 |
| --- | --- | --- |
| 400 | FUTURE_DATE | 미래 날짜에 대한 완료 시도 |
| 409 | ALREADY_COMPLETED | 이미 완료된 날짜 |

---

### 5.2 월별 할 일 요약 조회

캘린더 페이지에서 월별 요약 데이터를 조회합니다. (FR-14)

**GET** `/todos/report/summary?year={year}&month={month}`

**Auth:** Bearer Token

**Query Parameters:**

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| year | int | Y | 연도 (예: 2026) |
| month | int | Y | 월 (1-12) |

**Response 200:**

```json
{
  "year": 2026,
  "month": 3,
  "days": [
    {
      "date": "2026-03-24",
      "totalCount": 5,
      "completedCount": 4,
      "activeCount": 0
    },
    {
      "date": "2026-03-25",
      "totalCount": 3,
      "completedCount": 1,
      "activeCount": 1
    }
  ]
}
```

---

## API 요약

| Category | Method | Endpoint | Description | 관련 FR | 우선순위 |
| --- | --- | --- | --- | --- | --- |
| Auth | GET | /auth/oauth/:provider | OAuth 로그인 요청 | - | P0 |
| Auth | GET | /auth/oauth/:provider/callback | OAuth 콜백 | - | P0 |
| Auth | POST | /auth/token/refresh | 토큰 갱신 | - | P0 |
| Auth | POST | /auth/logout | 로그아웃 | - | P0 |
| User | GET | /users/me | 프로필 조회 | - | P0 |
| User | PATCH | /users/me/settings | 프로필 설정 변경 (온보딩 포함) | FR-16, FR-17 | P0 |
| Todo | GET | /todos?date= | 할 일 목록 조회 | FR-01 | P0 |
| Todo | POST | /todos | 할 일 생성 | FR-02 | P0 |
| Todo | POST | /todos/voice | 음성 할 일 생성 | FR-03 | P1 |
| Todo | PATCH | /todos/:id | 할 일 수정 | FR-04 | P0 |
| Todo | PATCH | /todos/:id/status | 상태 변경 | FR-05, FR-08 | P0 |
| Todo | DELETE | /todos/:id | 할 일 삭제 | FR-06 | P0 |
| Memo | POST | /todos/:id/memos | 메모 추가 | FR-09 | P1 |
| Memo | PATCH | /todos/:id/memos/:memoId | 메모 수정 | FR-09 | P1 |
| Memo | DELETE | /todos/:id/memos/:memoId | 메모 삭제 | FR-09 | P1 |
| Todo | POST | /todos/complete | 일정 완료 | FR-12 | P0 |
| Todo | GET | /todos/report/summary | 월별 요약 | FR-14 | P1 |
