# Quickstart: Security Hardening — Dependency Upgrades & Input Validation

**Feature**: 009-security-dep-input-fix
**Date**: 2026-04-16

## 사전 조건

- Node.js 및 npm 설치
- 프로젝트 클론 완료

## 의존성 업그레이드 적용

```bash
# 1. Frontend — axios, ts-jest 업그레이드 + xmldom override
cd frontend
npm install axios@1.15.0
npm install --save-dev ts-jest@29.4.9
# package.json에 overrides 추가 후:
npm install

# 2. Backend — NestJS, ts-jest 업그레이드
cd ../backend
npm install @nestjs/core@11.1.19 @nestjs/common@11.1.19 @nestjs/platform-express@11.1.19 @nestjs/config@4.0.4
npm install --save-dev ts-jest@29.4.9
```

## 소스 코드 변경 확인

변경 파일 3개:
1. `backend/src/memo/application/dto/create-memo.dto.ts` — `@MaxLength(5000)` 추가
2. `backend/src/memo/application/dto/update-memo.dto.ts` — `@MaxLength(5000)` 추가
3. `frontend/src/services/config.ts` — 프로덕션 HTTPS 강제 검증

## 검증

```bash
# 테스트 실행
cd frontend && npm test
cd ../backend && npm test

# 보안 감사
cd frontend && npm audit
cd ../backend && npm audit

# 린트
cd frontend && npm run lint
cd ../backend && npm run lint
```

## 주의사항

- Frontend 개발 모드(`__DEV__ === true`)에서는 HTTP URL이 허용됨
- 프로덕션 빌드에서 `EXPO_PUBLIC_API_BASE_URL`이 `http://`로 시작하면 앱이 시작되지 않음
- Memo content는 5000자 초과 시 400 에러 반환
