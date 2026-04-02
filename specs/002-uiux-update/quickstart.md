# Quickstart: UI/UX 업데이트

**Branch**: `002-uiux-update` | **Date**: 2026-04-02

## 사전 조건

- Node.js 18+
- Expo CLI (`npx expo`)
- iOS Simulator 또는 Android Emulator
- Maestro CLI (E2E 테스트용)

## 환경 설정

```bash
# 1. 브랜치 전환
git checkout 002-uiux-update

# 2. 의존성 설치
cd frontend && npm install

# 3. expo-blur 추가 (블러 오버레이용)
npx expo install expo-blur

# 4. Noto Sans 폰트 추가
npx expo install @expo-google-fonts/noto-sans expo-font

# 5. 개발 서버 실행
npx expo start
```

## 디자인 참조

| 리소스 | 경로 |
|--------|------|
| Paper 원본 | [Paper Scratchpad](https://app.paper.design/file/01KN1JJXBWWPNF44VBZ7DEF423?page=01KN1JJXBW47Q3GB6SG4VWQSTF) |
| Design System | `docs/designs/DESIGN_SYSTEM.md` |
| Screen Specs | `docs/designs/SCREENS.md` |
| RN 레퍼런스 | `docs/designs/rn/` |
| SVG 아이콘 | `docs/designs/icons/` |

## 테스트 실행

```bash
# Unit/Integration 테스트
cd frontend && npm test

# 특정 컴포넌트 테스트
npm test -- --testPathPattern=TodoItem

# Lint
npm run lint

# E2E 테스트 (Maestro)
maestro test .maestro/plan/
```

## 핵심 변경 파일

| 파일 | 작업 |
|------|------|
| `frontend/src/theme/` | [NEW] 디자인 토큰 시스템 |
| `frontend/src/components/todo/TodoItem.tsx` | [MODIFY] 확장 UI, 제스처 제거 |
| `frontend/src/components/todo/InputOverlay.tsx` | [NEW] 블러 오버레이 + 입력 바 |
| `frontend/src/components/todo/TodoActionButtons.tsx` | [NEW] 삭제/비활성화/메모 버튼 |
| `frontend/src/components/todo/EmptyState.tsx` | [NEW] 빈 상태 화면 |
| `frontend/src/screens/main/MainScreen.tsx` | [MODIFY] 레이아웃 리팩터링 |
| `frontend/src/components/todo/MemoSection.tsx` | [MODIFY] 카드 스타일 |

## 기존 API 참조 (백엔드 변경 없음)

```
DELETE /todos/:todoId              → 할 일 삭제
PATCH  /todos/:todoId/status       → { status: 'INACTIVE' } 비활성화
POST   /todos/:todoId/memos        → { content } 메모 추가
DELETE /todos/:todoId/memos/:memoId → 메모 삭제
GET    /todos?date=YYYY-MM-DD      → 목록 조회 (memos 포함)
```
