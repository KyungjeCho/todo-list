# UI/UX 설계 및 구현 현황

**Branch**: `feature/002-uiux-update` | **Last Updated**: 2026-04-03

## 디자인 리소스

| 리소스 | 경로 | 설명 |
|--------|------|------|
| Design System | [`docs/designs/DESIGN_SYSTEM.md`](designs/DESIGN_SYSTEM.md) | 컬러, 타이포, 컴포넌트 토큰 |
| Screen Spec | [`docs/designs/SCREENS.md`](designs/SCREENS.md) | 전체 화면 흐름 및 상세 스펙 |
| SVG Icons | [`docs/designs/icons/`](designs/icons/) | Style A 아이콘 (24x24, 1.5px stroke) |
| Paper 원본 (공식 소스) | [Paper Design](https://app.paper.design/file/01KN1JJXBWWPNF44VBZ7DEF423?page=01KN1JJXBW47Q3GB6SG4VWQSTF) | 디자인 원본 파일 — 모든 디자인 의사결정의 단일 진실 소스(Single Source of Truth) |

---

## 화면 목록

| # | 화면 | 상태 | 설명 |
|---|------|------|------|
| 1 | Login | 디자인 완료 | OAuth 로그인 (Google/Naver/Kakao/Apple) |
| 2 | Onboarding | 디자인 완료 | 루틴 시간 설정 (계획/회고) |
| 3 | Plan Mode | 디자인 완료 | 오늘의 할 일 목록 + FAB |
| 3-1 | Plan — Input Active | 디자인 완료 | 블러 오버레이 + 키보드 입력 |
| 3-2 | Plan — Item Expanded | 디자인 완료 | 삭제/비활성화/메모 액션 |
| 3-3 | Plan — Empty State | 디자인 완료 | 할 일 없음 안내 |
| 4 | Review Mode | 디자인 완료 | 완료/미완료 분류 + 일정 완료 |
| 4-1 | Review — 일정 완료 | 디자인 완료 | 성공 요약 (달성률) |
| 4-2 | Review — 회고 완료 | 디자인 완료 | 읽기 전용 + 이월 표시 |
| 5 | Calendar | 디자인 완료 | 월간 캘린더 + 일별 상세 (통합) |
| 7 | Settings | 디자인 완료 | 알림/지역/정보/연락처 |
| 7-1 | Contact | 디자인 완료 | 개발자 연락처 + 후원 링크 |

---

## 화면 흐름

```
Login → Onboarding → Plan Mode ←→ Review Mode
                         │                │
                    Input Active      일정 완료
                    Item Expanded     회고 완료
                    Empty State
                         │
              Tab Bar: 홈 / 캘린더 / 설정
                              │         │
                          Calendar   Settings → Contact
```

---

## Design System 요약

### Colors
- **Primary**: `#6366F1` (Indigo) — 브랜드, 인터랙션
- **Surface**: `#F8FAFC` (Slate 50) — 화면 배경
- **Success**: `#22C55E` (Green) — 완료 상태
- **Warning**: `#F59E0B` (Amber) — 이월 표시
- **Error**: `#EF4444` (Red) — 삭제, 위험

### Typography
- **Font**: Noto Sans
- **H1**: 24px/Bold | **H2**: 18px/SemiBold | **Body**: 15px/Regular
- **Caption**: 13px/Medium | **Overline**: 11px/SemiBold | **Label**: 10px/SemiBold

### Icons
- **Style**: 24x24 viewBox, 1.5px stroke, round cap/join
- **경로**: `docs/designs/icons/*.svg`
- bell, calendar, checkmark, chevron-left, chevron-right, clock, coffee, document, globe, heart, home, mail, mic, note, plus, settings, shield, trash

---

## 구현된 화면

### 0. 메인 화면 (MainScreen) — 설정 네비게이션

**파일**: `frontend/src/screens/main/MainScreen.tsx`

#### 설정 이동 버튼

| testID | 유형 | 설명 |
|--------|------|------|
| `settings-button` | TouchableOpacity | 헤더 우측 설정 아이콘 — 탭 시 `onNavigateSettings` 콜백 호출 |

위치: 헤더 우측, ModeToggle 옆

---

### 1. 설정 화면 (SettingsScreen)

**파일**: `frontend/src/screens/settings/SettingsScreen.tsx`
**Phase**: 6 (US4 — 푸시 알림)

#### 구성 요소

| testID | 유형 | 설명 |
|--------|------|------|
| `settings-screen` | ScrollView | 설정 화면 최상위 컨테이너 |
| `plan-time-value` | Text | 계획 알림 시간 표시 (HH:mm 또는 "해제됨") |
| `plan-time-button` | TouchableOpacity | 계획 시간 변경 버튼 (탭 → 시간 선택 UI) |
| `plan-notification-toggle` | TouchableOpacity+Switch | 계획 알림 해제/활성화 토글 |
| `review-time-value` | Text | 회고 알림 시간 표시 |
| `review-time-button` | TouchableOpacity | 회고 시간 변경 버튼 |
| `review-notification-toggle` | TouchableOpacity+Switch | 회고 알림 해제/활성화 토글 |
| `timezone-value` | Text | 현재 타임존 표시 |
| `timezone-button` | TouchableOpacity | 타임존 변경 버튼 (탭 → 목록 표시) |
| `timezone-picker` | FlatList | 타임존 선택 목록 |
| `time-picker` | DateTimePicker | 시간 선택 UI (mode: time) |
| `time-picker-confirm` | TouchableOpacity | 시간 선택 확인 버튼 |
| `settings-loading` | ActivityIndicator | 로딩 상태 표시 |

#### 상태 처리

- **Loading**: `isLoading=true` → ActivityIndicator 표시 (testID: `settings-loading`)
- **Error**: `error` prop → 에러 메시지 배너 표시 (빨간 배경)
- **Empty/Default**: 프로필 데이터 기반 현재 값 표시

#### 사용자 흐름

1. 알림 시간 변경: 시간 버튼 탭 → DateTimePicker → 시간 선택 → 확인 → `onUpdateSettings` 호출
2. 알림 해제: 토글 탭 → `planTime: null` / `reviewTime: null` 전송
3. 알림 재활성화: 토글 탭 → 기본 시간 (계획: 08:00, 회고: 22:00) 전송
4. 타임존 변경: 타임존 버튼 탭 → 목록에서 선택 → `onUpdateSettings` 호출

#### Props

```typescript
interface SettingsScreenProps {
  profile: UserProfile;
  onUpdateSettings: (data: UpdateSettingsRequest) => Promise<UserProfile>;
  isLoading?: boolean;
  error?: string;
}
```

---

## 구현된 Hook

### 1. usePushNotification

**파일**: `frontend/src/features/notification/usePushNotification.ts`
**Phase**: 6 (US4 — 푸시 알림)

#### 기능

- 앱 마운트 시 FCM 권한 요청 및 토큰 획득
- 토큰 획득 시 서버 디바이스 등록 (`onRegisterDevice` 콜백)
- 토큰 갱신 시 자동 재등록
- foreground 알림 수신 리스너
- 언마운트 시 리스너 자동 정리

#### 사용법

```typescript
usePushNotification({
  onRegisterDevice: async ({ fcmToken, deviceType }) => { ... },
  onUnregisterDevice: async (fcmToken) => { ... },
  onTokenRegistered: (token) => { ... },
  onError: (error) => { ... },
});
```

### 2. Plan — Input Active (Screen 3-1)

**파일**: `frontend/src/components/todo/InputOverlay.tsx`
**통합**: `frontend/src/screens/main/MainScreen.tsx`
**Phase**: US1 — 할 일 입력 오버레이

#### 구성 요소

| testID | 유형 | 설명 |
|--------|------|------|
| `input-overlay` | View | 오버레이 최상위 컨테이너 (absoluteFill, zIndex: 100) |
| `input-overlay-backdrop` | TouchableWithoutFeedback + BlurView | 블러 배경 (#0F172A4D + blur intensity 20) — 탭 시 onClose |
| `input-overlay-text-input` | TextInput | 하단 입력 필드 (height 42, borderRadius 12, #F1F5F9 배경) |
| `input-overlay-submit-button` | TouchableOpacity | (+) 제출 버튼 (42x42, r21, #6366F1 배경) |
| `fab-add-button` | TouchableOpacity | FAB(+) 버튼 (48x48, r24, #6366F1, shadow) — 오버레이 비활성 시만 표시 |

#### Props

```typescript
interface InputOverlayProps {
  visible: boolean;
  mode: 'todo' | 'memo';
  placeholder: string;
  onSubmit: (text: string) => void;
  onClose: () => void;
}
```

#### 상태 처리

- **Visible** (`visible=true`): 블러 오버레이 + 하단 입력 바 표시, 키보드 auto-focus (100ms delay)
- **Hidden** (`visible=false`): 컴포넌트 미렌더링 (`return null`), 텍스트 초기화
- **FAB 연동**: 오버레이 활성 시 FAB 숨김 (`!isInputOverlayVisible`)

#### 사용자 흐름

1. FAB(+) 탭 → `isInputOverlayVisible=true` + `mode='todo'`
2. 블러 오버레이 표시 → TextInput auto-focus → 키보드 자동 표시
3. 텍스트 입력 → (+) 버튼 탭 또는 키보드 Return → `onSubmit(text)` 호출
4. 할 일 추가 완료 → 오버레이 닫힘 + 텍스트 초기화
5. 배경 탭 또는 Android Back → `onClose()` → 오버레이 닫힘
6. 확장된 아이템에서 "+ 메모" 버튼 → `mode='memo'` + 오버레이 표시

---

### 3. Plan — Item Expanded (Screen 3-2)

**파일**: `frontend/src/components/todo/TodoItem.tsx`
**액션 버튼**: `frontend/src/components/todo/TodoActionButtons.tsx`
**메모 섹션**: `frontend/src/components/todo/MemoSection.tsx`
**통합**: `frontend/src/screens/main/MainScreen.tsx`
**Phase**: US2 — 할 일 아이템 확장

#### 구성 요소

| testID | 유형 | 설명 |
|--------|------|------|
| `todo-item-{id}` | TouchableOpacity | 할 일 아이템 — 탭 시 확장/접기 토글 |
| `todo-checkbox-{id}` | TouchableOpacity | 체크박스 (22x22, r6) — 완료 토글 |
| `todo-edit-input-{id}` | TextInput | 확장 시 인라인 수정 입력 필드 |
| `carried-over-badge-{id}` | View | 이월 뱃지 (#FEF3C7 bg, #D97706 text) |
| `chevron-up-{id}` | TouchableOpacity | 접기 버튼 (확장 시만 표시) |
| `action-buttons-container` | View | 액션 버튼 그룹 컨테이너 |
| `action-delete-button` | TouchableOpacity | 삭제 버튼 (#EF4444 텍스트) |
| `action-deactivate-button` | TouchableOpacity | 비활성화 버튼 (#64748B 텍스트) |
| `action-add-memo-button` | TouchableOpacity | "+ 메모" 버튼 (#6366F1 텍스트) |
| `memo-section-{todoId}` | View | 메모 목록 컨테이너 |
| `memo-item-{memoId}` | TouchableOpacity | 메모 카드 (흰 배경, r8) — 탭 시 인라인 수정 |
| `memo-edit-input-{memoId}` | TextInput | 메모 수정 입력 필드 |
| `memo-edit-confirm-{memoId}` | TouchableOpacity | 메모 수정 확인 (✓) |
| `memo-delete-{memoId}` | TouchableOpacity | 메모 삭제 (✕) |

#### Props

```typescript
interface TodoItemProps {
  todo: Todo;
  isExpanded?: boolean;
  onExpand?: (id: string | null) => void;
  onToggleComplete?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
  onDeactivate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddMemo?: (todoId: string, content: string) => void;
  onAddMemoOverlay?: (todoId: string) => void;
  onUpdateMemo?: (todoId: string, memoId: string, content: string) => void;
  onDeleteMemo?: (todoId: string, memoId: string) => void;
}

interface TodoActionButtonsProps {
  onDelete: () => void;
  onDeactivate: () => void;
  onAddMemo: () => void;
}

interface MemoSectionProps {
  todoId: string;
  memos: TodoMemo[];
  onUpdateMemo?: (memoId: string, content: string) => void;
  onDeleteMemo?: (memoId: string) => void;
}
```

#### 상태 처리

- **Collapsed** (기본): 체크박스 + 텍스트 + 메모 카운트 아이콘. 배경 #FFFFFF
- **Expanded** (`isExpanded=true`): #EEF2FF 배경 + 3px #6366F1 좌측 border + 인라인 수정 + 액션 버튼 + 메모 카드 + chevron-up
- **Completed**: line-through + #94A3B8 텍스트
- **Inactive**: opacity 0.5
- **단일 확장**: `expandedTodoId` state로 하나만 동시 확장 (MainScreen에서 관리)

#### 사용자 흐름

1. 아이템 탭 → `expandedTodoId` 토글 → 확장 UI 표시 (Indigo 배경 + border)
2. 확장 시: 텍스트 → TextInput으로 전환 (인라인 수정 가능)
3. 삭제 버튼 탭 → Alert 확인 → `onDelete(id)` 호출
4. 비활성화 버튼 탭 → `onDeactivate(id)` 호출
5. "+ 메모" 버튼 탭 → InputOverlay(`mode='memo'`) 표시
6. 메모 카드 탭 → 인라인 수정 모드 → 수정 확인(✓) → `onUpdateMemo` 호출
7. chevron-up 탭 → `onExpand(null)` → 접기
8. 다른 아이템 탭 → 이전 아이템 접기 + 새 아이템 확장

---

### 4. Plan — Empty State (Screen 3-3)

**파일**: `frontend/src/components/todo/EmptyState.tsx`
**통합**: `frontend/src/screens/main/MainScreen.tsx`
**Phase**: US3 — 빈 상태 화면

#### 구성 요소

| testID | 유형 | 설명 |
|--------|------|------|
| `empty-state` | View | 빈 상태 최상위 컨테이너 (중앙 정렬, flex: 1) |
| `empty-state-icon-container` | View | Checkmark 아이콘 컨테이너 (64x64, r9999, #EEF2FF 배경) |
| `empty-state-checkmark` | Svg | Checkmark 아이콘 (24x24, #6366F1 stroke) |

#### 렌더링 조건

- `todos.length === 0 && !error` — Plan 모드에서 할 일이 없고 에러가 아닌 경우

#### 레이아웃

- 중앙 정렬 (justifyContent: center, alignItems: center)
- Indigo 50 라운드 컨테이너 (64x64, borderRadius: 9999, #EEF2FF)
- Checkmark SVG 아이콘 (24x24, #6366F1 stroke, 1.5px)
- H2 텍스트: "오늘의 할 일이 없어요" (18px/SemiBold, #0F172A)
- Caption 텍스트: "우측 하단의 + 버튼을 눌러\n오늘의 계획을 추가해보세요" (13px/Medium, #64748B, center)
- FAB(+) 버튼은 빈 상태에서도 표시됨

---

## 참고 사항

- docs/designs/DESIGN_SYSTEM.md (디자인 시스템 컴포넌트 속성)
- docs/designs/SCREENS.md (스크린 구성)
- docs/designs/rn/*  (Paper Design react native 컴포넌트 Export)
- [Paper Design 원본](https://app.paper.design/file/01KN1JJXBWWPNF44VBZ7DEF423?page=01KN1JJXBW47Q3GB6SG4VWQSTF) — 공식 디자인 소스
