# UI/UX 설계 및 구현 현황

**Branch**: `feature/001-todo-mobile-service` | **Last Updated**: 2026-04-02

## 디자인 리소스

| 리소스 | 경로 | 설명 |
|--------|------|------|
| Design System | [`docs/designs/DESIGN_SYSTEM.md`](designs/DESIGN_SYSTEM.md) | 컬러, 타이포, 컴포넌트 토큰 |
| Screen Spec | [`docs/designs/SCREENS.md`](designs/SCREENS.md) | 전체 화면 흐름 및 상세 스펙 |
| SVG Icons | [`docs/designs/icons/`](designs/icons/) | Style A 아이콘 (24x24, 1.5px stroke) |
| Paper 원본 | Paper "Scratchpad" → Page 1 | 디자인 원본 파일 |

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

## 참고 사항

- docs/designs/DESIGN_SYSTEM.md (디자인 시스템 컴포넌트 속성)
- docs/designs/SCREENS.md (스크린 구성)
- docs/designs/rn/*  (Paper Design react native 컴포넌트 Export)
- https://app.paper.design/file/01KN1JJXBWWPNF44VBZ7DEF423?page=01KN1JJXBW47Q3GB6SG4VWQSTF  (페이퍼 디자인)
