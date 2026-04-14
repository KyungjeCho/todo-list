# Quickstart — UI 버튼 클릭음 검증

**Feature**: `feature/006-ui-button-sound`
**대상 독자**: 본 브랜치를 처음 체크아웃한 개발자
**목표**: 10분 내 로컬에서 기능 동작을 확인하고 Maestro E2E를 실행한다.

---

## 0. 전제

- Android 에뮬레이터(권장: Pixel 7, API 34+) 준비
- macOS/Linux 개발 머신, Node 20+, Expo dev tooling 설치
- Maestro CLI 설치 (`curl -Ls "https://get.maestro.mobile.dev" | bash`)

---

## 1. 의존성 확인 (신규 설치 없음)

```bash
cd frontend
npm install   # 변경 없음: 신규 dependency 0개
```

`expo-audio`, `expo-secure-store`는 이미 설치·링크되어 있다. 따라서 **EAS dev 빌드를 다시 돌릴 필요 없음**. 이미 설치된 dev client APK로 충분.

> 만약 dev client가 없는 신규 장비라면 한 번만:
> ```bash
> eas build --profile development --platform android
> ```

---

## 2. 개발 서버 기동

```bash
cd frontend
npm start
# 또는
npm run android   # 연결된 에뮬레이터로 바로 실행
```

---

## 3. 수동 검증 시나리오

| # | 경로 | 기대 |
|---|------|------|
| A | 로그인 화면에서 로그인 버튼 탭 | 짧은 클릭음 1회 |
| B | 메인 화면의 음성 입력 버튼 탭 | 클릭음 1회, 이후 녹음 중에는 무음 |
| C | 할 일 항목 체크 토글 | 클릭음 1회 |
| D | 설정 → "버튼 클릭음" OFF | 이후 모든 버튼 무음 |
| E | 앱 완전 종료 후 재실행 | D의 OFF 상태 유지 |
| F | 에뮬레이터 미디어 볼륨 0 | 클릭음 들리지 않음 |
| G | 에뮬레이터 "Do not disturb" / 무음 | 클릭음 들리지 않음 (iOS 기준 동작) |

---

## 4. 자동화 테스트

```bash
# Unit / Integration
cd frontend
npm test -- features/sound store/soundStore components/common/SoundPressable

# Maestro E2E (안드로이드 에뮬레이터가 먼저 실행되어 있어야 함)
cd ..
maestro test .maestro/settings/button-sound-toggle.yaml
```

기대 결과:
- Jest 전 파일 통과 (linter 경고 0)
- Maestro: `launchApp` → 설정 진입 → 토글 OFF → 탭 → 토글 ON → 탭 플로우가 ✅

---

## 5. 문제 해결

| 증상 | 원인/해결 |
|------|----------|
| 클릭음이 들리지 않음 (토글 ON, 볼륨 ON) | `soundService.getStatus()`가 `error`일 가능성. dev console에서 `[soundService] preload failed` 경고 확인. asset require 경로 오타 여부 점검. |
| 첫 탭만 지연됨 | `preload()`가 `App.tsx` 부트에서 호출되는지 확인. 지연 체감 시 `useEffect` 의존성 배열 비워서 부트 1회 호출 보장. |
| 녹음 중에도 클릭음이 재생됨 | `useVoiceRecording`의 `startRecording` 직후/`stopRecording` 종료 시 `setRecordingActive(true/false)` 호출 누락. |
| 설정 토글이 재실행 시 초기화됨 | `expo-secure-store` write가 실제로 호출되었는지, 키 충돌(기존 authStore와) 여부 확인. 본 기능 키: `ui.buttonClickSound.enabled`. |
| EAS 빌드 필요성 혼동 | 본 기능은 **신규 네이티브 모듈 추가 없음**. 기존 dev client로 동작. 새 장비/초기화 시만 `eas build --profile development --platform android` 실행. |

---

## 6. 범위 외 (이번 feature 대상 아님)

- 햅틱 피드백 (Constitution 위반 아님, 단순히 스코프 외)
- 웹/데스크톱
- 백엔드 profile 동기화 (research.md R4 참조)
