# Research: Todo Mobile Service

**Branch**: `001-todo-mobile-service` | **Date**: 2026-03-26

## R-001: 프론트엔드 상태 관리 라이브러리 선택

**Decision**: Zustand
**Rationale**: React Native 환경에서 경량이며 TypeScript 친화적이다. Redux 대비 보일러플레이트가 적고, 미들웨어 없이 비동기 처리가 가능하다. 단순성 우선 원칙(VI)에 부합한다.
**Alternatives considered**:
- Redux Toolkit: 기능이 풍부하지만 이 프로젝트 규모에 과도한 복잡성
- Jotai/Recoil: 원자적 상태 관리는 이 앱의 CRUD 패턴에 부적합
- React Context: 리렌더링 최적화 부족

## R-002: ORM 선택

**Decision**: TypeORM
**Rationale**: TECH_SPEC에서 TypeORM으로 명시되어 있다. NestJS와의 공식 통합 지원이 우수하며, DDL에 정의된 PostgreSQL 스키마와 1:1 매핑이 가능하다. Entity decorator 기반으로 TypeScript 타입 안전성을 유지한다.
**Alternatives considered**:
- Prisma: 타입 안전성이 우수하나 NestJS 공식 통합 수준이 TypeORM 대비 낮음
- Drizzle: 경량이지만 생태계가 아직 성숙하지 않음

## R-003: OAuth 전략

**Decision**: Passport.js + NestJS @nestjs/passport
**Rationale**: NestJS의 공식 인증 모듈이며, Google/Naver/Kakao/Apple 각 provider별 Passport strategy가 존재한다. Guard 패턴으로 계층 분리 원칙(IV)에 부합한다.
**Alternatives considered**:
- 직접 구현: OAuth 흐름의 보안 취약점 위험이 높음
- Auth0/Firebase Auth: 외부 의존성 증가, 비용 이슈

## R-004: 푸시 알림 아키텍처

**Decision**: firebase-admin SDK + node-cron 스케줄러
**Rationale**: FCM은 iOS(APNs 프록시)와 Android를 단일 API로 처리할 수 있다. node-cron으로 사용자별 타임존 기준 알림 시점을 계산하여 발송한다. AWS Lambda 환경에서는 EventBridge Scheduler를 트리거로 사용하여 cron 작업을 실행한다.
**Alternatives considered**:
- AWS SNS: FCM 대비 모바일 푸시 설정이 복잡
- OneSignal: 추가 외부 서비스 의존

## R-005: 음성 인식(STT + LLM) 통합 전략

**Decision**: 서버사이드 처리 (클라이언트에서 오디오 파일 업로드 → 서버에서 STT API + LLM API 호출)
**Rationale**: TECH_SPEC에서 서버사이드 처리로 명시되어 있다. API 키를 클라이언트에 노출하지 않으며(보안), 프롬프트를 서버 설정으로 관리하여 배포 없이 조정 가능하다.
**Alternatives considered**:
- 클라이언트 사이드 STT: API 키 노출 위험, 프롬프트 관리 불가

## R-006: 자동 이월 처리 전략

**Decision**: 이중 전략 (서버 스케줄러 + 클라이언트 보정)
**Rationale**: 서버 스케줄러가 사용자별 타임존 자정에 자동 이월을 수행하되, 스케줄러 실패 시 앱 실행 시점에 클라이언트에서 보정 체크를 한다. TECH_SPEC에서 이 이중 전략이 명시되어 있다.
**Alternatives considered**:
- 서버 전용: 스케줄러 실패 시 이월 누락 가능
- 클라이언트 전용: 앱 미실행 시 이월 불가

## R-007: 프론트엔드 네비게이션 구조

**Decision**: React Navigation (Stack + Bottom Tab)
**Rationale**: React Native 생태계에서 사실상 표준이며, 딥링크 지원이 우수하여 OAuth 콜백(todolist://auth/callback) 처리에 적합하다.
**Alternatives considered**:
- Expo Router: 파일 기반 라우팅이 이 앱의 복잡도에 비해 과도

## R-008: Monorepo 구조 vs 분리 저장소

**Decision**: 단일 저장소 내 frontend/backend 디렉토리 분리
**Rationale**: 프로젝트 규모가 크지 않아 단일 저장소로 관리가 효율적이다. DTO 타입 공유가 용이하며, CI/CD 파이프라인도 단일 저장소에서 분기 빌드로 처리 가능하다. 단순성 우선 원칙(VI)에 부합한다.
**Alternatives considered**:
- npm workspaces/Turborepo: 현재 규모에 과도한 도구 복잡성
- 분리 저장소: 타입 공유, 버전 동기화 비용 증가

## R-009: AWS Lambda 환경에서의 NestJS 실행

**Decision**: @codegenie/serverless-express (또는 @vendia/serverless-express)
**Rationale**: NestJS 앱을 AWS Lambda에서 실행하기 위해 Express 어댑터를 Lambda 핸들러로 래핑한다. Container Image 기반 배포로 콜드 스타트를 최소화한다.
**Alternatives considered**:
- AWS SAM: NestJS 프레임워크와의 통합이 복잡
- ECS Fargate: Lambda 대비 비용이 높고, 아키텍처 다이어그램에서 Lambda로 결정됨

## R-010: 데이터 검증(Validation)

**Decision**: class-validator + class-transformer (NestJS), Zod (Frontend)
**Rationale**: NestJS에서 DTO 기반 자동 검증이 가능하며, 엄격한 TypeScript 원칙(II)의 런타임 검증 요구사항을 충족한다. Frontend에서는 Zod로 API 응답과 사용자 입력을 검증한다.
**Alternatives considered**:
- Joi: class-validator 대비 NestJS Pipe 통합이 불편
- yup: Zod 대비 TypeScript 타입 추론이 약함
