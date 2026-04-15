# Phase 1 Data Model — 008-update-01-ui-fixes

본 feature는 **DB 스키마를 변경하지 않는다**. 다만 엔티티의 런타임 상태 전이 규칙과 프론트엔드 관점 모델이 바뀌는 부분을 명시한다.

---

## 1. Todo (`todolist_todo`) — 상태 전이 규칙 변경

**소스**: `backend/src/todo/domain/todo.entity.ts`

### 필드 (변경 없음)

| 필드 | 타입 | 비고 |
|------|------|------|
| `id` | uuid | PK |
| `userId` | uuid | FK |
| `todoDate` | date | 할 일 소속 날짜 |
| `content` | varchar(255) | |
| `status` | enum(`TodoStatus`) | `ACTIVE`/`INACTIVE`/`COMPLETED`/`CARRIED_OVER` |
| `createdAt`/`updatedAt` | timestamp | |

### 상태 전이 규칙

**변경 전** (현재): 자정 이월 시 어제 원본의 `ACTIVE → CARRIED_OVER` 전이 발생. `CARRIED_OVER`는 dead-end(다른 전이 불가).

**변경 후** (본 feature):

- 자동 전이(이월 루틴) 경로에서 `ACTIVE → CARRIED_OVER` **전이를 호출하지 않는다**. 즉 어제 원본은 이월 후에도 `ACTIVE`(혹은 사용자가 바꾼 `COMPLETED`/`INACTIVE`)로 남는다.
- `TodoStatus.CARRIED_OVER` enum 값 자체와 `VALID_TRANSITIONS`의 `CARRIED_OVER → []` 규칙은 **제거하지 않는다**. 과거 데이터(이미 CARRIED_OVER가 된 todo)와의 호환성 때문.
- 사용자 조작으로의 `CARRIED_OVER` 진입 경로는 현재도 없으며 본 변경으로도 추가하지 않는다(데드 코드 제거는 후속 정리 대상).

### 검증 규칙

- 이월 루틴 내에서도 `todo.changeStatus(TodoStatus.CARRIED_OVER)` 호출이 없어야 한다(단위 테스트로 보증).
- 동일 `fromTodoId`에 대한 `CarriedOverHistory` UNIQUE 제약은 그대로 유지되어 중복 이월을 막는다.

---

## 2. CarriedOverHistory (`todolist_carried_over_history`) — 변경 없음

**소스**: `backend/src/todo/domain/carried-over-history.entity.ts`

| 필드 | 타입 | 제약 |
|------|------|------|
| `id` | uuid | PK |
| `fromTodoId` | uuid | FK → `todolist_todo.id`, UNIQUE |
| `toTodoId` | uuid | FK → `todolist_todo.id` |
| `createdAt` | timestamp | |

역할은 그대로 유지된다. 이월 중복 방지 및 `GetTodosUsecase`의 `isCarriedOver` 계산 입력으로 사용.

---

## 3. GetTodos 응답 DTO — 의미 불변, 도출 규칙만 정리

**소스**: `backend/src/todo/application/get-todos.usecase.ts`

- `isCarriedOver` 계산식은 다음과 같이 단순해진다:
  ```
  isCarriedOver := carriedOverToIds.has(todo.id)
  ```
  (기존 `todo.status === CARRIED_OVER` 분기 제거 — 이월 원본이 더 이상 이 상태를 갖지 않으므로 항상 false로 귀결되는 dead branch)
- 진행률(`progressRate`) 계산의 `nonCarriedOverCount` 정의도 사실상 기존 todo 개수와 동일해진다(어제 원본이 CARRIED_OVER로 빠져나가지 않으므로). 로직은 그대로 유지하되 "왜 여전히 필터하는가"의 주석을 WHY 중심으로 갱신한다.

---

## 4. PlanNotificationSettings (프론트엔드 모델)

**위치**: Zustand 스토어(예: `frontend/src/store/settingsStore.ts` 또는 `features/notification/`).

```ts
type PlanNotificationSettings = {
  planNotificationEnabled: boolean;
  // 기존 필드(시간, FCM 토큰 등)는 그대로 유지
};
```

### 동기화 규칙 (FR-005~007)

- `planNotificationEnabled`는 UI 렌더링의 단일 소스.
- 토글 변경 흐름:
  1. `setPlanNotificationEnabled(next)` — optimistic
  2. `userApi.updateSettings({ planNotificationEnabled: next })` 호출
  3. 실패 시 `setPlanNotificationEnabled(prev)`로 롤백 + 오류 토스트
- 앱 재시작 시 원격 설정 fetch 후 스토어 초기화 — 기존 부트스트랩 로직 사용.

---

## 5. Timezone Label 매핑 (프론트엔드 전용)

**위치**: `frontend/src/i18n/timezones.ts` + `locales/*.json`

```ts
type TzCountryCityMapping = Record<string, {
  countryEn: string;  // 영어 고정 상수, e.g., 'South Korea', 'Japan'
  cityEn: string;     // 영어 고정 상수, e.g., 'Seoul', 'Tokyo'
}>;

const TZ_TO_COUNTRY_CITY: TzCountryCityMapping = {
  'Asia/Seoul': { countryEn: 'South Korea', cityEn: 'Seoul' },
  'Asia/Tokyo': { countryEn: 'Japan',       cityEn: 'Tokyo' },
  // 기타 IANA는 폴백 경로로 처리, 후속 스펙에서 확장
};

function formatTimezoneLabel(tz: string): string {
  const mapping = TZ_TO_COUNTRY_CITY[tz];
  if (!mapping) return tz; // 안전 폴백 (IANA 원문)
  return `${mapping.countryEn}/${mapping.cityEn}`;
}
```

### i18n 리소스 확장 (FR-013)

**국가명·도시명 모두 영어 고정**이므로 `locales/*.json`에 **어떤 키도 추가하지 않는다**. `country.*` / `city.*` 네임스페이스는 생성하지 않는다. 향후 다국어 대응이 필요해지면 별도 스펙으로 분리한다.

### 검색 확장 (FR-015)

`TimezoneSelectScreen`의 검색 로직은 `query`를 (a) IANA 원문, (b) `countryEn`, (c) `cityEn` 세 필드와 비교하여 매칭한다(대소문자 무시).

---

## 6. OAuth Provider Icon 카탈로그 (프론트엔드 전용)

**위치**: `frontend/src/assets/oauth/` + 컴포넌트 `OAuthProviderButton.tsx`

```ts
type OAuthProvider = 'google' | 'apple' | 'kakao'; // 실제 지원 목록은 LoginScreen 구현 확인 후 확정
type OAuthIconMap = Record<OAuthProvider, ImageSourcePropType>;
```

- 각 아이콘은 제공자 브랜드 가이드 준수 에셋.
- 로딩 실패 시 `Image.onError` → 아이콘 숨김, 텍스트 라벨만 표시(FR-010).
- 다크 모드 대응: 라이트/다크 대응 에셋을 분리 제공하거나 단색 마스크 처리(FR-011).
