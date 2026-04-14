# todo-list Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-13

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
- feature/006-ui-button-sound: Added TypeScript 5.9 (Frontend)
- 005-i18n-timezone: Added i18next/react-i18next, expo-localization, 4개 언어(ko/en/ja/es) 지원, 전 세계 IANA 타임존 선택, STT 언어 연동, Gemini refine 언어별 프롬프트
- 004-voice-input-screen: Added TypeScript 5.x (Frontend & Backend) + React Native (Expo ~55), expo-speech-recognition (신규), NestJS v11, @google/generative-ai

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
