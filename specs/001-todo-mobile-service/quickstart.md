# Quickstart: Todo Mobile Service

**Branch**: `001-todo-mobile-service` | **Date**: 2026-03-26

## 사전 요구사항

- Node.js 20+ (LTS)
- npm 또는 yarn
- PostgreSQL 15+ (또는 Supabase 프로젝트)
- Expo CLI (`npx expo`)
- iOS: Xcode 15+, CocoaPods
- Android: Android Studio, JDK 17+

## 프로젝트 초기 설정

### 1. Backend 설정

```bash
cd backend
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에 다음 값 설정:
# DATABASE_URL=postgresql://user:password@host:5432/todolist
# JWT_SECRET=your-jwt-secret
# JWT_REFRESH_SECRET=your-refresh-secret
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
# NAVER_CLIENT_ID=...
# NAVER_CLIENT_SECRET=...
# KAKAO_CLIENT_ID=...
# KAKAO_CLIENT_SECRET=...
# APPLE_CLIENT_ID=...
# APPLE_TEAM_ID=...
# APPLE_KEY_ID=...
# FIREBASE_PROJECT_ID=...
# GEMINI_API_KEY=...

# DB 마이그레이션
npm run migration:run

# 개발 서버 실행
npm run start:dev
```

### 2. Frontend 설정

```bash
cd frontend
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에 다음 값 설정:
# API_BASE_URL=http://localhost:3000/v1

# 개발 서버 실행
npx expo start

# iOS 시뮬레이터
npx expo run:ios

# Android 에뮬레이터
npx expo run:android
```

## 테스트 실행

### Backend

```bash
cd backend

# 단위 테스트
npm run test

# 통합 테스트
npm run test:integration

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:cov
```

### Frontend

```bash
cd frontend

# 단위 테스트
npm run test

# E2E 테스트 (Detox)
npx detox test --configuration ios.sim.debug
```

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run start:dev` | Backend 개발 서버 (watch 모드) |
| `npm run build` | Backend 프로덕션 빌드 |
| `npm run lint` | ESLint 실행 |
| `npm run migration:generate` | TypeORM 마이그레이션 생성 |
| `npm run migration:run` | 마이그레이션 실행 |
| `npx expo start` | Frontend 개발 서버 |

## 개발 흐름

1. TDD 우선: 실패하는 테스트를 먼저 작성 (Red)
2. 최소한의 코드로 테스트 통과 (Green)
3. 리팩토링 (Refactor)
4. 계층 분리 확인: controller → application → domain → infrastructure
5. 실패 상태(loading, empty, error) 처리 확인
6. TypeScript 타입 오류 없음 확인 (`npx tsc --noEmit`)
7. 린트 통과 확인 (`npm run lint`)
