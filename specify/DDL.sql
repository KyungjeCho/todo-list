-- Table: TODOLIST_TODO, Column: status
CREATE TYPE TODOLIST_TODO_STATUS AS ENUM ('ACTIVE', 'INACTIVE', 'COMPLETED', 'CARRIED_OVER');

-- Table: TODOLIST_NOTIFICATION_LOG, Column: notification_type
CREATE TYPE TODOLIST_NOTIFICATION_LOG_NOTIFICATION_TYPE AS ENUM ('PLAN', 'REVIEW');

-- Table: TODOLIST_NOTIFICATION_LOG, Column: status
CREATE TYPE TODOLIST_NOTIFICATION_LOG_STATUS AS ENUM ('SUCCESS', 'FAIL');

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
	plan_time TIME NULL,
	review_time TIME NULL,
	timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
	language VARCHAR(10) NOT NULL
);

-- Indexes for FK role columns
CREATE UNIQUE INDEX ux_user_userAuthId ON TODOLIST_USER (user_auth_id);
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
	id UUID CONSTRAINT pkx_userAuthOauth_id PRIMARY KEY,

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
	provider_user_id VARCHAR(255) UNIQUE NOT NULL,
	provider_user_email VARCHAR(255) NOT NULL
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

CREATE TABLE TODOLIST_NOTIFICATION_LOG (
	-- 1. id
	id UUID CONSTRAINT pkx_notificationLog_id PRIMARY KEY,

	-- 2. fk
	user_id UUID NOT NULL,

	-- 3. audit
	created_at TIMESTAMPTZ NOT NULL,
	created_by UUID NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL,
	updated_by UUID NOT NULL,
	deleted_at TIMESTAMPTZ NULL,

	-- 4. status
	status TODOLIST_NOTIFICATION_LOG_STATUS NOT NULL,

	-- 5. type
	notification_type TODOLIST_NOTIFICATION_LOG_NOTIFICATION_TYPE NOT NULL,

	-- 6. business columns
	error_message TEXT NULL,
	retry_count INT NOT NULL DEFAULT 0
);

-- Indexes for FK role columns
CREATE INDEX idx_notificationLog_userId ON TODOLIST_NOTIFICATION_LOG (user_id);
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