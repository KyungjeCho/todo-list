# Quickstart: 공유 버튼 기능 변경

**Feature**: 003-share-button-update | **Date**: 2026-04-03

## 구현 요약

공유 팝업 메뉴에서 "나에게 전송" 버튼을 제거하고 "공유하기" → "클립보드 복사" 순서로 재구성한다.
클립보드 복사 결과 토스트를 화면 중하단(높이 ~65%)에 표시한다.

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `frontend/src/features/share/useShareTodo.ts` | `shareToSelf` → `copyToClipboard` 리네이밍 |
| `frontend/src/components/todo/ShareButton.tsx` | 메뉴 순서 변경, "나에게 전송" 제거, 토스트 위치 변경 |
| `frontend/__tests__/unit/features/share/useShareTodo.test.ts` | 테스트 설명 업데이트 |
| `.maestro/share/share_todo.yml` | E2E 업데이트: 메뉴 문구/순서/testID 변경 |
| `.maestro/plan/share.yml` | E2E 업데이트: testID 변경 |

## 핵심 변경 사항

### 1. 메뉴 순서 및 문구 변경

```text
변경 전: "나에게 전송" (testID: share-to-self) → "공유하기" (testID: share-to-others)
변경 후: "공유하기" (testID: share-to-others) → "클립보드 복사" (testID: copy-to-clipboard)
```

### 2. 토스트 위치 변경

```text
변경 전: 공유 버튼 바로 아래 (상대 위치, marginTop: spacing.xs)
변경 후: 화면 중하단 (절대 위치, top: windowHeight * 0.65, 중앙 정렬)
```

### 3. 함수 리네이밍

```typescript
// useShareTodo.ts
shareToSelf → copyToClipboard  // 함수명만 변경, 내부 로직 동일
```

## 실행 순서

1. `useShareTodo.ts` — `shareToSelf` → `copyToClipboard` 리네이밍
2. `useShareTodo.test.ts` — 테스트 설명 업데이트
3. `ShareButton.tsx` — 메뉴 순서 변경, 문구 변경, 토스트 위치 변경
4. Unit 테스트 실행 (`cd frontend && npm test`)
5. Maestro E2E 업데이트 (`share_todo.yml`, `plan/share.yml`)
6. E2E 테스트 실행

## 의존성

- 신규 라이브러리 추가 없음
- `useWindowDimensions` (React Native 내장) 사용
- 기존 `expo-clipboard` 재사용
