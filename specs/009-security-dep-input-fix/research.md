# Research: Security Hardening — Dependency Upgrades & Input Validation

**Feature**: 009-security-dep-input-fix
**Date**: 2026-04-16

## 1. axios Header Injection (CVSS 10.0)

**Decision**: axios `1.13.6` → `1.15.0` 업그레이드

**Rationale**: axios 1.13.x에서 HTTP 헤더에 CRLF 문자를 주입할 수 있는 취약점이 존재한다. 이를 통해 공격자가 Cloud Metadata 엔드포인트에 접근(SSRF)하거나 임의 헤더를 삽입할 수 있다. 1.15.0에서 헤더 값 검증이 강화되어 해결됨.

**Alternatives considered**:
- fetch API 직접 사용: 기존 axios interceptor/config 전체 재작성 필요 — 비용 대비 효과 낮음
- 헤더 sanitization 미들웨어 자체 구현: 라이브러리 업그레이드가 더 안전하고 간단

## 2. NestJS Injection / Prototype Pollution / ReDoS (HIGH)

**Decision**: @nestjs/core, @nestjs/common, @nestjs/platform-express `11.1.19`, @nestjs/config `4.0.4` 업그레이드

**Rationale**:
- core 11.1.17에 Injection 취약점 존재 — 11.1.19에서 수정
- config 4.0.3이 의존하는 lodash에 Prototype Pollution 취약점 — 4.0.4에서 lodash 업데이트
- core가 의존하는 path-to-regexp에 ReDoS 취약점 — 11.1.19에서 해결
- picomatch 취약점도 동시 해결

**Alternatives considered**:
- lodash 개별 override: config 패키지 자체 업그레이드가 더 깔끔
- path-to-regexp override: core 업그레이드로 자연 해결

## 3. ts-jest → handlebars (CRITICAL, 실질 위험 낮음)

**Decision**: ts-jest `29.4.6`/`29.2.5` → `29.4.9` (양측)

**Rationale**: ts-jest가 의존하는 handlebars 4.7.8에 JavaScript Injection, Prototype Pollution, DoS 취약점이 있다. devDependency이므로 프로덕션 번들에 포함되지 않아 실질 위험은 낮지만, `npm audit` 경고 정리와 CI 파이프라인 보안 정책 준수를 위해 업그레이드한다.

**Alternatives considered**:
- handlebars overrides: ts-jest 업그레이드가 근본 해결이며 다른 개선도 포함
- 무시(audit ignore): 감사 경고가 계속 노출되어 실제 취약점 발견 시 놓칠 수 있음

## 4. @xmldom/xmldom XML Injection (HIGH, CVSS 7.5, 실질 위험 낮음)

**Decision**: frontend/package.json에 `"overrides": { "@xmldom/xmldom": "0.8.12" }` 추가

**Rationale**: expo가 의존하는 @xmldom/xmldom 0.8.11에 CDATA serialization을 통한 XML Injection 취약점이 존재한다. 빌드 시 plist 처리에만 사용되어 실질 위험은 낮지만, overrides로 간단히 해결 가능하다. expo가 직접 업데이트하지 않는 transitive dependency이므로 overrides가 유일한 방법이다.

**Alternatives considered**:
- expo 업그레이드 대기: 시점 불확실, overrides로 즉시 해결 가능
- 무시: 감사 경고 정리 목적상 해결이 바람직

## 5. Memo MaxLength 검증 전략

**Decision**: class-validator의 `@MaxLength(5000)` 데코레이터 사용

**Rationale**: 프로젝트가 이미 class-validator를 사용하고 있으며(`@IsString()`, `@IsNotEmpty()`), NestJS의 ValidationPipe이 자동으로 처리한다. 추가 라이브러리 없이 1줄 추가로 구현 가능. 5000자 제한은 일반적인 메모 사용 패턴에 충분하며, DB 레벨 제약은 이번 스코프에서 제외한다 (TypeORM `text` 타입 유지).

**Alternatives considered**:
- DB 컬럼 타입 변경 (text → varchar(5000)): 마이그레이션 필요, 스코프 초과
- 커스텀 Pipe: class-validator 데코레이터가 더 간단하고 선언적

## 6. HTTPS 강제 검증 전략

**Decision**: `frontend/src/services/config.ts`에서 `__DEV__` 가드를 사용한 런타임 검증

**Rationale**: React Native/Expo에서 `__DEV__`는 개발 빌드에서 `true`, 프로덕션 빌드에서 `false`인 전역 상수이다. 빌드 타임에 dead code elimination이 적용되므로 프로덕션 번들 크기에 영향 없음. 앱 초기화 시 config 모듈이 로드되는 시점에 즉시 에러를 던져 HTTP 사용을 차단한다.

**Alternatives considered**:
- 빌드 스크립트에서 환경변수 검증: 런타임 가드가 더 확실 (빌드 환경과 실행 환경이 다를 수 있음)
- 네트워크 레이어 interceptor: config 레벨에서 차단이 더 이른 시점에 발견 가능

## NEEDS CLARIFICATION 항목

없음 — 모든 결정 사항이 spec과 기존 코드베이스에서 도출됨.
