# UI/UX 구현 현황

**Branch**: `feature/001-todo-mobile-service` | **Last Updated**: 2026-03-30

## 구현된 화면

### 0. 메인 화면 (MainScreen) — 설정 네비게이션

**파일**: `frontend/src/screens/main/MainScreen.tsx`

#### 설정 이동 버튼

| testID | 유형 | 설명 |
|--------|------|------|
| `settings-button` | TouchableOpacity | 헤더 우측 설정 아이콘 (⚙) — 탭 시 `onNavigateSettings` 콜백 호출 |

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
