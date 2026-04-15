# Implementation Plan: 업데이트 묶음 01 (008-update-01-ui-fixes)

**Branch**: `008-update-01-ui-fixes` | **Date**: 2026-04-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/008-update-01-ui-fixes/spec.md`

## Summary

네 건의 독립 개선을 하나의 묶음으로 구현한다.

1. **이월 동작 변경 (P1)**: 자정 이월 시 어제 원본 todo의 status를 `CARRIED_OVER`로 전이하던 동작을 제거하고, 어제 원본은 원래 상태(`ACTIVE/INACTIVE/COMPLETED`)를 그대로 유지한다. `CarriedOverHistory`를 통한 중복 방지 로직과 오늘자 새 todo 생성 로직은 그대로 유지한다.
2. **'계획알림' 아이콘 동기화 (P2)**: 설정 화면/알림 영역의 '계획알림' 아이콘이 현재 `planNotificationEnabled` 값에 즉시 반응하도록 단일 셀렉터 기반 렌더링으로 정리하고, 저장 실패 시 롤백한다.
3. **로그인/온보딩 비주얼 (P3)**: `expo-linear-gradient` 기반 배경 그라데이션과 OAuth 제공자별 브랜드 아이콘 이미지를 `LoginScreen`, `OnboardingScreen`에 적용한다.
4. **타임존 라벨 (P3)**: `frontend/src/i18n/timezones.ts`에 IANA → 국가명·도시명 매핑 레이어를 추가하고, 저장은 IANA 원본을 유지한다. 우선 한국(`Asia/Seoul`)·일본(`Asia/Tokyo`)을 포함하고 다른 국가는 동일 규칙으로 확장 가능한 구조로 설계한다.

공통 기술 전략: **프론트엔드만 변경되는 항목(2·3·4)** 과 **백엔드 + 프론트 공통 변경 항목(1)** 을 분리해 PR을 쪼갤 수 있게 한다. DB 스키마는 **변경하지 않는다**(기존 `todolist_todo`, `todolist_carried_over_history` 재사용).

## Technical Context

**Language/Version**: TypeScript 5.x (strict, `any` 금지) — Frontend & Backend 공통
**Primary Dependencies**:
- Frontend: React Native (Expo ~55), Zustand, i18next/react-i18next, expo-localization, `expo-linear-gradient`(신규, 또는 `react-native-linear-gradient`)
- Backend: NestJS v11, TypeORM, `@nestjs/schedule`
**Storage**: Supabase (PostgreSQL) via TypeORM — **스키마 변경 없음**. `CarriedOverHistory`(`from_todo_id` UNIQUE) 재사용.
**Testing**:
- Backend: Jest unit + integration (`backend/test/unit`, `backend/test/integration`)
- Frontend: Jest + React Native Testing Library (`frontend/__tests__/unit`)
- E2E: Maestro MCP + 안드로이드 에뮬레이터 (`.maestro/*.yml`)
**Target Platform**: Android/iOS (Expo), Node.js 서버
**Project Type**: Mobile + API (모노레포 — `frontend/`, `backend/`)
**Performance Goals**:
- '계획알림' 아이콘 상태 갱신 ≤ 1초 (SC-003)
- 이월 루틴 재실행 시 동일 항목 중복 생성 0건 (SC-002)
- 로그인/온보딩 화면 그라데이션 첫 프레임 이내 렌더링(지연 없음)
**Constraints**:
- DB 마이그레이션 없음
- 기존 IANA 타임존 저장 포맷 호환 유지 (FR-014)
- 다크 모드 가독성 유지 (FR-011)
- 국가명·도시명 모두 영어 고정(소스 상수, i18n 리소스 추가 없음). 매핑 없는 IANA는 원문 폴백 (FR-013)
**Scale/Scope**:
- 영향 화면: `LoginScreen`, `OnboardingScreen`, `SettingsScreen`, `TimezoneSelectScreen`, 어제 조회(`DayDetailView`, `ReviewModeView`)
- 백엔드: `CarryoverSchedulerUsecase` + 관련 테스트

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 게이트 | 판정 | 근거 |
|------|--------|------|------|
| I. 한국어 우선 | spec/plan/tasks/코드리뷰 한국어 | ✅ PASS | 본 plan·spec 모두 한국어 작성, 코드 식별자는 영어 유지 |
| II. 엄격한 TypeScript | `any` 금지 + 런타임 검증 | ✅ PASS | DTO 변경 없음, 신규 코드도 strict 준수 |
| III. TDD (NON-NEGOTIABLE) | Red → Green → Refactor | ✅ PASS | 각 US마다 실패 테스트 선행 작성(연구 문서에 세부 플랜) |
| IV. 계층 분리 | screen→feature→service / controller→usecase→domain→infra | ✅ PASS | 이월 변경은 usecase 레이어 수정만, UI 로직은 screen/feature 분리 유지 |
| V. 실패 처리·관측성 | loading/empty/error + 로그 | ✅ PASS | '계획알림' 저장 실패 롤백(FR-007), OAuth 아이콘 로드 실패 폴백(FR-010), 이월 실패 로깅은 기존 서비스 그대로 |
| VI. 단순성 | 추상화 억제 | ✅ PASS | 신규 의존성 최소(`expo-linear-gradient` 1종), 새 테이블/도메인 미도입 |
| VII. 명세서 중심 | PRD/TECH_SPEC/API_SPEC 참조 | ✅ PASS | 기존 API 계약 변경 없음, 본 plan에서 문서 싱크 포인트 명시 |
| VIII. 주석 전략 | WHY 중심 | ✅ PASS | 코드 주석은 WHY, 공개 API는 TSDoc (가이드라인 준수) |
| IX. 브랜치 전략 | feature/fix PR 필수 | ✅ PASS | 현재 브랜치 `008-update-01-ui-fixes`는 `feature/*` 명명 규칙의 숫자 프리픽스 변형(기존 repo 관행 `007-...`과 일치). main 직접 push 없음 |
| X. Maestro E2E | `.maestro/*.yml` 필수 | ✅ PASS | US2·US3·US4 각각 전용 flow 추가(`plan-reminder-icon.yml`, `login-visual.yml`, `timezone-label.yml`). US1은 백엔드 usecase 테스트 + `day-detail.yml` 확장 |

**결과**: 모든 게이트 통과. Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/008-update-01-ui-fixes/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (변경 없음 확인 문서)
│   └── no-api-change.md
├── checklists/
│   └── requirements.md  # 이미 작성됨
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

Mobile + API 구조. 변경 파일을 중심으로 표기한다.

```text
backend/
├── src/
│   ├── scheduler/
│   │   ├── application/
│   │   │   └── carryover-scheduler.usecase.ts   # (수정) 어제 status 전이 제거
│   │   └── carryover-scheduler.service.ts        # (유지)
│   └── todo/
│       ├── application/
│       │   └── get-todos.usecase.ts              # (수정 여부 연구) isCarriedOver 플래그 도출 규칙
│       ├── domain/
│       │   ├── todo.entity.ts                    # (변경 없음) CARRIED_OVER enum·전이 규칙은 하위 호환 위해 유지
│       │   └── carried-over-history.entity.ts    # (유지)
│       └── infrastructure/
│           └── carried-over-history.repository.ts
└── test/
    ├── unit/scheduler/application/carryover-scheduler.usecase.spec.ts   # (수정) 보존 동작 검증
    ├── unit/todo/application/get-todos.usecase.spec.ts                  # (수정 여부에 따라)
    └── integration/todo/todo.controller.spec.ts                         # (영향 없음 확인)

frontend/
├── src/
│   ├── screens/
│   │   ├── auth/LoginScreen.tsx                  # (수정) 그라데이션 배경 + OAuth 아이콘
│   │   ├── onboarding/OnboardingScreen.tsx       # (수정) 그라데이션 배경
│   │   ├── settings/SettingsScreen.tsx           # (수정) 계획알림 아이콘 바인딩
│   │   └── settings/TimezoneSelectScreen.tsx     # (수정) 국가명/도시명 라벨 렌더
│   ├── features/
│   │   └── notification/
│   │       └── planNotificationToggle.ts         # (신규 또는 기존) 저장 실패 롤백
│   ├── i18n/
│   │   ├── timezones.ts                          # (수정) tzToCountryCity 매핑/헬퍼
│   │   └── locales/{ko,en,ja,es}.json            # (수정) country.* 네임스페이스 추가
│   ├── components/
│   │   ├── auth/OAuthProviderButton.tsx          # (신규 또는 수정) 브랜드 아이콘 표시
│   │   └── settings/PlanNotificationIcon.tsx     # (수정 또는 신규) 활성/비활성 아이콘
│   └── assets/oauth/                             # (신규) google.png, apple.svg 등
└── __tests__/unit/
    ├── screens/auth/LoginScreen.test.tsx                    # (수정)
    ├── screens/onboarding/OnboardingScreen.test.tsx         # (수정)
    ├── screens/settings/SettingsScreen.planIcon.test.tsx    # (신규)
    ├── screens/settings/TimezoneSelectScreen.test.tsx       # (수정) 라벨 단언
    └── i18n/timezoneLabel.test.ts                           # (신규)

.maestro/
├── auth/
│   └── login-visual.yml                          # (신규) 그라데이션/아이콘 존재 확인
├── settings/
│   ├── plan-reminder-icon.yml                    # (신규) 토글 ↔ 아이콘 동기화
│   └── timezone-label.yml                        # (신규) 국가명/도시명 라벨 확인
└── calendar/
    └── day-detail.yml                            # (수정) 어제 todo 보존 검증 스텝 추가
```

**Structure Decision**: 기존 모노레포(`frontend/`, `backend/`, `.maestro/`) 구조를 그대로 사용한다. 본 feature는 네 개의 독립 슬라이스이므로 파일 변경 범위를 US 단위로 분리해 리뷰·테스트 가능하게 한다.

## Complexity Tracking

헌법 위반 없음 — 비워둔다.
