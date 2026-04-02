# Data Model: UI/UX 업데이트

**Branch**: `002-uiux-update` | **Date**: 2026-04-02

## 기존 엔티티 (변경 없음)

이번 기능은 순수 Frontend UI 업데이트이며, 백엔드 엔티티 및 DB 스키마 변경이 없다.

### Todo (기존)

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK | 할 일 ID |
| userId | UUID | FK → User | 사용자 ID |
| todoDate | string | YYYY-MM-DD | 할 일 날짜 |
| content | varchar(255) | NOT NULL | 할 일 내용 |
| status | enum | ACTIVE/INACTIVE/COMPLETED/CARRIED_OVER | 상태 |
| memos | TodoMemo[] | OneToMany | 첨부 메모 |
| createdAt | timestamptz | auto | 생성 시각 |
| updatedAt | timestamptz | auto | 수정 시각 |
| deletedAt | timestamptz | nullable | 소프트 삭제 |

### TodoMemo (기존)

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK | 메모 ID |
| todoId | UUID | FK → Todo | 할 일 ID |
| content | text | NOT NULL | 메모 내용 |
| createdAt | timestamptz | auto | 생성 시각 |
| updatedAt | timestamptz | auto | 수정 시각 |
| deletedAt | timestamptz | nullable | 소프트 삭제 |

### 상태 전이 규칙 (기존)

```
ACTIVE → COMPLETED (체크박스 탭)
ACTIVE → INACTIVE (비활성화 버튼 — 기존 롱프레스에서 변경)
INACTIVE → ACTIVE (재활성화)
COMPLETED → ACTIVE (체크 해제)
CARRIED_OVER → (전이 불가, 시스템 전용)
```

## Frontend UI 상태 모델 (신규)

### PlanScreen UI States

```typescript
// MainScreen 레벨 UI 상태
interface PlanUIState {
  /** 현재 확장된 TodoItem ID (null이면 모두 접힘) */
  expandedTodoId: string | null;
  
  /** 입력 오버레이 활성 여부 */
  isInputOverlayVisible: boolean;
  
  /** 입력 오버레이 모드 (할 일 추가 vs 메모 추가) */
  inputOverlayMode: 'todo' | 'memo';
  
  /** 메모 추가 대상 Todo ID (inputOverlayMode === 'memo' 일 때) */
  memoTargetTodoId: string | null;
}
```

### InputOverlay States

```
HIDDEN → VISIBLE (FAB+ 탭 또는 +메모 버튼 탭)
VISIBLE → HIDDEN (오버레이 영역 탭, 추가 완료, Android 뒤로가기)
```

### TodoItem States

```
COLLAPSED (기본) → EXPANDED (아이템 탭)
EXPANDED → COLLAPSED (chevron-up 탭, 다른 아이템 탭)
```

## 디자인 토큰 모델 (신규)

### colors.ts

```typescript
export const colors = {
  primary: '#6366F1',        // Indigo — 브랜드, 버튼, FAB
  primaryLight: '#EEF2FF',   // Indigo 50 — 선택 배경, 확장 배경
  surface: '#FFFFFF',        // 카드, 탭 바, 입력 필드
  surfaceDim: '#F8FAFC',     // Slate 50 — 화면 배경
  onSurface: '#0F172A',      // Slate 900 — 본문 텍스트
  border: '#E2E8F0',         // Slate 200 — 구분선, 액션 버튼 테두리
  borderLight: '#F1F5F9',    // Slate 100 — 리스트 아이템 구분선
  disabled: '#94A3B8',       // Slate 400 — 비활성 아이콘
  muted: '#CBD5E1',          // Slate 300 — 약한 텍스트
  secondaryText: '#64748B',  // Slate 500 — 설명 텍스트
  success: '#22C55E',        // Green — 완료 체크
  successLight: '#4ADE80',   // Green 400 — 체크박스 채움
  warning: '#F59E0B',        // Amber — 이월 표시
  warningLight: '#FEF3C7',   // Amber 50 — 이월 뱃지 배경
  warningDark: '#D97706',    // Amber 600 — 이월 텍스트
  error: '#EF4444',          // Red — 삭제
  overlay: '#0F172A4D',      // Slate 900/30% — 블러 오버레이
} as const;
```

### typography.ts

```typescript
export const typography = {
  h1: { fontSize: 24, fontWeight: '700', lineHeight: 32, fontFamily: 'NotoSans-Bold' },
  h2: { fontSize: 18, fontWeight: '600', lineHeight: 26, fontFamily: 'NotoSans-SemiBold' },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 24, fontFamily: 'NotoSans-Regular' },
  caption: { fontSize: 13, fontWeight: '500', lineHeight: 18, letterSpacing: 0.2, fontFamily: 'NotoSans-Medium' },
  overline: { fontSize: 11, fontWeight: '600', lineHeight: 16, letterSpacing: 0.5, fontFamily: 'NotoSans-SemiBold' },
  label: { fontSize: 10, fontWeight: '600', lineHeight: 14, letterSpacing: 0.5, fontFamily: 'NotoSans-SemiBold' },
} as const;
```

### spacing.ts

```typescript
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 8, lg: 12, xl: 14, xxl: 16, full: 9999 } as const;
```
