# Phase 1 Data Model — 007 로그인 라우팅 · 알림 · 캘린더 동기화

**Branch**: `007-fix-login-notif-calendar`
**Date**: 2026-04-14

## 범위

본 feature 는 **User 도메인에만 스키마 변경**을 수반한다. Todo/MonthlySummary 는 데이터 구조 변경 없이 클라이언트 측 갱신 트리거만 재정의한다.

## 1. User (TODOLIST_USER) — 변경

### 1.1 DB 스키마 변경

`docs/DDL.sql`의 `TODOLIST_USER` 테이블에 컬럼 1개 추가.

```sql
ALTER TABLE TODOLIST_USER
  ADD COLUMN has_completed_onboarding BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE TODOLIST_USER
  SET has_completed_onboarding = TRUE;
```

- 첫 문장: 컬럼 추가 (DEFAULT FALSE로 신규 가입 대비).
- 두 번째 문장: 기존 사용자 전원 `TRUE`로 백필(spec FR-008, Clarifications 확정).

### 1.2 엔티티 / 필드 정의

| 필드 | 타입 | Null | Default | 설명 |
|------|------|------|---------|------|
| `id` | UUID | N | - | (기존) |
| `userName` | VARCHAR | Y | NULL | (기존) |
| `planTime` | TIME | Y | NULL | (기존) 계획 알림 시각. 온보딩 완료 여부와 **무관**. |
| `reviewTime` | TIME | Y | NULL | (기존) 회고 알림 시각. 동일. |
| `timezone` | VARCHAR | Y | NULL | (기존) |
| `language` | VARCHAR | N | `'en'` | (기존) |
| **`hasCompletedOnboarding`** | BOOLEAN | N | FALSE | **[신규]** 온보딩 통과 여부. DB 컬럼: `has_completed_onboarding`. |

### 1.3 상태 전이 (State Transition)

```
[FALSE: 미완료] --(POST /users/me/onboarding/complete)--> [TRUE: 완료]
[TRUE: 완료]   --(동일 엔드포인트 재호출)--------------> [TRUE: 완료]  (멱등)
```

- **FALSE → TRUE**: 사용자가 온보딩 플로우 마지막 단계를 통과할 때 1회 호출.
- **TRUE → FALSE** 전이는 **정의되지 않는다** (현재 요구사항 범위 밖). 관리자 기능/테스트 도구가 필요한 경우 별도 API 로 분리.
- 알림 시간(`planTime`/`reviewTime`) 변경은 `hasCompletedOnboarding` 에 영향을 주지 않는다(FR-002).

### 1.4 Validation Rules

- 신규 사용자 생성 시 `hasCompletedOnboarding = FALSE` 강제 (DB DEFAULT로 보장).
- 마이그레이션 실행 후 모든 기존 행 `hasCompletedOnboarding = TRUE` (FR-008 SC-003).
- API 응답 DTO는 항상 이 필드를 포함해야 한다(누락 시 프론트 판별 불가 → FR-001 위반).

### 1.5 관계 (Relationships)

기존 `User - Todo` 관계 및 다른 엔티티 관계는 변경 없음.

## 2. Todo — 변경 없음

Todo 엔티티 구조와 CRUD 계약은 그대로 유지한다. 다만 클라이언트 레이어에서 `createTodo` 성공 이후 캘린더 탭이 재포커스 받을 때 `getMonthlySummary` 를 재호출한다는 **행동 계약** 이 추가된다(아래 3항).

## 3. MonthlySummary — 변경 없음 (갱신 트리거만 추가)

- 스키마/응답 구조 변경 없음.
- 클라이언트 행동 규칙(FR-014~016):
  1. `CalendarTab` 이 포커스를 얻을 때 현재 `year/month` 로 `getMonthlySummary` 재조회.
  2. `year` 또는 `month` 변경 시 재조회(기존 동작 유지).
  3. 재조회 실패는 기존 표시 값을 유지하고 사용자에게 방해되지 않는 수준으로 에러 상태 관리(헌법 V).

## 4. 타입 전파 경로

```
DB (has_completed_onboarding: BOOLEAN)
      ↓
TypeORM @Column (hasCompletedOnboarding: boolean)  [backend/src/user/domain/user.entity.ts]
      ↓
UserProfileDto.hasCompletedOnboarding: boolean      [backend/src/user/application/dto/user-profile.dto.ts]
      ↓ (REST)
UserProfile.hasCompletedOnboarding: boolean         [frontend/src/types/user.ts]
      ↓
isUserOnboarded(user)                               [frontend/src/app/navigation/isUserOnboarded.ts]
```

각 층에서 타입 누락 시 `any` 금지 원칙(헌법 II) 에 의해 빌드 단계 차단. validation은 `class-validator` 의 `@IsBoolean()` 데코레이터로 DTO 경계에서 수행.

## 5. 샘플 DTO

```ts
// backend/src/user/application/dto/user-profile.dto.ts
export class UserProfileDto {
  id!: string;
  userName!: string | null;
  planTime!: string | null;
  reviewTime!: string | null;
  timezone!: string | null;
  language!: string;
  hasCompletedOnboarding!: boolean; // 신규
}
```

```ts
// frontend/src/types/user.ts
export interface UserProfile {
  id: string;
  userName: string | null;
  planTime: string | null;
  reviewTime: string | null;
  timezone: string | null;
  language: string;
  hasCompletedOnboarding: boolean; // 신규
}
```

## 6. 마이그레이션 체크리스트

- [ ] `docs/DDL.sql` 에 `ALTER TABLE` 및 `UPDATE` 반영(문서 SSOT). 실제 실행은 TypeORM 마이그레이션이 담당한다는 주석 동반.
- [ ] TypeORM 마이그레이션 스크립트 추가: **파일 경로 `backend/src/common/migrations/{UNIX_MS}-AddHasCompletedOnboardingToUser.ts`** (기존 `1744502400000-UpdateLanguageFormat.ts` 등과 동일 디렉토리·네이밍 규약). up: `ALTER TABLE ... ADD COLUMN ...` + `UPDATE ... SET ... = TRUE`, down: `DROP COLUMN`.
- [ ] `backend/package.json` 에 `migration:run` / `migration:revert` npm 스크립트가 존재하는지 확인, 없으면 추가(tasks.md T016a).
- [ ] `npm run migration:run` 실행 후 `TODOLIST_USER` 에 컬럼 생성 + 기존 행 전원 `TRUE` 백필을 SQL 로 검증.
- [ ] `npm run migration:revert` 로 롤백 가능성 1회 검증 후 재실행으로 원복(CI/수동 QA 재현성 보장).
- [ ] 신규 가입 통합 테스트에서 `hasCompletedOnboarding === false` 확인.
- [ ] 백필 통합 테스트에서 기존 사용자 행의 `hasCompletedOnboarding === true` 확인.
