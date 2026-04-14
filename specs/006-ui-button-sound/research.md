# Phase 0 Research — UI 버튼 클릭음 추가

**Feature**: `feature/006-ui-button-sound`
**Date**: 2026-04-13
**Status**: Complete

모든 기술 의사결정을 다음 형식으로 기록한다: **Decision / Rationale / Alternatives**.

---

## R1. 사운드 재생 API 선택

### Decision

`expo-audio`의 **싱글톤 `AudioPlayer`**(`createAudioPlayer(require(asset))`)를 앱 부트 시 1회 생성하고, 각 클릭에서 `player.seekTo(0)` 후 `player.play()`로 재생한다. 훅 기반(`useAudioPlayer`)을 컴포넌트 별로 호출하지 않는다.

### Rationale

- **프리로드 + 재생 지연 최소화**: `useAudioPlayer`는 호출 컴포넌트 라이프사이클에 종속되며, 매 컴포넌트 마운트 시 로딩 비용이 분산 발생한다. 앱 수명 동안 딱 1회 로드해 두면 150ms 이내 재생(SC-002)이 안정적이다.
- **연속 탭 대응**: `seekTo(0)` → `play()` 패턴은 짧은 SFX에서 가장 널리 쓰이는 방식이며, 100ms 간격 연속 탭에서도 끊김 없이 재생된다.
- **기존 코드와 일관성**: `useVoiceRecording.ts`가 이미 `expo-audio`를 사용해 네이티브 링크가 검증되어 있어 신규 모듈 설치·EAS dev 빌드 불필요.

### Alternatives considered

- **`useAudioPlayer` 훅을 각 Touchable에서 사용**: 리소스 중복 로딩, 메모리·배터리 비용 증가로 기각.
- **expo-av**: Expo 55+에서 deprecated, 유지보수 리스크로 기각.
- **react-native-sound**: 별도 네이티브 모듈 추가 필요 → EAS dev 빌드 요구. 기존 `expo-audio`로 충분하므로 단순성 원칙(헌법 VI) 위배.

---

## R2. 무음 모드 / 오디오 세션 정책

### Decision

**플랫폼 기본 동작을 따른다**. 별도 AudioSession 카테고리 지정 없이 `expo-audio`의 기본값을 사용한다. 즉 `setAudioModeAsync`를 본 기능에서 호출하지 않고, 기기 무음 모드 / 미디어 볼륨에 자연스럽게 연동시킨다.

### Rationale

- iOS: `expo-audio`의 기본 카테고리는 "Ambient"에 해당하여 무음 스위치 ON 시 자동 음소거(FR-008, SC-005 충족).
- Android: 기본적으로 `STREAM_MUSIC`을 따르므로 미디어 볼륨 0 시 자연 음소거.
- 별도 정책을 우리가 지정하면 다른 오디오(전화, 음악)를 끊을 위험이 있다(Edge Case: 백그라운드 오디오 존중).

### Alternatives considered

- **AudioSession "Playback" 강제** (무음 모드 무시): 사용자 경험 악화, SC-005 위배로 기각.
- **사용자 설정으로 세션 모드 노출**: 복잡도 증가, YAGNI.

---

## R3. 녹음 중 클릭음 충돌 회피

### Decision

`soundService`에 `setRecordingActive(active: boolean)` 플래그를 두고, `useVoiceRecording`의 `startRecording`/`stopRecording`에서 플래그를 On/Off한다. `play()` 가드에서 `isRecordingActive === true`면 즉시 no-op.

### Rationale

- `useVoiceRecording`이 `setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })`를 설정하는 동안 동일 세션에서 재생이 섞이면 STT 품질/세션 충돌 위험이 있다(FR-013).
- 단일 플래그로 전역 판단 → 구현/테스트 단순.

### Alternatives considered

- **녹음 화면에서만 `SoundPressable`의 `disableSound` prop 사용**: 개별 버튼 단위 누락 위험 → 체계적 보호가 아님.
- **expo-audio의 자동 duck**: 제어권이 OS에 있어 150ms 보장 깨짐.

---

## R4. 설정 영속화 위치 (로컬 vs 백엔드)

### Decision

**로컬 영속화만** (`expo-secure-store` 키 `ui.buttonClickSound.enabled`). 백엔드 `users` 테이블/`@API_SPEC.md` 변경 없음.

### Rationale

- 클릭음 선호는 **기기/환경에 강하게 종속**된다(같은 사용자가 집에서는 끄고 이어폰 시 켜고 싶어할 수 있음). 크로스 디바이스 동기화는 오히려 반직관적 UX를 만든다.
- 백엔드 스키마 변경 → 마이그레이션 + API 계약 업데이트 → 범위 확장. 단순성 원칙(헌법 VI) 위반.
- `language`/`timezone`은 콘텐츠 렌더링에 영향(크로스 디바이스 일관성 필요)하므로 백엔드 저장이 타당하지만, **UX 피드백 토글은 별개**.

### Alternatives considered

- **백엔드 `UserProfile.uiSoundEnabled` 추가**: 스키마 변경, `/users/me` 계약 확장, 타이밍상 플레이스홀더 동안의 잘못된 재생 가능성 → 기각.
- **AsyncStorage**: 민감 정보 아니라 사용 가능하나, 프로젝트가 이미 `expo-secure-store`를 설치해 둔 일관성 유지 차 기존 도구 재사용.

---

## R5. 기존 Touchable 점진 교체 전략

### Decision

**`SoundPressable` 래퍼 컴포넌트**(내부적으로 기존 `TouchableOpacity` 동작 유지) + `useClickSound` 훅을 동시에 제공한다. 신규 코드는 `SoundPressable` 사용을 권장하고, 기존 코드는 **우선순위 큐**로 점진 교체한다.

**교체 우선순위**:
1. **P1 (필수)**: 공통 버튼 컴포넌트 (`VoiceTodoButton`, `CompleteDayButton`, `ShareButton`, `ModeToggle`, `TodoActionButtons`) — 한 번 교체로 여러 화면 커버.
2. **P2**: 각 화면 상단/하단의 주요 액션 버튼 (설정 저장, 로그인/로그아웃, 추가 버튼).
3. **P3**: 리스트 아이템(`TodoItem`), 토글, 메뉴/옵션 선택 항목.
4. **제외**: 드래그/스와이프 전용 제스처, `ScrollView`/`FlatList`의 스크롤.

### Rationale

- 일괄 교체 시 40~60곳 변경 → PR 크기 폭증·회귀 위험. 우선순위 교체로 MVP 가치를 먼저 전달 후 확장.
- 훅(`useClickSound().play`)을 병행 제공하면 래퍼가 부적합한 경우(예: `onPressIn`만 필요한 제스처 컴포넌트) 유연 대응.

### Alternatives considered

- **전역 gesture responder 훅**: React Native 터치 이벤트 경로가 다양(`Pressable`, `TouchableOpacity`, `GestureHandler`)해 일관성 보장 어려움.
- **Babel 플러그인으로 자동 주입**: 블랙박스, 디버깅 난이도 ↑. 단순성 원칙 위배.

---

## R6. MP3 번들링 및 프리로드

### Decision

`require('../../../assets/u_o8xh7gwsrj-app_interface_click_2-476372.mp3')` 결과를 `soundService.preload()`에 전달한다. 앱 진입 직후(`App.tsx`의 `useEffect`)에서 `preload()`를 호출하고, 실패 시 무음 폴백. 추가 CDN/런타임 다운로드 없음.

### Rationale

- Expo 빌드가 MP3를 번들에 자동 포함하므로 오프라인 즉시 재생 가능.
- `useEffect`에서 호출해도 첫 번째 탭 발생 전 거의 항상 완료된다(일반적 앱 진입 흐름 1~3초).

### Alternatives considered

- **Lazy load (첫 탭 직전 로드)**: 첫 탭에서 150ms 지연 초과 가능 → SC-002 실패 위험.
- **Asset prefetch via `expo-asset`**: 추가 의존성. `require` + 플레이어 생성으로 동일 효과.

---

## 해소 요약

| 항목 | 상태 |
|------|------|
| 재생 API | ✅ expo-audio 싱글톤 플레이어 |
| 오디오 세션 정책 | ✅ 플랫폼 기본 유지 |
| 녹음 중 충돌 | ✅ `setRecordingActive` 플래그 |
| 영속화 | ✅ `expo-secure-store` 로컬 |
| 교체 전략 | ✅ `SoundPressable` + 우선순위 교체 |
| 번들링 | ✅ `require` + 부트 프리로드 |

**모든 NEEDS CLARIFICATION 해소**. Phase 1 진행 가능.
