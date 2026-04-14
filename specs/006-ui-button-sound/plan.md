# Implementation Plan: UI 버튼 클릭음 추가

**Branch**: `feature/006-ui-button-sound` | **Date**: 2026-04-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-ui-button-sound/spec.md`

## Summary

앱 내 모든 상호작용 UI(버튼, 리스트 항목, 탭, 토글 등)에 일관된 클릭음을 부여한다. 자원은 `frontend/assets/u_o8xh7gwsrj-app_interface_click_2-476372.mp3` 한 개로 고정하고, 이미 설치된 `expo-audio`의 `useAudioPlayer`를 활용해 앱 시작 시 1회 프리로드 후 전역 싱글톤 플레이어로 즉시 재생한다. 사용자 설정에는 "버튼 클릭음" 토글(기본값 켜짐)을 추가하고, 기기 단위 로컬 설정이므로 `expo-secure-store`에 영속화한다(백엔드 스키마 변경 없음). 탭 확정 시점에만 재생되도록 기존 Touchable 컴포넌트를 얇게 래핑하는 `<SoundPressable>`/훅 계층을 도입하고, Maestro E2E로 토글 켜짐/꺼짐 경로를 검증한다.

## Technical Context

**Language/Version**: TypeScript 5.9 (Frontend)
**Primary Dependencies**:
- React Native 0.83.2 / Expo ~55
- **expo-audio ~55.0.9** (이미 설치·링크됨 — 신규 네이티브 모듈 추가 없음)
- expo-secure-store ~55.0.9 (토글 영속화)
- Zustand 5.x (전역 상태: `soundStore`)
- react-i18next / i18next (설정 UI 라벨)
**Storage**:
- 로컬: `expo-secure-store` 키 `ui.buttonClickSound.enabled` (boolean, 기본값 `true`)
- 백엔드 변경 없음 — 기기 단위 UX 설정이며 사용자 프로필에 동기화하지 않는다(Rationale: research.md 참조).
**Testing**:
- Unit/Integration: Jest + `@testing-library/react-native`
- E2E: **Maestro MCP + Android 에뮬레이터**, YAML은 `.maestro/settings/button-sound-toggle.yaml`
**Target Platform**: Android + iOS (Expo 관리 워크플로우, 본 feature는 안드로이드 에뮬레이터에서 우선 E2E 검증)
**Project Type**: Mobile app (Frontend 단독 변경, Backend 변경 없음)
**Performance Goals**:
- 탭→사운드 재생 지연 150ms 이내 (SC-002)
- 앱 기준선 대비 평균 프레임 드랍/탭 반응/배터리 증가 5% 이내 (SC-004)
- 연속 탭 100ms 간격에서도 끊김 없이 재생 (FR-012)
**Constraints**:
- 오프라인에서 즉시 재생 (자원은 앱 번들에 포함, 네트워크 의존 없음)
- 마이크 사용 화면(`useVoiceRecording.ts`)에서 녹음 세션과 충돌 금지 — 녹음 중에는 클릭음 음소거
- 기기 무음/미디어 볼륨 정책 준수 (iOS: 기본 AudioSession Ambient, Android: STREAM_MUSIC 기본)
- **EAS dev 빌드 불필요**: `expo-audio`, `expo-secure-store`는 현 `frontend/ios`, `frontend/android` prebuild에 이미 포함됨. 검증 필요한 경우에만 `eas build --profile development --platform android`로 재빌드.
**Scale/Scope**:
- 영향 파일: 기존 Touchable 사용처 약 40~60곳 (단계적 교체)
- 신규 파일: 훅/컴포넌트 2~3개, 스토어 1개, E2E YAML 1개
- 번들 추가 크기: MP3 한 개(<100KB 예상) — 이미 레포에 존재

## Constitution Check

헌법 v1.3.0의 10개 원칙을 게이트로 평가.

| # | 원칙 | 통과 여부 | 메모 |
|---|------|----------|------|
| I | 한국어 우선 | ✅ | spec/plan/tasks/문서 모두 한국어, 코드 식별자 영어(`useClickSound`, `SoundPressable`, `soundStore`) |
| II | 엄격한 TypeScript | ✅ | `any` 금지, 토글 값은 `boolean` 타입, `expo-secure-store` 읽기 시 런타임 검증 후 boolean 변환 |
| III | TDD 우선 | ✅ | 훅/스토어/컴포넌트 단위 테스트 선작성, Maestro E2E 선작성(Red) 후 구현(Green) |
| IV | 계층 분리 | ✅ | `screen`(SettingsScreen) → `feature`(useClickSound) → `service`(soundService/soundPlayer) → `infra`(expo-audio, secure-store). 비즈니스 규칙(토글/무음 판단)은 UI에 직접 의존하지 않음 |
| V | 실패 처리/관측성 | ✅ | 자원 로딩 실패 시 무음 처리·오류 미노출(FR-010), 개발 로그만 `console.warn`, 사용자 설정 로드 실패 시 기본값(켜짐) 폴백 |
| VI | 단순성 우선 | ✅ | 신규 라이브러리 0개(expo-audio 재사용), 추상화는 "프리로드 싱글톤 + 얇은 래퍼"만, 햅틱 등 범위 확장 제외 |
| VII | 명세서 중심 개발 | ✅ | 현재 기능은 API/DB/UIUX 문서에 새로운 계약을 추가하지 않음. Settings UI 변경은 `@UIUX.md`(존재 시)에 Phase 1에서 1줄 업데이트, API 스키마 변경 없음 |
| VIII | 주석 전략 | ✅ | 공개 훅 `useClickSound`·컴포넌트 `SoundPressable`는 JSDoc, 나머지는 WHY 주석만 |
| IX | 브랜치 전략 | ✅ | 현 브랜치 `feature/006-ui-button-sound` (헌법 명명 규칙 준수, main 병합은 PR 필수) |
| X | E2E/Maestro | ✅ | `.maestro/settings/button-sound-toggle.yaml` TDD로 선작성, `appId: com.yourapp.example`, `clearState: true`, testID 기반 탐색 |

**결과**: 모든 게이트 통과. Complexity Tracking 기재 없음.

## Project Structure

### Documentation (this feature)

```text
specs/006-ui-button-sound/
├── plan.md                    # 본 파일
├── research.md                # Phase 0 산출물
├── data-model.md              # Phase 1 산출물 (로컬 설정 모델, 사운드 플레이어 상태)
├── quickstart.md              # Phase 1 산출물 (개발자 검증 플로우)
├── contracts/                 # Phase 1 산출물 (훅/컴포넌트 TS 시그니처)
│   └── sound-feedback.contract.ts
└── tasks.md                   # Phase 2 산출물 (/speckit.tasks 에서 생성)
```

### Source Code (repository root)

```text
frontend/
├── assets/
│   └── u_o8xh7gwsrj-app_interface_click_2-476372.mp3   # 기존 자원 재사용
├── src/
│   ├── features/
│   │   └── sound/                                       # 신규
│   │       ├── useClickSound.ts                         # 재생 훅 (플레이 트리거)
│   │       ├── soundService.ts                          # 싱글톤 플레이어 (expo-audio 래핑)
│   │       └── index.ts
│   ├── components/
│   │   └── common/                                      # 신규 디렉토리
│   │       └── SoundPressable.tsx                       # TouchableOpacity/Pressable 래퍼
│   ├── store/
│   │   └── soundStore.ts                                # 신규: Zustand + secure-store 영속화
│   ├── screens/
│   │   └── settings/
│   │       └── SettingsScreen.tsx                       # 기존 수정: "버튼 클릭음" Switch 추가
│   ├── i18n/
│   │   └── locales/{ko,en,ja,es}.json                   # 기존 수정: settings.buttonClickSound 키 추가
│   └── app/
│       └── App 초기화 경로(App.tsx 또는 entry hook)       # 기존 수정: 플레이어 프리로드 호출
├── __tests__/
│   ├── features/sound/
│   │   ├── useClickSound.test.ts
│   │   └── soundService.test.ts
│   ├── components/common/
│   │   └── SoundPressable.test.tsx
│   └── store/
│       └── soundStore.test.ts
└── (빌드/설정 파일 변경 없음)

.maestro/
└── settings/
    └── button-sound-toggle.yaml                         # 신규 E2E
```

**Structure Decision**: `frontend/src/features/sound/`에 사운드 재생 도메인 모듈을 신설한다. 이유:
1. 재생 책임이 screen/component가 아니라 "기능"(UX 피드백)이며, 기존 `features/voice`, `features/share`와 동일한 계층 위치가 적절하다.
2. 싱글톤 플레이어는 `soundService`(infra 래핑), 호출부는 `useClickSound` 훅(feature), UI는 `SoundPressable`(component) — 헌법 IV(계층 분리) 위반 없음.
3. 설정 토글은 Zustand로 전역 상태 유지 + `expo-secure-store` 영속(기존 Zustand store 패턴 — `authStore`, `todoStore` — 과 일치).
4. 기존 Touchable 사용처는 **점진적 교체**한다(전면 일괄 교체 시 회귀 위험↑). Phase 2에서 우선 순위: (a) 자주 사용되는 공통 버튼 → (b) 화면별 주요 버튼 → (c) 리스트 아이템/토글 순서로 교체한다.

## Phase 0: Outline & Research

**목표**: 모든 NEEDS CLARIFICATION 해소, 기술 선택 근거 문서화.

해소 대상(초기 식별):

1. **사운드 재생 API 선택** — 이미 설치된 `expo-audio`의 `useAudioPlayer` vs `createAudioPlayer` 싱글톤. 성능(150ms 지연)과 연속 탭(100ms 간격)에서 끊김 없는 재생 방식 조사.
2. **무음 모드/오디오 세션 정책** — iOS(AudioSession category)와 Android(STREAM)에서 "미디어 볼륨 따르되 무음 모드 존중" 구현 방법.
3. **녹음 중 클릭음 충돌 회피** — `useVoiceRecording.ts`가 `setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })`를 호출하는 중일 때 클릭음이 녹음 품질/세션에 영향 주지 않도록 가드.
4. **설정 영속화 위치** — 로컬(`expo-secure-store`) vs 백엔드 profile(`language`, `timezone`과 동일 패턴). 스펙의 "사용자 단위로 유지"는 기기 단위로 충분한지 판단.
5. **기존 Touchable 점진 교체 전략** — 신규 `SoundPressable`로 래핑 vs 중앙 훅 `useClickSound()` 반환 핸들러 조합. DX/침투도/리팩터 비용 비교.
6. **MP3 파일 번들링** — Expo asset 시스템을 통한 require 및 prefetch. 앱 시작 시 로드 지연 영향.

산출물: `specs/006-ui-button-sound/research.md` — 각 항목별 Decision / Rationale / Alternatives.

**Output**: research.md (6개 의사결정 모두 해소됨)

## Phase 1: Design & Contracts

**Prerequisites**: research.md 완료

### 1) 데이터 모델 — `data-model.md`

- **SoundPreference** (로컬)
  - `enabled: boolean` (기본값 `true`)
  - 저장소: `expo-secure-store`, 키 `ui.buttonClickSound.enabled` (문자열 `"true"|"false"`, 로드 시 검증 후 boolean 변환)
  - 변경 주체: SettingsScreen Switch → `soundStore.setEnabled(boolean)` → secure-store write
  - 로드 시점: 앱 부트 → `soundStore.hydrate()` → 실패 시 기본값 `true` 폴백
- **ClickSoundAsset** (런타임)
  - `assetId: number` (require 결과)
  - `player: AudioPlayer | null` (expo-audio 인스턴스)
  - 상태: `idle → loading → ready → error`. `error`여도 호출부는 무음 처리로 계속 동작(FR-010).
- **PlaybackGuard** (도메인 규칙)
  - 재생 허용 조건 = `preference.enabled && !isRecordingActive && playerState === 'ready'`
  - `isRecordingActive`는 `useVoiceRecording`의 상태를 소비하거나 서비스 레벨 플래그로 관리(Phase 0 결정).

### 2) 인터페이스 계약 — `contracts/sound-feedback.contract.ts`

공개되는 내부 계약(런타임 API 아님, TS 시그니처 수준):

```ts
// features/sound/soundService.ts
export interface ClickSoundService {
  preload(): Promise<void>;          // 앱 부트 시 1회
  play(): void;                      // 비동기 파이어 앤 포겟, 150ms 이내
  setRecordingActive(active: boolean): void;
  dispose(): void;
}

// features/sound/useClickSound.ts
export interface UseClickSoundResult {
  play: () => void;                  // guard 포함
  enabled: boolean;
}

// components/common/SoundPressable.tsx
export interface SoundPressableProps extends TouchableOpacityProps {
  disableSound?: boolean;            // 특정 위치에서만 비활성화 (default false)
}

// store/soundStore.ts
export interface SoundStore {
  enabled: boolean;
  hydrated: boolean;
  hydrate(): Promise<void>;
  setEnabled(v: boolean): Promise<void>;
}
```

SettingsScreen은 `useSoundStore()`를 구독하여 Switch 값/토글을 렌더한다. 백엔드 API 계약 변경 없음 — `@API_SPEC.md` 수정 불필요.

### 3) 빠른 시작 — `quickstart.md`

개발자가 본 브랜치 체크아웃 후 **안드로이드 에뮬레이터**에서 10분 내 검증할 수 있는 경로:
1. `cd frontend && npm install` (신규 의존성 0개 → 설치 변화 없음)
2. `npm start` → Expo dev client(이미 빌드됨) 또는 필요 시 `eas build --profile development --platform android`로 dev 빌드
3. 안드로이드 에뮬레이터 실행, 앱 부트 후 메인 화면 주요 버튼 탭 → 클릭음 확인
4. 설정 진입 → "버튼 클릭음" 토글 OFF → 탭해도 무음 확인
5. 앱 kill → 재실행 → 여전히 OFF 유지 확인
6. Maestro E2E: `maestro test .maestro/settings/button-sound-toggle.yaml`

### 4) 에이전트 컨텍스트 갱신

`.specify/scripts/bash/update-agent-context.sh claude` 실행 → `CLAUDE.md`의 Active Technologies·Recent Changes 섹션에 본 Feature 추가.

**Output**: research.md, data-model.md, contracts/sound-feedback.contract.ts, quickstart.md, CLAUDE.md 업데이트

## Complexity Tracking

> 위반 없음 — 공란.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| (none)    | (none)     | (none)                               |
