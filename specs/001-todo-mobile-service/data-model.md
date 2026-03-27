# Data Model: Todo Mobile Service

**Branch**: `001-todo-mobile-service` | **Date**: 2026-03-26
**Source**: `specify/DDL.sql`, `specify/API_SPEC.md`

## Entity Relationship Overview

```
TODOLIST_USER_AUTH ──1:N── TODOLIST_USER_AUTH_OAUTH
        │
       1:1
        │
TODOLIST_USER ──1:N── TODOLIST_TODO ──1:N── TODOLIST_TODO_MEMO
        │                    │
        │               N:1──┼──1:N
        │                    │
        │         TODOLIST_CARRIED_OVER_HISTORY
        │              (from_todo_id → to_todo_id)
        │
        ├──1:N── TODOLIST_USER_DEVICE
        ├──1:N── TODOLIST_NOTIFICATION_LOG
        └──1:N── TODOLIST_USER_SESSION (via user_auth_id)
```

## Entities

### TODOLIST_USER

사용자 프로필 및 루틴 설정 정보.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK | 사용자 ID |
| user_auth_id | UUID | FK, UNIQUE, NOT NULL | 인증 정보 참조 |
| user_name | VARCHAR(100) | NOT NULL | 사용자 이름 |
| plan_time | TIME | NULL | 계획 알림 시간 (NULL = 알림 해제) |
| review_time | TIME | NULL | 회고 알림 시간 (NULL = 알림 해제) |
| timezone | VARCHAR(64) | NOT NULL, DEFAULT 'UTC' | IANA 타임존 |
| language | VARCHAR(10) | NOT NULL | BCP-47 언어 코드 |
| created_at | TIMESTAMPTZ | NOT NULL | 생성일시 |
| created_by | UUID | NOT NULL | 생성자 |
| updated_at | TIMESTAMPTZ | NOT NULL | 수정일시 |
| updated_by | UUID | NOT NULL | 수정자 |
| deleted_at | TIMESTAMPTZ | NULL | 삭제일시 (Soft Delete) |

**인덱스**: `ux_user_userAuthId` (user_auth_id, UNIQUE)

---

### TODOLIST_USER_AUTH

인증 자격 증명.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK | 인증 ID |
| login_id | VARCHAR(100) | UNIQUE, NULL | 로그인 ID (OAuth 전용 시 NULL) |
| password_hash | VARCHAR(255) | NULL | 비밀번호 해시 (OAuth 전용 시 NULL) |
| created_at ~ deleted_at | | | 감사 컬럼 (공통) |

**인덱스**: `ux_userAuth_loginId` (login_id, UNIQUE)

---

### TODOLIST_USER_AUTH_OAUTH

OAuth provider 연동 정보.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK | OAuth 연동 ID |
| user_auth_id | UUID | FK, NOT NULL | 인증 정보 참조 |
| provider | VARCHAR(100) | NOT NULL | google / naver / kakao / apple |
| provider_user_id | VARCHAR(255) | UNIQUE, NOT NULL | provider측 사용자 ID |
| provider_user_email | VARCHAR(255) | NOT NULL | provider측 이메일 |
| created_at ~ deleted_at | | | 감사 컬럼 (공통) |

**인덱스**: `idx_userAuthOauth_userAuthId` (user_auth_id)

---

### TODOLIST_USER_SESSION

로그인 세션 (Refresh Token 관리).

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK | 세션 ID |
| user_auth_id | UUID | FK, NOT NULL | 인증 정보 참조 |
| refresh_token | TEXT | UNIQUE, NOT NULL | Refresh Token |
| user_agent | TEXT | NULL | 접속 User Agent |
| ip_address | VARCHAR(45) | NULL | 접속 IP |
| expired_at | TIMESTAMPTZ | NOT NULL | 만료 시각 |
| created_at ~ deleted_at | | | 감사 컬럼 (공통) |

**인덱스**: `idx_userSession_userAuthId`, `ux_userSession_refreshToken` (UNIQUE)

---

### TODOLIST_TODO

할 일 항목.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK | 할 일 ID |
| user_id | UUID | FK, NOT NULL | 사용자 참조 |
| todo_date | DATE | NOT NULL | 할 일 날짜 |
| content | VARCHAR(255) | NOT NULL | 할 일 내용 |
| status | ENUM | NOT NULL | ACTIVE / INACTIVE / COMPLETED / CARRIED_OVER |
| created_at ~ deleted_at | | | 감사 컬럼 (공통) |

**인덱스**: `idx_todo_userId`, `idx_todo_userId_todoDate` (복합)

**상태 전이 규칙**:

```
           ┌─── COMPLETED
           │
ACTIVE ────┤
           │
           ├─── INACTIVE
           │
           └─── CARRIED_OVER (시스템 전용, 사용자 직접 설정 불가)

INACTIVE ──── ACTIVE (재활성화)

COMPLETED ─── ACTIVE (완료 취소)

CARRIED_OVER: 원본 todo의 최종 상태. 이월 시 새 todo(ACTIVE)가 생성됨.
```

---

### TODOLIST_CARRIED_OVER_HISTORY

이월 이력 추적.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK | 이력 ID |
| from_todo_id | UUID | FK, NOT NULL | 원본 할 일 |
| to_todo_id | UUID | FK, NOT NULL | 이월된 할 일 |
| created_at ~ deleted_at | | | 감사 컬럼 (공통) |

**인덱스**: `idx_carriedOverHistory_fromTodoId`, `idx_carriedOverHistory_toTodoId`

---

### TODOLIST_TODO_MEMO

할 일에 첨부된 메모.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK | 메모 ID |
| todo_id | UUID | FK, NOT NULL | 할 일 참조 |
| content | TEXT | NOT NULL | 메모 내용 |
| created_at ~ deleted_at | | | 감사 컬럼 (공통) |

**인덱스**: `idx_todoMemo_todoId`

---

### TODOLIST_NOTIFICATION_LOG

알림 발송 이력.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK | 로그 ID |
| user_id | UUID | FK, NOT NULL | 사용자 참조 |
| notification_type | ENUM | NOT NULL | PLAN / REVIEW |
| status | ENUM | NOT NULL | SUCCESS / FAIL |
| error_message | TEXT | NULL | 실패 시 에러 메시지 |
| retry_count | INT | NOT NULL, DEFAULT 0 | 재시도 횟수 |
| created_at ~ deleted_at | | | 감사 컬럼 (공통) |

**인덱스**: `idx_notificationLog_userId`

---

### TODOLIST_USER_DEVICE

사용자 디바이스 (FCM 토큰 관리).

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK | 디바이스 ID |
| user_id | UUID | FK, NOT NULL | 사용자 참조 |
| fcm_token | TEXT | UNIQUE, NOT NULL | FCM 디바이스 토큰 |
| device_type | VARCHAR(20) | NOT NULL | IOS / ANDROID |
| device_name | VARCHAR(100) | NULL | 디바이스 이름 |
| created_at ~ deleted_at | | | 감사 컬럼 (공통) |

**인덱스**: `idx_userDevice_userId`, `ux_userDevice_fcmToken` (UNIQUE)

## Validation Rules

| 엔티티 | 필드 | 규칙 |
|--------|------|------|
| TODOLIST_USER | user_name | 1~100자, 빈 문자열 불가 |
| TODOLIST_USER | plan_time | HH:mm 형식 또는 NULL |
| TODOLIST_USER | review_time | HH:mm 형식 또는 NULL |
| TODOLIST_USER | timezone | IANA 타임존 문자열 |
| TODOLIST_USER | language | BCP-47 코드 (ko-KR, en-US 등) |
| TODOLIST_TODO | content | 1~255자, 빈 문자열 불가 |
| TODOLIST_TODO | todo_date | YYYY-MM-DD 형식 |
| TODOLIST_TODO | status | ACTIVE/INACTIVE/COMPLETED/CARRIED_OVER 중 하나 |
| TODOLIST_TODO_MEMO | content | 빈 문자열 불가 |
| TODOLIST_USER_AUTH_OAUTH | provider | google/naver/kakao/apple 중 하나 |
| TODOLIST_USER_DEVICE | device_type | IOS/ANDROID 중 하나 |
