# Phase 1 Data Model — UI 버튼 클릭음

**Feature**: `feature/006-ui-button-sound`
**Scope**: Frontend 로컬 상태 + 런타임 엔티티 (백엔드 스키마 변경 없음)

---

## 1. SoundPreference (영속 로컬 설정)

| 필드 | 타입 | 기본값 | 제약/비고 |
|------|------|--------|-----------|
| `enabled` | `boolean` | `true` | 사용자가 설정 화면에서 제어. 로드 실패 시 기본값 폴백. |

**저장소**: `expo-secure-store`
**키**: `ui.buttonClickSound.enabled`
**직렬화**: `"true"` / `"false"` 문자열. 읽기 시 `value === "true"`로 엄격 비교(그 외 모두 `true` 폴백 **아님** — `false`만 엄격히 인식하고 나머지는 기본 `true`).
**상태 전이**:

```text
[부트] → hydrate()
         ├─ 저장값 존재 → enabled = parsed
         └─ 없음/오류   → enabled = true (기본값)

[사용자 토글] → setEnabled(next)
              ├─ 메모리 상태 즉시 갱신(UI 반영)
              └─ secure-store write (실패 시 console.warn만, UI 롤백 없음)
```

**검증 규칙**:
- 로드 값이 `"true"|"false"` 외 형태면 기본값 `true`를 사용하고 비정상 값을 재기입(`setEnabled(true)`)해 정리.

---

## 2. ClickSoundAsset (런타임 플레이어 상태)

| 필드 | 타입 | 설명 |
|------|------|------|
| `assetModule` | `number` | `require('...click_2-476372.mp3')` 반환값 |
| `player` | `AudioPlayer \| null` | `createAudioPlayer`로 생성된 expo-audio 인스턴스 |
| `status` | `'idle' \| 'loading' \| 'ready' \| 'error'` | 로딩 수명 |

**상태 전이**:

```text
idle
 │ preload() 호출
 ▼
loading
 ├─ success → ready
 └─ throw   → error (재생 호출은 no-op)
```

**의미**:
- `ready`: `play()` 허용.
- `error`: 영구 no-op (FR-010: 사용자에게 오류 노출 금지).
- `loading`: `play()` 호출 시 대기하지 않고 즉시 skip (지연 허용 금지).

---

## 3. PlaybackGuard (도메인 규칙, 비엔티티)

`play()` 호출 시 다음 AND 조건을 모두 충족해야 실제 재생한다:

```text
soundPref.enabled === true
  && recordingActive === false
  && asset.status === 'ready'
```

- `recordingActive`: `soundService.setRecordingActive(boolean)`로 외부에서 주입. `useVoiceRecording`의 `startRecording` 진입/`stopRecording` 종료 시점에 호출한다.
- **앱이 background**인 경우: RN의 표준 동작상 오디오 세션이 중단되므로 별도 분기 불필요.

---

## 4. 백엔드 영향

- **없음**. `@API_SPEC.md`, `@DDL.sql`, `users` 스키마, `/users/me` 응답 모두 변경 없음.
- 사용자 프로필과 동기화하지 않는다(R4 결정 참조).

---

## 5. 테스트 대상 데이터 시나리오

| # | 시나리오 | 기대 동작 |
|---|----------|-----------|
| 1 | 첫 설치 후 최초 부트 | hydrate → enabled=true → 클릭음 재생 |
| 2 | 사용자가 토글 OFF → 앱 kill → 재실행 | hydrate → enabled=false → 클릭음 무음 |
| 3 | 저장소에 손상된 값("foo") | hydrate → enabled=true, 저장값 "true"로 치유 |
| 4 | `preload()` 실패 (asset 손상) | status=error → 모든 play() no-op, 앱 정상 동작 |
| 5 | 녹음 시작 직전 탭 → 녹음 시작 → 탭 → 녹음 종료 → 탭 | 1·3번째 탭은 재생, 2번째 탭은 무음 |
| 6 | 100ms 간격 5회 연속 탭 | 5회 모두 재생, 끊김 없음 (seekTo(0)+play) |
