# TodoList 리팩토링 종합 보고서

**작성일:** 2026-04-17
**분석 범위:** Frontend 71개 파일 / Backend 89개 파일 (총 ~5,350줄 TS)

---

## 현재 코드 강점

| 항목 | 평가 |
|------|------|
| Clean Architecture (usecase 패턴) | 우수 |
| 순환 참조 없음, 모듈화 | 우수 |
| 보안 (OAuth, IDOR, CSRF) | 우수 |
| N+1 쿼리 방지 (relations 일관 사용) | 우수 |
| TypeScript strict, `any` 거의 없음 | 우수 |
| i18n 전면 적용 | 우수 |
| StyleSheet + theme 토큰 일관 사용 | 우수 |
| 접근성 (accessibility props) | 우수 |

---

## 백엔드 리팩토링 항목

### 1순위 — 중복 제거 (가장 큰 효과)

#### A. 사용자 검증 로직 중복 (13곳)

모든 usecase에서 동일한 패턴이 반복됩니다:

```typescript
const user = await this.userRepository.findByUserAuthId(input.userAuthId);
if (!user) throw new NotFoundException('USER_NOT_FOUND');
```

**영향 파일:**
- `create-todo.usecase.ts:25-28`
- `change-todo-status.usecase.ts:26-29`
- `delete-todo.usecase.ts:24-29`
- `create-memo.usecase.ts:27-30`
- `update-memo.usecase.ts:28-33`
- `delete-memo.usecase.ts:26-29`
- `update-todo.usecase.ts:26-31`
- `get-todos.usecase.ts:22-25`
- `get-monthly-summary.usecase.ts:26-29`
- `batch-create-todo.usecase.ts:29-32`
- `refine-text.usecase.ts:22-25`
- `update-settings.usecase.ts:36-40`
- `complete-onboarding.usecase.ts:24-27`

**개선안:** `UserValidationService.ensureUserExists()` 추출로 13곳 통합

#### B. Todo 소유권 검증 중복 (6곳)

```typescript
const todo = await this.todoRepository.findById(input.todoId);
if (!todo) throw new NotFoundException('TODO_NOT_FOUND');
if (todo.userId !== user.id) throw new ForbiddenException('FORBIDDEN');
```

**영향 파일:**
- `change-todo-status.usecase.ts:35-38`
- `delete-todo.usecase.ts:29-38`
- `update-todo.usecase.ts:31-39`
- `create-memo.usecase.ts:32-35`
- `update-memo.usecase.ts:33-41`
- `delete-memo.usecase.ts:31-34`

**개선안:** `TodoAuthorizationService.validateOwnership()` 추출

#### C. TodoItemDto 매핑 중복 (4곳)

memos 변환 + todo → DTO 변환 로직이 create/change-status/update/get-todos usecase에서 반복됩니다.

```typescript
const memos = ((todo.memos ?? []) as MemoType[])
  .map((memo) => ({
    id: memo.id,
    todoId: memo.todoId,
    content: memo.content,
    createdAt: new Date(memo.createdAt).toISOString(),
    updatedAt: new Date(memo.updatedAt).toISOString(),
  }));

return {
  id: todo.id,
  content: todo.content,
  status: todo.status,
  isCarriedOver: false,
  todoDate: todo.todoDate,
  memos,
  createdAt: new Date(todo.createdAt).toISOString(),
  updatedAt: new Date(todo.updatedAt).toISOString(),
};
```

**개선안:** `TodoItemMapper.toDto()` 클래스 추출

#### D. 날짜 계산 로직 중복 (2곳)

`getNextDate()` 함수가 `carryover-scheduler.usecase.ts`와 `complete-day.usecase.ts`에 각각 존재합니다.

**개선안:** `DateHelper` 유틸로 통합

---

### 2순위 — 코드 품질

#### E. `any` 타입 제거

- `todo-response.dto.ts` — `memos: any[]` → `MemoDto[]`
- `notification-log.entity.ts` — `data: any` → 구체 타입

#### F. 에러 코드 비일관성

같은 상황에 `'USER_NOT_FOUND'`, `'NOT_FOUND'`, `'USER_NOT_FOUND_FOR_OAUTH'` 혼재

**개선안:** `ERROR_CODES` 상수 객체로 통합

```typescript
// src/common/constants/error-codes.ts
export const ERROR_CODES = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  TODO_NOT_FOUND: 'TODO_NOT_FOUND',
  MEMO_NOT_FOUND: 'MEMO_NOT_FOUND',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  INVALID_DATE_FORMAT: 'INVALID_DATE_FORMAT',
} as const;
```

#### G. DTO Validation 누락

- `refine-text.dto.ts` — `@MaxLength` 없음
- `batch-create-todos.dto.ts` — `@ArrayMaxSize` 없음 (대량 생성 공격 가능)
- OAuth `@Query()` 파라미터 — provider/timezone/language 미검증

#### H. 긴 메서드 분해 (30줄 초과)

| 파일 | 메서드 | 줄 수 |
|------|--------|-------|
| `oauth-provider.service.ts` | `exchangeCode` | 72줄 |
| `carryover-scheduler.usecase.ts` | `execute` | 73줄 |
| `oauth-callback.usecase.ts` | `execute` | 69줄 |
| `get-todos.usecase.ts` | `execute` | 89줄 |
| `complete-day.usecase.ts` | `execute` | 65줄 |

---

### 3순위 — 성능

#### I. 불필요한 다중 순회 (`get-todos.usecase.ts`)

```typescript
// 현재: filter 3번 호출
const completed = sortedTodos.filter(t => t.status === 'COMPLETED').length;
const active = sortedTodos.filter(t => t.status === 'ACTIVE').length;
const inactive = sortedTodos.filter(t => t.status === 'INACTIVE').length;

// 개선: reduce 1회 순회
const stats = sortedTodos.reduce((acc, todo) => {
  acc[todo.status] = (acc[todo.status] || 0) + 1;
  return acc;
}, {} as Record<TodoStatus, number>);
```

---

## 프론트엔드 리팩토링 항목

### 1순위 — 대형 컴포넌트 분리

#### A. SettingsScreen.tsx (767줄) — 가장 시급

- 아이콘 렌더 함수 8개 → `SettingsIcons.tsx`로 분리
- 설정 섹션들 → `SettingSection`, `TimePicker`, `LanguagePicker` 컴포넌트화
- 낙관적 업데이트 로직 → `useOptimisticUpdate` 훅 추출

#### B. TodoItem.tsx (304줄)

- `React.memo` 미적용 → FlatList 내 불필요한 리렌더 발생
- 8개 핸들러에 `useCallback` 미적용
- 확장/축소 뷰를 별도 컴포넌트로 분리

#### C. AuthNavigator.tsx (426줄)

- 인증 상태, 온보딩, 메인 네비게이션이 모두 한 파일에 혼재
- 네비게이션 로직을 커스텀 훅으로 추출

---

### 2순위 — 공통 컴포넌트 추출

#### D. 체크박스 중복 (3곳)

`ReviewModeView.tsx`, `TodoItem.tsx`에서 동일한 체크박스 렌더링 반복

**개선안:** `<Checkbox>` 컴포넌트 추출

#### E. 에러 배너 중복 (5곳)

`MainScreen`, `CalendarScreen`, `VoiceInputScreen` 등에서 동일 패턴

```tsx
{error && (
  <View style={styles.errorContainer}>
    <Text style={styles.errorText}>{error}</Text>
    {onRetry && (
      <SoundPressable onPress={onRetry} style={...}>
        <Text>{t('common.retry')}</Text>
      </SoundPressable>
    )}
  </View>
)}
```

**개선안:** `<ErrorBanner>` 컴포넌트 추출

#### F. 로딩 인디케이터 중복 (5곳)

**개선안:** `<LoadingSpinner>` 컴포넌트 추출

---

### 3순위 — 커스텀 훅 추출

#### G. 타이머/인터벌 관리 (3곳에서 반복)

- `useSpeechRecognition.ts` — setTimeout/clearTimeout
- `VoiceControls.tsx` — setInterval 관리
- `useShareTodo.ts` — 토스트 타이머

**개선안:** `useTimer` 훅

#### H. API 호출 상태 관리 (여러 곳에서 loading/error/data 패턴 반복)

**개선안:** `useAsync` 훅

#### I. 낙관적 업데이트 (SettingsScreen에서 3곳)

**개선안:** `useOptimisticUpdate` 훅

---

### 4순위 — 최적화

#### J. Zustand 셀렉터 부재

```typescript
// 현재: 전체 스토어 구독 → 불필요 리렌더
const { accessToken } = getAuthStore().getState();

// 개선: 세분화된 셀렉터
export const selectAccessToken = (state: AuthState) => state.accessToken;
const accessToken = useAuthStore(selectAccessToken);
```

#### K. 중복 타입 정의

- `CarriedOverResult` — `CompleteDayButton.tsx`와 `todoApi.ts`에 각각 정의
- `Stats` — `MainScreen.tsx`와 `ReviewModeView.tsx`에 각각 정의

**개선안:** `types/todo.ts`로 통합

#### L. Magic Number 상수화

- `CalendarScreen.tsx` — `DAY_CELL_SIZE = 40`
- `VoiceControls.tsx` — `borderRadius: 4` → `radius.sm`

---

## 테스트 현황

| 영역 | 파일 수 | 평가 |
|------|---------|------|
| 백엔드 단위 테스트 | 40개 | 양호 |
| 백엔드 통합 테스트 | 6개 | 양호 |
| 프론트엔드 단위 테스트 | 60+개 | 양호 |
| Maestro E2E | 25개 | 양호 |

---

## WHY 주석 및 JSDoc 누락 분석

> 프로젝트 규칙: 주석은 WHY 중심, 공개 API는 JSDoc/TSDoc 문서화, 코드 반복 주석 금지, 주석 처리된 코드 금지

### 현재 상태 평가

프로젝트 전반적으로 복잡한 로직(pessimistic lock, optimistic update, race condition 방지, 플랫폼 차이 처리)에는 **이미 양질의 WHY 주석**이 작성되어 있습니다. 아래는 추가가 필요한 항목입니다.

---

### 백엔드 — Public API JSDoc 전무 (21개 엔드포인트)

모든 컨트롤러 메서드에 JSDoc이 없습니다.

#### `auth.controller.ts`

| 줄 | 메서드 | 필요한 JSDoc 내용 |
|----|--------|------------------|
| 40-61 | `oauthLogin()` | OAuth 프로바이더별 로그인 흐름, 파라미터 용도 |
| 66-130 | `oauthCallback()` | OAuth 콜백 처리, 상태 검증 프로세스 |
| 158-170 | `tokenRefresh()` | 토큰 갱신, 쓰로틀링 정책 |
| 172-184 | `logout()` | 로그아웃 처리, FCM 토큰 제거 방식 |

#### `todo.controller.ts`

| 줄 | 메서드 |
|----|--------|
| 56-65 | `getMonthlySummary()` |
| 68-76 | `getTodos()` |
| 84-92 | `refineText()` |
| 96-104 | `batchCreateTodos()` |
| 125-134 | `createTodo()` |
| 138-146 | `completeDay()` |
| 149-159 | `updateTodo()` |
| 162-172 | `changeTodoStatus()` |
| 175-183 | `deleteTodo()` |

#### `user.controller.ts`

| 줄 | 메서드 |
|----|--------|
| 36-40 | `getProfile()` |
| 44-48 | `completeOnboarding()` |
| 51-59 | `updateSettings()` |
| 62-79 | `registerDevice()` |

#### `memo.controller.ts`

| 줄 | 메서드 |
|----|--------|
| 35-45 | `createMemo()` |
| 48-60 | `updateMemo()` |
| 63-73 | `deleteMemo()` |

---

### 백엔드 — 보안 민감 코드 WHY 주석 누락 (Critical)

#### `oauth-login.usecase.ts` — signState/verifyState

**줄 47-52: `signState()` nonce + HMAC 서명**
```typescript
static signState(payload: Record<string, unknown>, secret: string): string {
  const nonce = randomBytes(16).toString('hex');
  const data = JSON.stringify({ ...payload, nonce });
  const signature = createHmac('sha256', secret).update(data).digest('hex');
  return Buffer.from(JSON.stringify({ data, signature })).toString('base64');
}
```
필요한 주석:
```
// WHY: 매 호출마다 새로운 nonce로 replay attack 방지.
// HMAC-SHA256으로 서명하여 state 위조 불가. Base64로 URL-safe 전달.
```

**줄 54-78: `verifyState()` — timingSafeEqual**
```typescript
if (!timingSafeEqual(sigBuffer, expectedBuffer)) { return null; }
```
필요한 주석:
```
// WHY: timingSafeEqual로 비교 시간을 일정하게 유지하여
// timing attack으로 서명을 추론할 수 없도록 방지.
```

#### `token.service.ts` — 토큰 해싱

**줄 48-50:**
```typescript
static hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
```
필요한 주석:
```
// WHY: refreshToken을 DB에 평문 저장하지 않기 위해 SHA256 해싱.
// 검증 시 클라이언트 토큰을 재해싱하여 비교.
```

#### `token-refresh.usecase.ts` — Refresh Token Rotation

**줄 31-39:**
```typescript
if (session.expiredAt && new Date(session.expiredAt) < new Date()) {
  await this.authRepository.deleteSession(session.id);
  throw new UnauthorizedException('SESSION_EXPIRED');
}
// ...
await this.authRepository.deleteSession(session.id);
```
필요한 주석:
```
// WHY: Refresh token rotation — 사용된 refreshToken 즉시 무효화.
// 토큰 탈취 시 공격자 재사용 방지.
```

#### `oauth-callback.usecase.ts` — timezone validation

**줄 19-27: `sanitizeTimezone()`**
```typescript
function sanitizeTimezone(value: string | undefined): string | null {
  if (!value) return null;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value });
    return value;
  } catch { return null; }
}
```
필요한 주석:
```
// WHY: 무효한 IANA timezone 문자열이 DB에 저장되면
// 이후 Intl API 호출 시 예외 발생. 사전 검증으로 차단.
```

---

### 백엔드 — 비즈니스 로직 WHY 주석 누락

#### `get-todos.usecase.ts` — determineMode()

**줄 112-136:**
```typescript
private determineMode(planTime, reviewTime, timezone): 'PLAN' | 'REVIEW' { ... }
```
필요한 주석:
```
// WHY: 클라이언트 타임존 기준으로 현재 시각 계산.
// UTC 단순 비교는 사용자 타임존 자정을 정확히 판정할 수 없음.
```

#### `carryover-scheduler.usecase.ts` — isMidnight()

**줄 76-83:**
```typescript
private isMidnight(now: Date, timezone: string): boolean {
  const localTime = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour: 'numeric', hourCycle: 'h23',
  }).format(now);
  return parseInt(localTime, 10) === 0;
}
```
필요한 주석:
```
// WHY: 'en-US' + 'h23'은 locale/hourCycle과 관계없이
// 일관된 숫자 문자열 반환 보장. 다른 로케일은 한글/한자 변환 가능.
```

#### `change-todo-status.usecase.ts` — CARRIED_OVER 차단

**줄 31-33:**
```typescript
if (input.status === (TodoStatus.CARRIED_OVER as string)) {
  throw new BadRequestException('CARRIED_OVER_NOT_ALLOWED');
}
```
필요한 주석:
```
// WHY: CARRIED_OVER는 complete-day/carryover-scheduler만 설정 가능한 내부 상태.
// 사용자가 직접 이월 상태를 설정하지 못하도록 API에서 차단.
```

#### `batch-create-todo.usecase.ts` — 트랜잭션

**줄 34-66:**
필요한 주석:
```
// WHY: 배치 생성 중 일부 실패 시 전체 롤백하여
// 부분 삽입된 불완전한 상태 방지.
```

---

### 백엔드 — Config/Throttle 값 근거 누락

#### `app.module.ts` — Throttler 설정 (줄 30-46)

```typescript
// WHY: short(1초/3회) — 인증 시도 무차별 대입 방지
// WHY: medium(10초/20회) — AI 텍스트 정제 등 일반 DDoS 방지
// WHY: long(60초/100회) — 전체 엔드포인트 폭주 차단
```

#### `auth.controller.ts` — tokenRefresh 쓰로틀 (줄 160-163)

```typescript
// WHY: refreshToken은 민감한 보안 자산. 1초 내 1회로 대량 갱신 시도 차단.
// medium 완화하여 여러 기기 동시 갱신 수용.
```

---

### 백엔드 — Type Assertion 안전성 설명 누락

#### `get-todos.usecase.ts` — Memo 인라인 타입 (줄 69-88)

```typescript
const memos = (todo.memos as { id: string; todoId: string; ... }[]) ?? [];
```
필요한 주석:
```
// WHY: TodoMemo entity 직접 import 시 순환 의존성 발생.
// 응답 구조만 필요하므로 인라인 타입 정의.
```

#### `change-todo-status.usecase.ts` — enum 캐스팅 (줄 44)

```typescript
todo.changeStatus(input.status as TodoStatus);
```
필요한 주석:
```
// WHY: 줄 31-32에서 CARRIED_OVER 필터링 완료,
// DTO 검증에서 유효한 TodoStatus만 통과. 캐스팅 안전.
```

#### `oauth-callback.usecase.ts` — stateData 캐스팅 (줄 111-118)

필요한 주석:
```
// WHY: stateData는 verifyState에서 파싱한 JSON (유형 소실).
// 줄 86-93에서 필드 타입 검증 완료. annotation 목적의 캐스팅.
```

---

### 프론트엔드 — WHY 주석 누락 항목

프론트엔드는 전반적으로 **WHY 주석이 잘 작성**되어 있습니다. 아래 항목만 추가가 필요합니다.

#### `tokenManager.ts` — 동시 갱신 제어 (줄 45-55)

```typescript
if (this.refreshPromise) {
  return this.refreshPromise;
}
```
필요한 주석:
```
// WHY: 동시 토큰 갱신 요청 시 첫 요청만 실제 갱신 수행,
// 나머지는 동일 Promise 공유 — race condition 방지.
```

#### `TodoItem.tsx` — useEffect 초기화 (줄 42-46)

```typescript
useEffect(() => {
  if (isExpanded) { setEditText(todo.content); }
}, [isExpanded, todo.content]);
```
필요한 주석:
```
// WHY: 확장 시에만 editText를 현재 content로 초기화 —
// 축소 후 재확장 시 최신값 반영.
```

#### `useAuth.ts` — Android 13+ 권한 (줄 34-41)

```typescript
if (Platform.OS === 'android' && Platform.Version >= 33) { ... }
```
필요한 주석:
```
// WHY: Android 13(API 33) 이상은 POST_NOTIFICATIONS 런타임 권한 필수.
```

#### `useAppFocusRefresh.ts` — 체크 간격 (줄 10)

```typescript
const MIDNIGHT_CHECK_INTERVAL = 60_000;
```
필요한 주석:
```
// WHY: 1분 주기 자정 체크 — 실시간 감지와 배터리 소비의 균형.
```

#### `CalendarScreen.tsx` — 요일 색상 매직 넘버 (줄 44-48)

```typescript
if (index === 0) return colors.error;
if (index === 6) return colors.primary;
```
필요한 주석:
```
// WHY: 0=일요일(빨강), 6=토요일(파랑) — 한국식 주말 강조.
```

#### `CalendarScreen.tsx` — getTodayDate() 중복 (줄 57-60)

필요한 주석:
```
// WHY: TODO — features/todo/getCurrentDate와 통합 필요.
```

#### `soundService.ts` — play() 가드 (줄 62-65)

```typescript
if (recordingActive) { return; }
```
필요한 주석:
```
// WHY: 녹음 중 클릭음 재생 안 함 — 마이크 노이즈 방지.
```

#### `soundService.ts` — preload 동시성 (줄 40-56)

필요한 주석:
```
// WHY: 동시 preload 호출 시 첫 요청만 실제 로드 — 중복 로드 방지.
```

#### `authStore.ts` — restoreTokens 실패 처리 (줄 47-65)

```typescript
try {
  const user = await userApi.getProfile();
  set({ user });
} catch {
  tokenManager.clearTokens();
  set({ ...clearAuthPayload });
}
```
필요한 주석:
```
// WHY: 저장된 토큰이 있어도 프로필 조회 실패 시 인증 재설정 —
// 서버 데이터 삭제/토큰 만료 감지.
```

#### `SettingsScreen.tsx` — 기본 알림 시간 상수 (줄 31-32)

필요한 주석:
```
// WHY: 온보딩/복원 시 기본 알림 시간 — 변경하면 모든 새 사용자에게 영향.
```

---

### 요약 — 주석 추가 필요 항목 수

| 카테고리 | 백엔드 | 프론트엔드 | 합계 |
|----------|--------|-----------|------|
| **JSDoc (Public API)** | 21개 메서드 | — | 21 |
| **보안 WHY 주석** | 5곳 | 1곳 | 6 |
| **비즈니스 로직 WHY** | 4곳 | 2곳 | 6 |
| **Config/상수 근거** | 2곳 | 3곳 | 5 |
| **Type Assertion 설명** | 3곳 | — | 3 |
| **동시성/최적화** | — | 3곳 | 3 |
| **합계** | **35** | **9** | **44** |

---

## 권장 실행 순서

| Phase | 작업 | 영향도 |
|-------|------|--------|
| **1** | `UserValidationService` + `TodoAuthorizationService` 추출 (백엔드 중복 19곳 제거) | 높음 |
| **2** | `TodoItemMapper` 추출 (백엔드 매핑 중복 4곳 제거) | 높음 |
| **3** | `SettingsScreen` 분리 (767줄 → 각 100~150줄) | 높음 |
| **4** | `TodoItem`에 `React.memo` + `useCallback` 적용 | 높음 |
| **5** | `Checkbox`, `ErrorBanner`, `LoadingSpinner` 공통 컴포넌트 | 중간 |
| **6** | DTO validation 강화 + `any` 타입 제거 | 중간 |
| **7** | 에러 코드 상수화 + 중복 타입 통합 | 중간 |
| **8** | 커스텀 훅 추출 (`useTimer`, `useAsync`, `useOptimisticUpdate`) | 중간 |
| **9** | 긴 메서드 분해 + 성능 최적화 | 낮음 |
| **10** | Zustand 셀렉터 도입 | 낮음 |

---

## 011-apple-oauth-login — Polish 기록 (2026-04-20)

### T044 시크릿 스캔 결과 (SC-006)

`grep` 기반 범위 스캔:

| 항목 | 결과 |
|------|------|
| `BEGIN (EC/RSA )?PRIVATE KEY` 포함 파일 | `backend/.env.example` (placeholder 주석), `specs/011-apple-oauth-login/quickstart.md` (예시 문서) — 실제 키 노출 **없음** |
| `*.p8`, `AuthKey_*` 파일 | 리포지토리 전역 **없음** |
| `backend/.env` / `frontend/.env` | `.gitignore`에 등록되어 커밋 대상 아님 (git check-ignore 확인 완료) |
| `.env.local`, 빌드 산출물 | 미존재 |

**결론**: Apple private key 평문 누출 없음. `.env` 주입 경로는 path 또는 escape된 inline 문자열 두 가지를 지원하며 `APPLE_PRIVATE_KEY_PATH=`와 `APPLE_PRIVATE_KEY=` 중 하나만 채우도록 주석으로 명시.

### T043 Quickstart 수동 검증

실기기/시뮬레이터에서 `specs/011-apple-oauth-login/quickstart.md` §2 시나리오를 수행해야 한다(개발 브랜치 PR 리뷰 시 수행). 자동화된 단위·통합·Maestro 테스트는 본 리팩토링 내에서 모두 green.

### T048 Maestro E2E 실행 대상

- `.maestro/auth/login-apple.yml` (신규 로그인 해피 패스)
- `.maestro/auth/login-apple-relogin.yml` (재로그인 데이터 보존)
- `.maestro/auth/login-apple-cancel.yml` (취소 복구)

실기기 연결 환경에서 `maestro test ...` 로 실행해 녹화 확보 예정.
