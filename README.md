# Todo List

Plan, Do, Review 루틴 기반의 할 일 관리 모바일 앱.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native (Expo), TypeScript, Zustand |
| Backend | NestJS, TypeORM, TypeScript |
| Database | Supabase (PostgreSQL) |
| Test | Jest, Detox (E2E) |

## Features

- OAuth 소셜 로그인 (Google, Kakao, Naver, Apple)
- 할 일 CRUD + 상태 관리 (Active / Completed / Inactive)
- Plan / Review 모드 자동 전환
- 하루 회고 및 미완료 항목 자동 이월
- 푸시 알림 (FCM)
- 메모 첨부
- 음성 인식 할 일 추가 (STT + LLM)
- 캘린더 월별 요약
- TodoList SNS 공유

## Getting Started

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run start:dev

# Frontend
cd frontend
cp .env.example .env
npm install
npx expo start
```

## Scripts

```bash
# Backend
cd backend && npm test        # unit + integration tests
cd backend && npm run lint    # ESLint

# Frontend
cd frontend && npm test       # unit tests
cd frontend && npm run lint   # ESLint
```

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready (PR 필수) |
| `feature/*` | 새 기능 개발 |
| `fix/*` | 버그 수정 |
| `hotfix/*` | 긴급 수정 |

## Project Structure

```
backend/
├── src/
│   ├── auth/           # OAuth 인증
│   ├── user/           # 사용자 프로필/설정
│   ├── todo/           # 할 일 CRUD, 이월, 캘린더
│   ├── memo/           # 메모 첨부
│   ├── notification/   # FCM 푸시 알림
│   ├── scheduler/      # 자동 이월, 알림 스케줄러
│   └── ai/             # STT, LLM 음성 인식
└── test/

frontend/
├── src/
│   ├── screens/        # 화면 (Login, Main, Calendar, Settings)
│   ├── features/       # 비즈니스 훅 (auth, notification, share)
│   ├── services/       # API 클라이언트
│   ├── components/     # 재사용 UI 컴포넌트
│   └── store/          # Zustand 상태 관리
└── __tests__/
```

## License

Private
