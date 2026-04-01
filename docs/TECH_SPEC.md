> **문서 버전:** v1.1
**작성일:** 2026-03-24
**상태:** Draft
> 

---

## 1. 요약

TodoList는 "계획 → 실행 → 회고" 루틴 기반의 Todo 일정 관리 앱이다. 사용자는 하나의 메인 페이지에서 시간대에 따라 Plan/Review 모드가 전환되며, 할 일 관리, 음성 인식 추가(Gemini Flash AI), 자동 이월, 캘린더 페이지, 공유 기능을 사용할 수 있다.

프론트엔드는 React Native로 iOS/Android를 동시 지원하고, 백엔드는 Node.js TypeScript(NestJS) 기반 REST API 서버로 구성한다. 데이터는 서버 DB 중심으로 구현한다.

---

## 2. 배경

기존 Todo 앱은 단순 체크리스트에 그쳐 사용자가 하루를 의식적으로 설계하고 돌아보는 루틴을 형성하기 어렵다. TodoList는 Daily Scrum의 흐름에서 착안하여 개인 일정 관리에 계획-실행-회고 루틴을 적용한다.

이 테크 스펙은 PRD에 정의된 17개 기능적 요구사항(FR-01 ~ FR-17)과 7개 비기능적 요구사항(NFR-01 ~ NFR-06)을 기술적으로 구현하기 위한 설계를 다룬다.

---

## 3. 목표

- React Native + Node.js/NestJS 아키텍처로 iOS/Android 크로스 플랫폼 앱과 REST API 서버를 구축한다.
- P0 기능(할 일 CRUD, 시간대별 모드 전환, 회고 모드, 자동 이월, 알림, 온보딩)을 우선 구현하여 MVP를 완성한다.
- Gemini Flash 멀티모달 API를 활용한 음성 인식 할 일 추가 기능을 구현한다.
- 외부 Auth를 통해 인증 기능을 구현한다.
- FCM/APNs 기반 푸시 알림으로 사용자의 계획/회고 루틴을 유도한다.
- 확장 가능한 API 설계로 P1(캘린더 페이지, 메모, 음성 인식) 및 P2(공유) 기능을 점진적으로 추가할 수 있도록 한다.

---

## 4. 목표가 아닌 것

- **실시간 협업**: 일정 공유는 읽기 전용 단방향 공유이며, 실시간 공동 편집이나 팀 기능은 포함하지 않는다.
- **외부 캘린더 연동**: 이번 스펙에서 외부 캘린더(Google, Apple) 연동은 포함하지 않는다. 캘린더 페이지는 앱 내 할 일만 표시한다.
- **세밀한 권한 관리**: 관리자/일반 사용자 등 역할 기반 권한 체계는 다루지 않는다.

---

## 5. 계획

### 5.1 Sequence Diagram

![CRUD.png](attachment:64b2b4bc-ac3f-482b-9ecc-76ccb5b840f6:CRUD.png)

사용자의 CRUD Sequence.

![SignUpWithSocialLogIn.png](attachment:22ad39c5-ed7c-42df-8ef6-3c86b57923df:SignUpWithSocialLogIn.png)

사용자의 OAuth2.0 소셜 로그인 Sequence.

![Alarm.png](attachment:fba9f3fa-e96c-4976-83c9-21dcb06b6c63:Alarm.png)

사용자의 Alarm 기능 Sequence.

![mike.png](attachment:e77dbd5a-9b61-4e7a-a976-c2216cd0ef63:mike.png)

사용자의 음성인식 및 Gemini 변환 기능 Sequence.

![Share.png](attachment:1b30e03b-6548-4543-8ce5-01d4d9029374:Share.png)

사용자의 공유 기능 Sequence.

![이월.png](attachment:c0ed0104-4ac7-4d4e-8ecc-06c080e4d2b5:이월.png)

사용자의 이월 기능 Sequence Diagram.

### 5.2 Component Diagram

![image.png](attachment:867be1c3-7062-4dc4-88b1-f83a168d9a16:image.png)

### 5.3 Architecture Diagram

![architexture.png](attachment:7fa77f7e-9370-4519-8be7-7bd68ba663c1:architexture.png)

### 5.4 DDL

```sql
-- Table: TODOLIST_TODO, Column: status
CREATE TYPE TODOLIST_TODO_STATUS AS ENUM ('ACTIVE', 'INACTIVE', 'COMPLETED', 'CARRIED_OVER');

-- Table: TODOLIST_ALARM_LOG, Column: ALARAM_TYPE
CREATE TYPE TODOLIST_ALARM_LOG_ALARM_TYPE AS ENUM ('PLAN', 'REVIEW');

-- Table: TODOLIST_ALARM_LOG, Column: ALARAM_TYPE
CREATE TYPE TODOLIST_ALARM_LOG_STATUS AS ENUM ('SUCESS', 'FAIL');

CREATE TABLE TODOLIST_USER (
	-- 1. id
	id UUID CONSTRAINT pkx_user_id PRIMARY KEY,

	-- 2. fk
	user_auth_id UUID NOT NULL,
	
	-- 3. audit
	created_at TIMESTAMPTZ NOT NULL,
	created_by UUID NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL,
	updated_by UUID NOT NULL,
	deleted_at TIMESTAMPTZ NULL,

	-- 4. status

	-- 5. type

	-- 6. business columns
	user_name VARCHAR(100) NOT NULL,
	plan_time TIME NOT NULL,
	review_time TIME NOT NULL,
	timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
	language VARCHAR(10) NOT NULL
);

-- Indexes for FK role columns
CREATE INDEX idx_user_userAuthId ON TODOLIST_USER (user_auth_id);
--

CREATE TABLE TODOLIST_USER_AUTH (
	-- 1. id
	id UUID CONSTRAINT pkx_userAuth_id PRIMARY KEY,

	-- 2. fk
	
	-- 3. audit
	created_at TIMESTAMPTZ NOT NULL,
	created_by UUID NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL,
	updated_by UUID NOT NULL,
	deleted_at TIMESTAMPTZ NULL,

	-- 4. status

	-- 5. type

	-- 6. business columns
	login_id VARCHAR(100) NULL,
	password_hash VARCHAR(255) NULL
);

-- Indexes for FK role columns
CREATE UNIQUE INDEX ux_userAuth_loginId ON TODOLIST_USER_AUTH (login_id);
--

CREATE TABLE TODOLIST_USER_AUTH_OAUTH (
	-- 1. id
	id UUID CONSTRAINT pkx_accountAuthOauth_id PRIMARY KEY,

	-- 2. fk
	user_auth_id UUID NOT NULL,
	
	-- 3. audit
	created_at TIMESTAMPTZ NOT NULL,
	created_by UUID NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL,
	updated_by UUID NOT NULL,
	deleted_at TIMESTAMPTZ NULL,

	-- 4. status

	-- 5. type

	-- 6. business columns
	provider VARCHAR(100) NOT NULL,
	provider_user_id VARCHAR(255) UNIQUE NOT NULL
);

-- Indexes for FK role columns
CREATE INDEX idx_userAuthOauth_userAuthId ON TODOLIST_USER_AUTH_OAUTH (user_auth_id);
--

CREATE TABLE TODOLIST_USER_SESSION (
	-- 1. id
	id UUID CONSTRAINT pkx_userSession_id PRIMARY KEY,

	-- 2. fk
	user_auth_id UUID NOT NULL,
	
	-- 3. audit
	created_at TIMESTAMPTZ NOT NULL,
	created_by UUID NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL,
	updated_by UUID NOT NULL,
	deleted_at TIMESTAMPTZ NULL,

	-- 4. status

	-- 5. type

	-- 6. business columns
	refresh_token TEXT NOT NULL,
	user_agent TEXT,
	ip_address VARCHAR(45),
	expired_at TIMESTAMPTZ NOT NULL
);

-- Indexes for FK role columns
CREATE INDEX idx_userSession_userAuthId ON TODOLIST_USER_SESSION (user_auth_id);
CREATE UNIQUE INDEX ux_userSession_refreshToken ON TODOLIST_USER_SESSION (refresh_token);
--

CREATE TABLE TODOLIST_TODO (
	-- 1. id
	id UUID CONSTRAINT pkx_todo_id PRIMARY KEY,

	-- 2. fk
	user_id UUID NOT NULL,
	
	-- 3. audit
	created_at TIMESTAMPTZ NOT NULL,
	created_by UUID NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL,
	updated_by UUID NOT NULL,
	deleted_at TIMESTAMPTZ NULL,

	-- 4. status
	status TODOLIST_TODO_STATUS NOT NULL,
	
	-- 5. type
	
	-- 6. business columns
	todo_date DATE NOT NULL,
	content VARCHAR(255) NOT NULL
);

-- Indexes for FK role columns
CREATE INDEX idx_todo_userId ON TODOLIST_TODO (user_id);
CREATE INDEX idx_todo_userId_todoDate ON TODOLIST_TODO (user_id, todo_date);
--

CREATE TABLE TODOLIST_CARRIED_OVER_HISTORY (
	-- 1. id
	id UUID CONSTRAINT pkx_carriedOverHistory_id PRIMARY KEY,

	-- 2. fk
	from_todo_id UUID NOT NULL,
	to_todo_id UUID NOT NULL,

	-- 3. audit
	created_at TIMESTAMPTZ NOT NULL,
	created_by UUID NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL,
	updated_by UUID NOT NULL,
	deleted_at TIMESTAMPTZ NULL,

	-- 4. status
	
	-- 5. type
	
	-- 6. business columns
);

-- Indexes for FK role columns
CREATE INDEX idx_carriedOverHistory_fromTodoId ON TODOLIST_CARRIED_OVER_HISTORY (from_todo_id);
CREATE INDEX idx_carriedOverHistory_toTodoId ON TODOLIST_CARRIED_OVER_HISTORY (to_todo_id);
--

CREATE TABLE TODOLIST_TODO_MEMO (
	-- 1. id
	id UUID CONSTRAINT pkx_todoMemo_id PRIMARY KEY,

	-- 2. fk
	todo_id UUID NOT NULL,
	
	-- 3. audit
	created_at TIMESTAMPTZ NOT NULL,
	created_by UUID NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL,
	updated_by UUID NOT NULL,
	deleted_at TIMESTAMPTZ NULL,

	-- 4. status
	
	-- 5. type
	
	-- 6. business columns
	content TEXT NOT NULL
);

-- Indexes for FK role columns
CREATE INDEX idx_todoMemo_todoId ON TODOLIST_TODO_MEMO (todo_id);
--

CREATE TABLE TODOLIST_ALARM_LOG (
	-- 1. id
	id UUID CONSTRAINT pkx_alarmLog_id PRIMARY KEY,

	-- 2. fk
	user_id UUID NOT NULL,
	
	-- 3. audit
	created_at TIMESTAMPTZ NOT NULL,
	created_by UUID NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL,
	updated_by UUID NOT NULL,
	deleted_at TIMESTAMPTZ NULL,

	-- 4. status
	status TODOLIST_ALARM_LOG_STATUS NOT NULL,
	
	-- 5. type
	alarm_type TODOLIST_ALARM_LOG_ALRAM_TYPE NOT NULL,
	
	-- 6. business columns
	error_message TEXT NOT NULL,
	retry_count INT NOT NULL DEFAULT 0
);

-- Indexes for FK role columns
CREATE INDEX idx_alarmLog_userId ON TODOLIST_ALARM_LOG (user_id);
--

CREATE TABLE TODOLIST_USER_DEVICE (
	-- 1. id
	id UUID CONSTRAINT pkx_userDevice_id PRIMARY KEY,

	-- 2. fk
	user_id UUID NOT NULL,

	-- 3. audit
	created_at TIMESTAMPTZ NOT NULL,
	created_by UUID NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL,
	updated_by UUID NOT NULL,
	deleted_at TIMESTAMPTZ NULL,

	-- 4. status

	-- 5. type

	-- 6. business columns
	fcm_token TEXT NOT NULL,
	device_type VARCHAR(20) NOT NULL,
	device_name VARCHAR(100) NULL
);

-- Indexes for FK role columns
CREATE INDEX idx_userDevice_userId ON TODOLIST_USER_DEVICE (user_id);
CREATE UNIQUE INDEX ux_userDevice_fcmToken ON TODOLIST_USER_DEVICE (fcm_token);
--
```

## 5.4 클라이언트 주요 설계

### 5.4.1 시간대별 모드 전환 (FR-01)

```
앱 실행 시:
1. 서버에서 사용자의 planTime, reviewTime 조회
2. 현재 시간과 비교하여 모드 결정
   - reviewTime이 NULL → Plan 모드 고정 (수동 전환 가능)
   - reviewTime 이전 → Plan 모드 (할 일 추가/수정/체크 모두 가능)
   - reviewTime 이후 → Review 모드
3. 상단에 모드 수동 전환 토글 제공
```

### 5.4.2 제스처 인터랙션

| 제스처 | 동작 | 관련 FR |
| --- | --- | --- |
| 탭 | 할 일 내용 수정 모드 진입, 다른 영역 탭 시 자동 저장 | FR-04 |
| 더블 탭 | 비활성화 (취소선 토글) | FR-05 |
| 길게 누르기 + 드래그 | 하단 휴지통 UI 표시, 드래그하여 삭제 | FR-06 |
| 체크박스 탭 | 완료/미완료 토글 | FR-08 |

### 5.4.3 음성 인식 흐름 (FR-03)

```
Gemini Flash API (멀티모달)

1. 사용자가 마이크 버튼 탭
2. 음성 녹음
3. 녹음 데이터 서버 POST 로 전송
4. 서버에서 Gemini Flash API로 음성→텍스트 변환+다듬기 통합 처리
5. 다듬어진 할 일이 목록에 추가
6. 네트워크 오류 시: "네트워크 오류 안내"
```

### 5.5 푸시 알림 설계 (FR-07)

```
1. 사용자가 planTime/reviewTime 설정 (선택 사항, NULL 허용)
2. 서버에 시간 저장 → 스케줄러(node-cron)가 사용자별 타임존 기준으로 알림 발송 시점 계산
3. planTime이 NULL → 계획 알림 미발송
4. reviewTime이 NULL → 회고 알림 미발송
5. 해당 시점에 FCM(Android) / APNs(iOS) 통해 푸시 발송
6. 알림 탭 시 앱 실행 → 해당 모드(Plan/Review)로 진입
```

---

## 6. 이외 고려 사항들

### 6.1 보안

- 인증: Google OAuth 2.0 / Apple Sign-In으로 소셜 로그인 처리, 서버에서 ID 토큰 검증 후 JWT(Access Token + Refresh Token) 발급
- 전송: TLS 1.3 적용
- 저장: DB 내 민감 데이터(토큰 등) AES-256 암호화
- API: Rate Limiting 적용하여 악용 방지
- Gemini API 키는 서버에서만 관리, 클라이언트에 노출하지 않음

### 6.2 타임존 처리

- 사용자 가입 시 기기 타임존을 서버에 저장
- 모든 날짜/시간 데이터는 서버에서 UTC로 저장, 클라이언트에서 로컬 타임존으로 변환하여 표시
- 자동 이월 스케줄러는 사용자별 타임존 기준 자정에 실행

### 6.3 성능

- 할 일 목록 조회 API 응답 시간 200ms 이내 목표
- 앱 실행 후 메인 화면 로딩 2초 이내 (NFR-01)
- 음성 인식 → Gemini 변환+다듬기 → 응답 전체 3초 이내 목표

### 6.4 AI/Gemini 관련

- Gemini Flash 멀티모달 API로 음성→텍스트 변환+다듬기를 단일 호출로 처리
- 프롬프트는 서버 설정으로 관리하여 배포 없이 조정 가능
- 사용량 모니터링: 사용자별 일일 음성 추가 횟수 로깅

### 6.5 에러 처리

- API 에러 응답 시 사용자에게 토스트 메시지로 안내
- 자동 이월 스케줄러 실패 시 앱 실행 시점에 클라이언트에서 보정 체크
- Gemini API 타임아웃(5초) 초과 시 토스트 메시지로 안내

### 6.6 테스트 전략

- 단위 테스트: 이월 로직, 모드 전환 로직, 상태 변환, Gemini 프롬프트 처리 등 핵심 비즈니스 로직 대상
- 통합 테스트: API 엔드포인트별 요청/응답 검증
- E2E 테스트: 온보딩 → 할 일 추가 → 음성 추가 → 완료 → 회고 → 이월 전체 흐름

---

## 7. 마일스톤

| 마일스톤 | 범위 | 포함 FR |
| --- | --- | --- |
| M1: 기반 구축 | 프로젝트 셋업, 인증, DB 스키마, CI/CD 파이프라인 | 인증 API |
| M2: 핵심 루틴 | 할 일 CRUD, 모드 전환, 회고 모드, 오늘의 일정 완료, 자동 이월 | FR-01, FR-02, FR-04 ~ FR-06, FR-08, FR-10 ~ FR-13 |
| M3: 온보딩 & 알림 | 온보딩 플로우, 루틴 시간 설정/변경, 푸시 알림 | FR-07, FR-16, FR-17 |
| M4: 확장 기능 | 음성 인식, 메모, 캘린더 페이지 | FR-03, FR-09, FR-14 |
| M5: 공유 | TodoList 공유 기능 | FR-15 |

> **각 마일스톤의 구체적인 일정은 TBD**
>