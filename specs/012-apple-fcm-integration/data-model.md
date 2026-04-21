# Phase 1 Data Model: 애플 기기 FCM 연동

**Date**: 2026-04-21
**Branch**: `012-apple-fcm-integration`
**Scope**: 본 기능은 **스키마 변경이 없다**. 본 문서는 기존 엔티티의 역할과 본 기능 맥락에서의 불변식·상태 전이를 재정리한다.

---

## 엔티티

### UserDevice (`todolist_user_device`) — 기존, 변경 없음

| 필드 | 타입 | 제약 | 본 기능 맥락 |
|------|------|------|--------------|
| `id` | UUID | PK | — |
| `userId` | UUID | FK → `todolist_user.id` | 한 사용자 다(多) 기기 |
| `fcmToken` | text | UNIQUE (soft-delete 무시) | iOS·Android 모두 동일 컬럼 |
| `deviceType` | varchar(20) | NOT NULL | `'IOS' \| 'ANDROID'` (domain 계약) |
| `deviceName` | varchar(100) | nullable | 본 기능에서 iOS는 모델명(예: `iPhone 15`, `iPad Pro`) 채움 |
| `createdAt` / `updatedAt` / `deletedAt` | timestamptz | BaseEntity | `deletedAt`은 로그아웃·토큰 갱신 시 세팅 |

**불변식(본 기능 추가)**:

- `deviceType='IOS'` 레코드의 `deviceName`은 **가능한 한 채워진 상태를 유지**한다. 프론트가 모델명을 얻지 못한 경우에 한해 null 허용(기존 동작 유지).
- 동일 `(userId, deviceType='IOS', deviceName)` 조합은 활성 상태에서 최대 1개(= fcm_token 갱신 시 soft-delete + 신규 삽입).
- **다른** `(deviceName)` 조합은 공존 가능(예: iPhone + iPad).

### NotificationLog (`todolist_notification_log`) — 기존, 변경 없음

| 필드 | 타입 | 본 기능 맥락 |
|------|------|--------------|
| `userId` | UUID | 대상 사용자 |
| `notificationType` | enum | `'PLAN' \| 'REVIEW'` (iOS도 동일 타입) |
| `status` | enum | `'SUCCESS' \| 'FAIL'` |
| `retryCount` | smallint | 최대 3 (`MAX_RETRY`) |
| `errorMessage` | text | FAIL 시 마지막 에러 메시지 |

**불변식**: iOS 발송도 Android와 동일 로그 포맷을 따른다. 본 기능이 iOS 전용 필드를 추가하지 않음.

---

## 상태 전이

### 단일 기기 토큰 라이프사이클 (iOS)

```text
[미등록]
   │ 권한 허용 + getToken 성공
   ▼
[활성: deletedAt=null] ─── 토큰 갱신(onTokenRefresh) ──▶ upsertDevice
   │                                                    │ (동일 deviceName은 soft-delete,
   │                                                    │  새 fcmToken 행 생성)
   │ 사용자 로그아웃 (/auth/logout)                       ▼
   ▼                                              [활성 신규 토큰]
[soft-deleted: deletedAt≠null]
   │ 동일 토큰 재로그인
   ▼
[활성 복원]
   │ 발송 시 PERMANENT_FAILURE_CODES 수신
   ▼
[soft-deleted: deleteByFcmToken]
```

### 다기기(예: iPhone + iPad) 전이

```text
Step 1: iPhone 로그인 → (userId=U, deviceType='IOS', deviceName='iPhone 15', token=T1) 활성
Step 2: iPad 로그인   → (userId=U, deviceType='IOS', deviceName='iPad Pro',  token=T2) 활성
                       [기존 규칙과 달리 T1은 soft-delete되지 않음 — R-004 결정]
Step 3: iPhone 재설치 → (userId=U, deviceType='IOS', deviceName='iPhone 15', token=T3)
                       기존 T1 행(동일 deviceName) soft-delete, T3 활성
                       T2(iPad)은 그대로 유지
```

### 권한 거부·시뮬레이터(토큰 미획득) 경로

```text
[미등록]
   │ 권한 거부 또는 getToken 실패
   ▼
[미등록 유지] ── 앱 재실행마다 권한·토큰 재평가 ──▶ 성공 시 [활성]
                  (실패 시 조용히 스킵, 로그 프리픽스만)
```

---

## 계약 필드 매핑 요약

| 계층 | 필드/식별자 | 비고 |
|------|-------------|------|
| FE `usePushNotification` | `fcmToken`, `deviceType`, `deviceName` | `deviceName` 신규로 전달(R-004) |
| FE `userApi.registerDevice` | `{ fcmToken, deviceType, deviceName? }` | DTO 시그니처 유지, 기존 선택 필드 활용 |
| BE `RegisterDeviceDto` | `{ fcmToken, deviceType, deviceName? }` | 변경 없음(이미 선택 필드로 존재) |
| BE `UserDeviceRepository.upsertDevice` | 입력에 `deviceName` 사용 | soft-delete WHERE에 `device_name` 추가 |

---

## 검증 규칙(요청 경계)

- `fcmToken`: 비어 있지 않은 문자열. 기존 DTO 유지.
- `deviceType`: `'IOS' | 'ANDROID'` enum. 본 기능에서 `'IOS'` 흐름을 실사용 경로로 활성화.
- `deviceName`: 1–100자 문자열 또는 생략. 프론트는 모델명 미수집 시 생략(기존 동작 유지).
