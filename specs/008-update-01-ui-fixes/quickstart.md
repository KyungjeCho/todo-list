# Quickstart — 008-update-01-ui-fixes

개발자가 이 feature 브랜치로 들어와서 TDD 사이클을 돌리는 최단 경로를 정리한다.

## 0. 브랜치 체크아웃

```bash
git checkout 008-update-01-ui-fixes
cd /home/jkjk396/workspace/todo-list/dev-log/todo-list
```

## 1. 의존성 설치 (변경점)

```bash
# 루트 모노레포 (기존)
npm install

# 프론트엔드에 expo-linear-gradient 추가
cd frontend
npx expo install expo-linear-gradient
cd ..
```

백엔드는 신규 의존성 없음.

## 2. 백엔드: 이월 보존 (US1) — TDD 사이클

```bash
cd backend

# RED: 기존 spec의 CARRIED_OVER 전이 단언을 "원본 status 유지"로 변경
npx jest test/unit/scheduler/application/carryover-scheduler.usecase.spec.ts --watch

# 단언 수정 후 → 실패 확인
# GREEN: src/scheduler/application/carryover-scheduler.usecase.ts 에서
#        `todo.status = TodoStatus.CARRIED_OVER; await txTodoRepo.save(todo);` 두 줄 제거
# → 테스트 통과
# REFACTOR: get-todos.usecase.ts의 isCarriedOver 계산식을 단순화
```

회귀 확인:

```bash
npm test
npm run lint
```

## 3. 프론트엔드: 계획알림 아이콘 (US2) — TDD 사이클

```bash
cd frontend

# RED
npx jest __tests__/unit/screens/settings/SettingsScreen.planIcon.test.tsx --watch
# 토글 OFF 후 icon accessibilityLabel === "계획알림 비활성" 단언 → 실패

# GREEN
# - components/settings/PlanNotificationIcon.tsx 가 planNotificationEnabled 셀렉터 구독
# - SettingsScreen.tsx 에서 로컬 state 복사 제거
# - toggle 핸들러에 optimistic + rollback 적용 (features/notification/planNotificationToggle.ts)

# Maestro E2E
# .maestro/settings/plan-reminder-icon.yml 작성 → 안드로이드 에뮬레이터에서 실행
```

## 4. 프론트엔드: 로그인/온보딩 비주얼 (US3)

```bash
cd frontend

# RED
npx jest __tests__/unit/screens/auth/LoginScreen.test.tsx --watch
# <LinearGradient> 렌더 + 각 OAuth 버튼이 Image testID 포함 단언

# GREEN
# - screens/auth/LoginScreen.tsx 를 <LinearGradient>로 래핑
# - screens/onboarding/OnboardingScreen.tsx 동일 처리
# - components/auth/OAuthProviderButton.tsx 에 Image + onError 폴백
# - assets/oauth/{google,apple,kakao}.png 추가

# Maestro
# .maestro/auth/login-visual.yml → 각 OAuth 버튼 testID visible 확인
```

## 5. 프론트엔드: 타임존 라벨 (US4)

```bash
cd frontend

# RED
npx jest __tests__/unit/i18n/timezoneLabel.test.ts --watch
# formatTimezoneLabel('Asia/Seoul', tKO) === '대한민국/서울' 단언

# GREEN
# - src/i18n/timezones.ts 에 TZ_TO_COUNTRY_CITY + formatTimezoneLabel 추가
# - src/i18n/locales/{ko,en,ja,es}.json 에 country.KR/JP, city.Seoul/Tokyo 번역 추가
# - TimezoneSelectScreen.tsx 렌더링 및 검색 로직 업데이트

# Maestro
# .maestro/settings/timezone-label.yml → "대한민국/서울" 텍스트 visible 확인
```

## 6. 통합 검증

```bash
# 루트에서
cd backend && npm test && npm run lint && cd ..
cd frontend && npm test && npm run lint && cd ..

# Maestro 안드로이드 에뮬레이터 전체 플로우
maestro test .maestro/auth/login-visual.yml
maestro test .maestro/settings/plan-reminder-icon.yml
maestro test .maestro/settings/timezone-label.yml
maestro test .maestro/calendar/day-detail.yml   # 어제 보존 회귀 확인
```

## 7. Definition of Done 체크

- [ ] 요구사항 충족 (FR-001~015)
- [ ] Jest 전체 통과 (백엔드·프론트)
- [ ] `tsc --noEmit` 에러 없음 (`any` 금지)
- [ ] ESLint 통과
- [ ] 문서 동기화: `docs/API_SPEC.md`/`docs/TECH_SPEC.md` 관련 문단이 최신 동작 반영
- [ ] loading/empty/error 상태 설계 검증 ('계획알림' 저장 실패 롤백, OAuth 아이콘 로드 실패 폴백)
- [ ] Maestro E2E 전부 Green (안드로이드 에뮬레이터)
- [ ] PR 생성 → 리뷰 1회 이상 → main 머지
