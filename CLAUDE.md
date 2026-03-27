# todo-list Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-26

## Active Technologies
- Supabase (PostgreSQL) — 디스크 수준 AES-256 암호화, 추가 앱 레벨 암호화 없음 (001-todo-mobile-service)

- TypeScript 5.x (Frontend & Backend) (001-todo-mobile-service)
- React Native (Expo) — iOS/Android 크로스 플랫폼
- NestJS — Backend REST API
- TypeORM — ORM
- Supabase (PostgreSQL) — Database
- Zustand — Frontend 상태 관리
- Jest — 테스트 프레임워크

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

## Recent Changes
- 001-todo-mobile-service: Added TypeScript 5.x (Frontend & Backend)

- 001-todo-mobile-service: Todo 모바일 서비스 초기 설계

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
