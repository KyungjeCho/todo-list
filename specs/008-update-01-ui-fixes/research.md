# Phase 0 Research — 008-update-01-ui-fixes

스펙의 네 가지 변경 각각에 대한 기술 선택과 근거를 정리한다. 모든 `NEEDS CLARIFICATION`은 아래에서 해소되었다.

---

## R1. 이월 시 어제 todo 보존 방식 (US1, FR-001~004)

### Decision

`CarryoverSchedulerUsecase.execute`에서 **어제 todo의 status를 `CARRIED_OVER`로 전이하는 코드(`todo.status = TodoStatus.CARRIED_OVER; save(todo)`)를 제거**한다. 나머지 흐름(`CarriedOverHistory` 중복 체크 → 새 오늘자 `ACTIVE` todo 생성 → history insert)은 그대로 유지한다.

어제 조회 시 "이월 여부" 표시는 기존 `GetTodosUsecase`의 `isCarriedOver` 계산식 중 **`carriedOverToIds.has(todo.id)` 분기만 유지**하고 `todo.status === CARRIED_OVER` 분기는 제거한다(이월 원본이 더 이상 CARRIED_OVER 상태를 가지지 않으므로 자동 무효화되지만, 코드 명료성을 위해 명시적으로 정리).

### Rationale

- 스펙 요구: "어제의 todo는 그대로 둔다." 상태 전이 자체가 사용자 관점에서 "삭제/변형"으로 인지된다(프론트가 `CARRIED_OVER`를 숨기거나 비활성화해 표시할 수 있음).
- 보존 후에도 `CarriedOverHistory.fromTodoId`에 UNIQUE 제약이 걸려 있어 중복 이월은 여전히 방지된다(`backend/src/common/migrations/1711411200001-AddUniqueFromTodoId.ts`).
- 진행률 계산(`nonCarriedOverCount`)도 원본이 `ACTIVE/COMPLETED/INACTIVE`로 남기 때문에 자연스럽게 어제 기준 진행률을 정확히 산출한다.
- DB 스키마 변경 불필요.

### Alternatives Considered

1. **새 status 값 `PRESERVED` 도입**: 과도한 도메인 확장. 기존 4-상태로 충분하며 헌법 VI(단순성) 위배.
2. **별도 컬럼 `carried_over_flag` 추가**: 마이그레이션 필요. `CarriedOverHistory` 테이블이 이미 같은 정보를 제공하므로 중복.
3. **프론트에서만 어제 화면 필터를 변경(백엔드 유지)**: 이미 CARRIED_OVER는 프론트에서 특수 처리되며, "사라진 것처럼 보이는" 근본 원인을 남김. 실패.

### TDD Plan

- `backend/test/unit/scheduler/application/carryover-scheduler.usecase.spec.ts`:
  - 기존 "todo status가 CARRIED_OVER로 변경된다" 단언을 **"원본 status가 유지된다"** 로 수정 (RED).
  - "CarriedOverHistory 레코드가 생성된다"와 "오늘자 신규 ACTIVE todo가 생성된다" 단언은 유지.
  - "이월 루틴을 두 번 실행해도 중복되지 않는다" 단언 추가 검증.
- 구현을 수정하여 GREEN 후 refactor.

---

## R2. '계획알림' 아이콘 상태 동기화 (US2, FR-005~007)

### Decision

- **단일 진실 공급원**: Zustand 스토어(`usePlanNotificationStore` 또는 기존 `useSettingsStore`) 내 `planNotificationEnabled: boolean`을 아이콘 렌더링의 유일한 소스로 사용.
- **아이콘 컴포넌트**: `PlanNotificationIcon`이 해당 값을 셀렉터로 구독하여 `Bell`/`BellOff`(또는 기존 사용 중 아이콘 세트의 on/off 변형)로 렌더링. 로컬 state에 값을 복사하지 않는다(최근 조사에서 로컬 state 복사가 동기화 지연 원인으로 확인).
- **저장 실패 롤백**: 토글 핸들러는 (1) optimistic update, (2) API 호출, (3) 실패 시 이전 값으로 set 복구, (4) 토스트/얼럿으로 피드백. 동일 패턴이 `feature/notification/planNotificationToggle.ts`에 위치.

### Rationale

- Zustand 단일 소스 패턴은 프로젝트의 다른 설정(예: 언어, 타임존)에서도 사용 중이므로 일관성 유지.
- optimistic + rollback은 UX와 V(실패 처리) 원칙을 모두 만족.

### Alternatives Considered

1. **서버 확정 후에만 상태 반영**: 네트워크 지연 동안 아이콘이 먹히지 않아 SC-003(1초 이내)을 위반할 수 있음.
2. **로컬 state + 수동 sync**: 현재 버그 원인으로 추정. 재도입 거부.

### TDD Plan

- `SettingsScreen.planIcon.test.tsx` (신규):
  - RED: 토글을 끄면 `getByTestId('plan-reminder-icon')`이 off 변형 이름을 가진다(e.g., `accessibilityLabel="계획알림 비활성"`) — 현재 실패.
  - 저장 실패를 mock하여 롤백 후 on 상태로 복원 검증.
- `.maestro/settings/plan-reminder-icon.yml`: 토글 → 아이콘 스크린샷 diff 또는 accessibilityLabel 단언.

---

## R3. 로그인/온보딩 그라데이션 + OAuth 브랜드 아이콘 (US3, FR-008~011)

### Decision

- **라이브러리**: `expo-linear-gradient` 사용(Expo SDK ~55 호환, 추가 네이티브 설정 불필요).
- **색상**: 라이트·다크 모드 각각 2색 세로 그라데이션. 기본값은 브랜드 primary(상단) → 배경 surface(하단). 다크 모드에서는 surface를 더 어두운 계열로 대체. 정확한 HEX는 디자인 가이드 없음 → `frontend/src/theme` 상수에서 현재 배경 토큰 2개를 재사용해 임시 값 정의, 디자이너 피드백 후 업데이트.
- **OAuth 브랜드 아이콘**: 각 제공자(Google/Apple/Kakao 등 — 현재 지원 제공자 목록은 `LoginScreen` 구현 확인)의 공식 브랜드 가이드 아이콘을 `frontend/src/assets/oauth/`에 PNG/SVG로 번들. 로딩 실패 시 텍스트-only 버튼으로 자연 폴백(React Native `Image`는 에러 시 빈 공간으로 렌더되므로 `onError`에서 `Image`를 숨기고 텍스트만 보이게 처리).
- **접근성**: `accessibilityLabel`에 "구글로 로그인" 등 한국어 라벨 제공, 다크 모드 대비(WCAG AA) 확인.

### Rationale

- `expo-linear-gradient`는 이미 Expo 워크플로에서 가장 마찰이 적은 선택이며, 헌법 VI(단순성)에 부합.
- 브랜드 에셋은 제공자 가이드 준수를 위해 번들 방식이 안전(네트워크 CDN 호스트 의존 회피).

### Alternatives Considered

1. **`react-native-svg`로 그라데이션을 직접 그림**: 유연하지만 1개 화면 배경 구현에 오버엔지니어링.
2. **배경 이미지 PNG**: 해상도별 에셋 관리 부담 + 다크 모드 분기 번거로움.
3. **아이콘 Font(Ionicons 등)로 브랜드 표시**: 제공자 브랜드 가이드라인 위반 소지.

### TDD Plan

- `LoginScreen.test.tsx`: 그라데이션 컴포넌트가 렌더되며 OAuth 버튼 개수만큼 `Image` 역할 요소가 존재하는지 단언.
- `.maestro/auth/login-visual.yml`: 로그인 화면에 브랜드 버튼 testID가 모두 visible한지 확인.

---

## R4. 타임존 라벨 국가명/도시명 (US4, FR-012~015)

### Decision

- **매핑 테이블**: `frontend/src/i18n/timezones.ts`에 `TZ_TO_COUNTRY_CITY: Record<string, { countryEn: string; cityEn: string }>` 추가. 초기 항목은 `Asia/Seoul → { countryEn: 'South Korea', cityEn: 'Seoul' }`, `Asia/Tokyo → { countryEn: 'Japan', cityEn: 'Tokyo' }`. 국가명·도시명 모두 **영어 고정 상수**(i18n 리소스 미사용). 다른 IANA 확장은 후속 스펙.
- **다국어 리소스**: 본 feature는 `locales/*.json`에 **아무 키도 추가하지 않는다**. 렌더링 헬퍼 `formatTimezoneLabel(tz)` → `${countryEn}/${cityEn}` 반환. 매핑에 없는 IANA는 원 IANA 문자열 폴백. 헬퍼 시그니처에 `t` 인자는 필요 없다.
- **저장 포맷**: 기존 IANA 원본 그대로(`Asia/Seoul`). 사용자 프로필/백엔드 DTO 변경 없음(FR-014).
- **검색**: `TimezoneSelectScreen` 검색 로직은 (a) 원 IANA 문자열, (b) `countryEn`, (c) `cityEn` 세 가지를 모두 매칭 대상에 포함.

### Rationale

- 한/일만 선제 매핑하고 나머지는 폴백하는 접근은 헌법 VI(단순성) + 점진 확장 원칙 준수.
- 국가명·도시명을 모두 영어 고정으로 두면 i18n 리소스 유지 비용이 0이며, 다국어 추가 시에도 타임존 라벨은 변경이 필요 없다. 영어 표기가 국제 공용이라는 점에서 사용성 저하 미미.
- 저장은 IANA 유지하여 백엔드와 역호환성 보장.

### Alternatives Considered

1. **`Intl.DisplayNames('region'|'city')` 전적 사용**: 도시명 API는 모든 환경에서 일관되지 않음(iOS/Android 차이), 한글 표기 품질 편차. 폴백 용도로만 사용 고려.
2. **백엔드에서 라벨 내려주기**: UI 현지화에 서버 의존 발생 → 단순성·계층 분리 원칙 위반.
3. **전 세계 타임존 전면 매핑**: 스펙 범위 초과. 후속 스펙에서 다룬다(Scope Boundaries 참고).

### TDD Plan

- `__tests__/unit/i18n/timezoneLabel.test.ts` (신규): `formatTimezoneLabel('Asia/Seoul')` === 'South Korea/Seoul', `formatTimezoneLabel('Asia/Tokyo')` === 'Japan/Tokyo', 매핑 없는 IANA(예: `'America/New_York'`)는 원문 폴백 단언. 앱 언어 의존성이 없으므로 언어별 매트릭스 불필요.
- `TimezoneSelectScreen.test.tsx`: 한국 항목이 "South Korea/Seoul"로 렌더, "Korea"/"Seoul"/"South" 검색이 모두 결과 포함.
- `.maestro/settings/timezone-label.yml`: 선택 화면에서 "South Korea/Seoul" 텍스트 존재 확인(현재 언어 무관).

---

## Cross-cutting Considerations

- **DB 마이그레이션**: 없음.
- **API 변경**: 없음(이월 usecase 내부 변경만). `GetTodosUsecase` 응답 DTO 변경 없음(`isCarriedOver` 필드 유지).
- **문서 싱크**: `docs/TECH_SPEC.md`의 "이월 동작" 문단이 CARRIED_OVER 상태 전이를 언급한다면 업데이트 필요 — tasks 단계에서 확인.
- **빌드 영향**: `expo-linear-gradient` 추가 외 신규 의존성 없음. 런타임 번들 사이즈 영향 미미.
- **관측성**: 기존 `CarryoverSchedulerService` 로깅 그대로 유지. 상태 전이 제거에 따라 "카운트 변화"만 로그에 반영되므로 추가 지표 불필요.
