# Research: UI/UX 업데이트

**Branch**: `002-uiux-update` | **Date**: 2026-04-02

## 1. 블러 오버레이 구현 방식 (expo-blur vs react-native BlurView)

**Decision**: `expo-blur`의 `BlurView` 컴포넌트 사용

**Rationale**:
- Expo managed workflow에서 네이티브 블러를 지원하는 공식 패키지
- Paper 디자인 원본: `backdrop-filter: blur(4px)` — 가우시안 블러 필요
- `expo-blur`의 `intensity` prop으로 블러 강도 제어 가능
- 대안인 반투명 View(`rgba(15,23,42,0.3)`)만으로는 Paper 디자인과 불일치
- 단, `expo-blur`가 설치되지 않았거나 성능 문제 시 반투명 오버레이로 fallback

**Alternatives considered**:
- `@react-native-community/blur` — Expo managed에서 추가 config 필요
- 순수 `rgba` 오버레이 — 블러 없음, Paper 디자인 불일치
- `expo-blur` 사용하되 intensity를 낮게 설정하여 성능 최적화

## 2. 키보드 연동 입력 바 구현 (KeyboardAvoidingView)

**Decision**: React Native 기본 `KeyboardAvoidingView` + `Platform.OS` 분기

**Rationale**:
- iOS: `behavior="padding"`, Android: `behavior="height"` 또는 undefined
- Expo에서 별도 라이브러리 없이 기본 제공
- 입력 바는 절대 위치(`position: absolute, bottom: 0`)에서 키보드 올라갈 때 함께 이동
- `Keyboard.addListener`로 키보드 높이 감지하여 입력 바 bottom 값 조정 가능

**Alternatives considered**:
- `react-native-keyboard-aware-scroll-view` — 스크롤뷰 기반이라 오버레이 패턴에 부적합
- `react-native-avoid-softinput` — 추가 네이티브 의존성, Expo managed에서 제한적
- `useKeyboard` hook 자체 구현 — 기본 API로 충분, 과도한 추상화

## 3. TodoItem 확장 UI — 스와이프/롱프레스 제거 전략

**Decision**: 기존 `Swipeable`(react-native-gesture-handler)과 `LongPressGestureHandler` 제거, 탭 기반 확장으로 완전 대체

**Rationale**:
- Spec Clarification Q4: "완전 대체 — 기존 제스처 제거, 버튼 UI로 통일"
- 제스처와 버튼 병행 시 사용자 혼란 + 유지보수 복잡도 증가
- `react-native-gesture-handler/Swipeable` import 제거 → 번들 크기 절감 가능
- 탭 → 확장/접기는 `TouchableOpacity.onPress`로 구현 (기존 패턴)

**Migration steps**:
1. `TodoItem.tsx`에서 `Swipeable`, `LongPressGestureHandler` import/사용 제거
2. `onPress` → 확장 토글 (현재는 편집 모드 진입)
3. 인라인 편집 기능은 확장 UI 내부에서 제공하거나 제거
4. 삭제/비활성화를 `TodoActionButtons` 컴포넌트로 분리

**Alternatives considered**:
- 제스처 유지 + 버튼 추가 — spec에서 명시적으로 거부됨
- 제스처를 deprecated 처리 — 과도한 코드 복잡성, 거부됨

## 4. 디자인 토큰 시스템 도입 방식

**Decision**: `frontend/src/theme/` 디렉토리에 순수 TypeScript 상수 파일로 구현

**Rationale**:
- Paper RN 레퍼런스(`docs/designs/rn/theme.ts`)의 토큰 구조를 그대로 채택
- `colors`, `typography`, `spacing`, `radius` 객체를 `as const`로 export
- Noto Sans 폰트 패밀리 적용 (`expo-font`로 로드)
- 기존 하드코딩된 색상(#2196F3, #4CAF50 등)을 토큰 참조로 교체

**Token mapping (현재 → Paper)**:
| 현재 | Paper 토큰 | 값 |
|------|-----------|-----|
| #2196F3 (버튼) | `colors.primary` | #6366F1 |
| #4CAF50 (체크) | `colors.success` | #22C55E |
| #F44336 (삭제) | `colors.error` | #EF4444 |
| #FF9800 (이월) | `colors.warning` | #F59E0B |
| #f0f0f0 (배경) | `colors.surfaceDim` | #F8FAFC |
| #fff (카드) | `colors.surface` | #FFFFFF |
| #888 (보조텍스트) | `colors.disabled` | #94A3B8 |

**Alternatives considered**:
- styled-components/emotion — 추가 의존성, 기존 StyleSheet 패턴과 불일치
- React Native Paper (UI 라이브러리) — 과도한 추상화, 커스텀 디자인과 충돌
- CSS variables — React Native에서 지원하지 않음

## 5. 공유 기능 현황

**Decision**: 기존 `ShareButton`, `useShareTodo`, `formatShareData` 재활용 — 신규 구현 불필요

**Rationale**:
- 이미 구현 완료: `ShareButton.tsx` (모달 메뉴), `useShareTodo.ts` (Share.share() 호출), `formatShareData.ts` (텍스트 포맷)
- "나에게 전송" (클립보드 복사) + "공유하기" (OS Share Sheet) 2가지 옵션 제공
- Plan/Review 헤더에 이미 `ShareButton` 배치됨
- US6 요구사항과 기존 구현이 일치 — 스타일 토큰 적용만 필요

**Remaining work**:
- 공유 버튼 스타일을 Ghost Button 디자인 토큰으로 교체
- 빈 상태 시 "공유할 할 일이 없습니다" 메시지 추가 (현재 미처리)

## 6. 백엔드 API 현황 분석

**Decision**: 백엔드 변경 불필요 — 모든 필요 API가 이미 존재

**Rationale**:
- `DELETE /todos/:todoId` — 할 일 삭제 (soft delete)
- `PATCH /todos/:todoId/status` + `{ status: 'INACTIVE' }` — 비활성화
- `POST /todos/:todoId/memos` + `{ content }` — 메모 추가
- `GET /todos?date=YYYY-MM-DD` — 할 일 목록 (memos 포함)
- `DELETE /todos/:todoId/memos/:memoId` — 메모 삭제
- Frontend API 클라이언트(`todoApi.ts`, `memoApi.ts`)도 이미 존재

**Alternatives considered**: 없음 — 모든 API 계약이 이미 충족됨

## 7. expo-blur 의존성 확인

**Decision**: `expo-blur` 패키지 추가 필요

**Rationale**:
- 현재 `frontend/package.json`에 `expo-blur` 미설치 확인 필요
- Paper 디자인 원본이 `backdrop-filter: blur(4px)`를 명시
- `expo install expo-blur`로 Expo SDK 호환 버전 자동 설치
- 성능 영향 최소화: 오버레이 활성 시에만 BlurView 렌더링

## 8. Noto Sans 폰트 로딩

**Decision**: `expo-font`로 Noto Sans 패밀리 로드, 앱 초기화 시 적용

**Rationale**:
- Paper 디자인 시스템: Noto Sans (Bold, SemiBold, Medium, Regular)
- `@expo-google-fonts/noto-sans` 패키지로 간편 설치
- `useFonts` hook으로 비동기 로드 → `AppLoading` 동안 스플래시 유지
- 현재 시스템 기본 폰트 사용 중 → 전환 필요
