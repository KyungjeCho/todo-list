# todo-list Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-20

## Active Technologies
- Supabase (PostgreSQL) — 디스크 수준 AES-256 암호화, 추가 앱 레벨 암호화 없음 (001-todo-mobile-service)
- TypeScript 5.x (Frontend & Backend) + React Native (Expo), react-native-gesture-handler, expo-blur, Zustand, NestJS (002-uiux-update)
- Supabase (PostgreSQL) — 기존 스키마 변경 없음 (002-uiux-update)
- TypeScript 5.x + React Native (Expo), expo-clipboard, react-native-safe-area-context (feature/003-share-button-update)
- N/A (프론트엔드 전용 변경, 백엔드/DB 변경 없음) (feature/003-share-button-update)
- TypeScript 5.x (Frontend & Backend) + React Native (Expo ~55), expo-speech-recognition (신규), NestJS v11, @google/generative-ai (004-voice-input-screen)
- Supabase (PostgreSQL) via TypeORM — 기존 Todo 테이블 재사용, 스키마 변경 없음 (004-voice-input-screen)
- TypeScript 5.x (Frontend & Backend) + i18next, react-i18next, expo-localization (신규), Intl.supportedValuesOf 타임존 API (005-i18n-timezone)
- Supabase (PostgreSQL) via TypeORM — `language` 컬럼 형식 마이그레이션 (ko-KR → ko, 기본값 en) (005-i18n-timezone)
- TypeScript 5.9 (Frontend) (feature/006-ui-button-sound)
- Supabase (PostgreSQL) via TypeORM — `TODOLIST_USER` 테이블에 `has_completed_onboarding BOOLEAN NOT NULL DEFAULT FALSE` 컬럼 추가, 기존 사용자 전원 `TRUE` 백필. (007-fix-login-notif-calendar)
- TypeScript 5.x (strict, `any` 금지) — Frontend & Backend 공통 (008-update-01-ui-fixes)
- Supabase (PostgreSQL) via TypeORM — **스키마 변경 없음**. `CarriedOverHistory`(`from_todo_id` UNIQUE) 재사용. (008-update-01-ui-fixes)
- TypeScript 5.9 (Frontend), TypeScript 5.7 (Backend) (009-security-dep-input-fix)
- Supabase (PostgreSQL) via TypeORM — 스키마 변경 없음 (009-security-dep-input-fix)
- TypeScript 5.9 (Frontend), TypeScript 5.7 (Backend) + React Native (Expo ~55), NestJS v11, Zustand, TypeORM (010-codebase-refactoring)
- Supabase (PostgreSQL) — 스키마 변경 없음 (010-codebase-refactoring)
- TypeScript 5.9 (Frontend), TypeScript 5.7 (Backend) — strict, `any` 금지 (011-apple-oauth-login)
- Supabase (PostgreSQL) via TypeORM — `todolist_user_auth_oauth` 재사용, 스키마 변경 없음 (011-apple-oauth-login)

- TypeScript 5.x (Frontend & Backend) (001-todo-mobile-service)
- React Native (Expo) — iOS/Android 크로스 플랫폼
- NestJS — Backend REST API
- TypeORM — ORM
- Supabase (PostgreSQL) — Database
- Zustand — Frontend 상태 관리
- Jest — 테스트 프레임워크
- Maestro — Frontend E2E 테스트

## Project Structure

```text
backend/
├── src/
│   ├── auth/
│   ├── user/
│   ├── todo/
│   ├── memo/
│   ├── notification/
│   ├── scheduler/
│   └── ai/
└── test/

frontend/
├── src/
│   ├── screens/
│   ├── features/
│   ├── services/
│   ├── components/
│   └── store/
└── __tests__/

.maestro/
├── auth/
├── home/
└── config.yaml
```

## Commands

```bash
# Backend
cd backend && npm test && npm run lint

# Frontend
cd frontend && npm test && npm run lint
```

## Code Style

- TypeScript strict mode, `any` 금지
- TDD 필수 (Red → Green → Refactor)
- 계층 분리: controller → application → domain → infrastructure
- 모든 UI 상태: loading, empty, error 처리 필수
- 한국어 문서, 영어 코드 식별자
- 주석: WHY 중심, 공개 API는 JSDoc/TSDoc 문서화, 코드 반복 주석 금지, 주석 처리된 코드 금지
- Frontend E2E: Maestro MCP 기반, `.maestro/` 디렉토리에 YAML 작성, Phase별 TDD 필수

## Branch Strategy

- `main`: 보호 브랜치, PR 필수 (직접 push 금지)
- `feature/*`: 새 기능 (e.g., `feature/001-todo-mobile-service`)
- `fix/*`: 버그 수정
- `hotfix/*`: 긴급 수정

## Recent Changes
- 011-apple-oauth-login: Added TypeScript 5.9 (Frontend), TypeScript 5.7 (Backend) — strict, `any` 금지
- 010-codebase-refactoring: Added TypeScript 5.9 (Frontend), TypeScript 5.7 (Backend) + React Native (Expo ~55), NestJS v11, Zustand, TypeORM
- 009-security-dep-input-fix: Added TypeScript 5.9 (Frontend), TypeScript 5.7 (Backend)

<!-- MANUAL ADDITIONS START -->

## Apple OAuth (011-apple-oauth-login)

- 신규 엔드포인트: `POST /auth/oauth/apple/callback` (form_post 전용). Apple은 GET 콜백을 사용하지 않으므로 `GET /auth/oauth/apple/callback`은 400 `APPLE_MUST_USE_FORM_POST`.
- 필수 환경 변수: `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_PATH` **또는** `APPLE_PRIVATE_KEY`, `APPLE_CALLBACK_URL`.
- `client_secret`은 `AppleClientSecretService`가 ES256 JWT로 동적 생성(55분 캐시). `id_token`은 `AppleIdTokenVerifier` + `AppleJwksService`(10분 캐시, kid 미일치 시 1회 재조회)로 검증.
- 로깅 규칙(SC-006): `APPLE_PRIVATE_KEY`, `code`, `id_token`, `Authorization` 헤더, Apple 응답 본문 전체는 절대 로깅 금지. Apple 에러 응답 본문은 선두 300자만 기록.
- i18n 에러 키: `auth.appleLoginFailed`, `auth.appleCancelled`, `auth.appleServerError` (ko/en/ja/es 4개 locale).
- 프론트 testID: Apple 버튼은 `oauth-button-apple` (Maestro E2E 전용), 기존 `login-button-apple`도 유지.

<!-- MANUAL ADDITIONS END -->
