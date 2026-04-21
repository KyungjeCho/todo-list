# Implementation Plan: 애플 기기 FCM 연동

**Branch**: `012-apple-fcm-integration` | **Date**: 2026-04-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-apple-fcm-integration/spec.md`

## Summary

iOS 기기에서 실제로 Plan/Review 푸시 알림이 도달하도록 APNs–FCM 파이프라인을 완성한다. 백엔드/프론트의 FCM 코드 뼈대(`notification` 모듈, `usePushNotification` 훅, `@react-native-firebase/messaging`)는 이미 존재하므로, 본 플랜은 **iOS 프로비저닝/엔터타이틀먼트 구성**, **APNs 인증 키 업로드**, **알림 탭 → 화면 이동(deep link) 라우팅**, 그리고 **다기기(iPhone+iPad) 공존을 가로막는 기존 `upsertDevice` 규칙 조정**을 중심으로 기존 구조를 최소 변경한다. 신규 라이브러리 도입은 없으며 DB 스키마 변경도 없다.

## Technical Context

**Language/Version**: TypeScript 5.9 (Frontend), TypeScript 5.7 (Backend) — strict, `any` 금지
**Primary Dependencies**:
- Frontend: React Native (Expo ~55), `@react-native-firebase/app` ^23, `@react-native-firebase/messaging` ^23, `@react-navigation/native-stack`
- Backend: NestJS v11, `firebase-admin` ^13, TypeORM
**Storage**: Supabase(PostgreSQL) via TypeORM — 기존 `todolist_user_device` 재사용, **스키마 변경 없음**
**Testing**: Jest (Frontend/Backend unit·integration), Maestro MCP (Frontend E2E)
**Target Platform**: iOS 15+ (Expo ~55 요구치 이상) 및 기존 Android 경로 유지
**Project Type**: Mobile + API (monorepo: `frontend/`, `backend/`)
**Performance Goals**: SC-001 — iOS 발송의 95% 이상 10초 이내 단말 도달
**Constraints**:
- iOS 시뮬레이터는 APNs 미지원 환경이 존재 → 토큰 획득 실패 시 크래시/에러 로깅 금지(조용히 스킵)
- 민감 값(FCM 토큰, `.p8`, Team ID, Key ID) 로깅 금지(토큰은 `substring(0, 8)` 프리픽스만 허용)
- Android 발송 회귀 0.5%p 이하
**Scale/Scope**: 내부 출시 베타 기준 수백~수천 MAU. 한 사용자당 활성 iOS 기기 1–2대.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

헌법(`v1.3.0`) 10개 원칙과의 정합성 점검:

| # | 원칙 | 적용 방안 | 상태 |
|---|------|-----------|------|
| I | 한국어 우선 | spec/plan/tasks 모두 한국어, 코드 식별자 영어 유지 | ✅ |
| II | 엄격한 TypeScript | `any` 금지, 외부 입력은 기존 `RegisterDeviceDto`로 검증. 새 DTO/타입 도입 시 동일 규칙 | ✅ |
| III | TDD 우선 | Phase 1 산출물의 모든 변경은 실패 테스트 → 구현. Jest 유닛(토큰 등록 규칙, 발송 경로 iOS 변경), Maestro E2E(iOS 권한/등록 흐름) 선행 작성 | ✅ |
| IV | 계층 분리 | 기존 `controller → usecase → repository/infra` 구조 유지. 프론트는 `usePushNotification`(feature) → `userApi`(service) → apiClient(infra) 그대로 | ✅ |
| V | 실패 처리/관측성 | 권한 거부, 시뮬레이터, APNs 만료, 네트워크 실패 상태 모두 처리. 토큰 프리픽스 로깅만 허용 | ✅ |
| VI | 단순성 우선 | 신규 라이브러리/추상화 없음. 기존 `notification` 모듈 재사용, 순수 config/로직 조정 | ✅ |
| VII | 명세서 중심 | 본 plan과 spec이 Single Source, `TECH_SPEC.md`/`API_SPEC.md`와 신규 필드/엔드포인트 차이 발생 시 동기화 | ✅ |
| VIII | 주석 전략 | WHY 중심, TSDoc은 공개 API에 한정. 금지 항목(코드 중복 주석·주석 처리된 코드·변경 로그 주석) 준수 | ✅ |
| IX | 브랜치 전략 | 본 기능은 `012-apple-fcm-integration`(feature/spec-kit 컨벤션). main으로 PR 필수 | ✅ |
| X | Maestro E2E | iOS 시뮬레이터 기준 `.maestro/notification/ios_permission_register.yml` 최소 1건 추가. 실제 푸시 수신은 실기기 수동 검증으로 대체(시뮬레이터 미지원). YAML은 권한 팝업 수락 → 앱 구동 → 서버 `POST /users/me/devices` 호출이 발생했음을 로그로 관찰 | ✅ |

**GATE 결과**: PASS. Complexity Tracking 기록 불필요(위반 없음).

## Project Structure

### Documentation (this feature)

```text
specs/012-apple-fcm-integration/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── register-device.md  # Phase 1 output (기존 엔드포인트 재확인)
├── checklists/
│   └── requirements.md  # /speckit.specify 단계 생성
└── tasks.md             # /speckit.tasks 생성 예정 (이 플랜에서 만들지 않음)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── notification/
│   │   ├── application/
│   │   │   ├── register-device.usecase.ts        # (수정 검토) 다기기 공존 규칙 반영
│   │   │   └── send-notification.usecase.ts      # (유지) 이미 iOS 토큰과 호환
│   │   ├── domain/
│   │   │   ├── user-device.entity.ts             # (유지) deviceType='IOS' 지원
│   │   │   └── notification-log.entity.ts        # (유지)
│   │   └── infrastructure/
│   │       ├── fcm.service.ts                    # (유지) firebase-admin 경유
│   │       └── user-device.repository.ts         # (수정) iPhone+iPad 공존을 막지 않도록 upsert 규칙 변경
│   ├── user/user.controller.ts                    # (유지) POST /users/me/devices
│   └── auth/application/logout.usecase.ts         # (유지) 로그아웃 시 기기 해제
└── test/
    └── notification/
        ├── register-device.usecase.spec.ts       # (추가) 멀티 iOS 기기 공존 테스트
        └── send-notification.ios.spec.ts          # (추가) iOS 토큰 경로 검증

frontend/
├── src/
│   ├── features/notification/
│   │   ├── usePushNotification.ts                # (수정) 권한 재평가·deviceName 전달
│   │   └── notificationTapRouter.ts               # (신규) 알림 탭 → Plan/Review 스크린 이동
│   ├── services/api/userApi.ts                   # (유지) registerDevice
│   └── app/navigation/AuthNavigator.tsx          # (수정) router에 notificationTapRouter 연결
├── app.json                                       # (수정) iOS plugins 추가 여부 재확인 — 이미 `@react-native-firebase/messaging` 등록됨
├── GoogleService-Info.plist                      # (유지) 이미 존재
└── ios/
    └── frontend/
        ├── frontend.entitlements                 # (수정) `aps-environment` 추가 — prebuild에서 생성되도록 app.json 플러그인으로 위임
        ├── Info.plist                            # (수정 검토) UIBackgroundModes에 `remote-notification` 추가 여부(본 스코프는 표준 알림만 → 미추가)
        └── AppDelegate.swift                     # (유지) FirebaseApp.configure() 이미 존재

.maestro/
└── notification/
    └── ios_permission_register.yml                # (신규) iOS 권한 허용 → 토큰 등록 호출 E2E
```

**Structure Decision**: monorepo 유지(Option 2: Web application + iOS native sub-tree under `frontend/ios/`). 본 기능은 Frontend의 iOS 네이티브 엔트리(엔터타이틀먼트)와 Backend `notification` 모듈을 함께 수정하며, 별도 신규 디렉토리를 만들지 않는다.

## Complexity Tracking

> Constitution Check에서 위반이 없으므로 비움.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| (없음) | — | — |
