# Design System

**Branch**: `feature/001-todo-mobile-service` | **Last Updated**: 2026-04-02

## Color Palette

### Primary
| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#6366F1` (Indigo) | 브랜드, 버튼, 활성 탭, 선택 상태 |
| Primary Light | `#EEF2FF` (Indigo 50) | 선택 배경, 뱃지 배경 |

### Surface
| Token | Value | Usage |
|-------|-------|-------|
| Surface | `#FFFFFF` | 카드, 탭 바, 입력 필드 |
| Surface Dim | `#F8FAFC` (Slate 50) | 화면 배경 |
| On Surface | `#0F172A` (Slate 900) | 본문 텍스트 |

### Border & Disabled
| Token | Value | Usage |
|-------|-------|-------|
| Border | `#E2E8F0` (Slate 200) | 구분선, 카드 테두리 |
| Border Light | `#F1F5F9` (Slate 100) | 리스트 아이템 구분선 |
| Disabled | `#94A3B8` (Slate 400) | 비활성 아이콘, 보조 텍스트 |
| Muted | `#CBD5E1` (Slate 300) | 버전 텍스트 등 약한 텍스트 |
| Secondary Text | `#64748B` (Slate 500) | 설명 텍스트 |

### Semantic
| Token | Value | Usage |
|-------|-------|-------|
| Success | `#22C55E` (Green) | 완료 체크, 진행 바 |
| Warning | `#F59E0B` (Amber) | 이월 표시, 부분 완료 dot |
| Error | `#EF4444` (Red) | 삭제, 미완료 dot, 일요일 |

---

## Typography

**Font Family**: `Noto Sans` (Google Fonts)

| Style | Size | Weight | Line Height | Letter Spacing |
|-------|------|--------|-------------|----------------|
| H1 | 24px | Bold (700) | 1.33 | — |
| H2 | 18px | SemiBold (600) | 1.44 | — |
| Body | 15px | Regular (400) | 1.6 | — |
| Caption | 13px | Medium (500) | 1.38 | 0.2px |
| Overline | 11px | SemiBold (600) | 1.45 | 0.5px |
| Label | 10px | SemiBold (600) | 1.4 | 0.5px |

---

## Icons

**Style**: Style A — 24x24 viewBox, 1.5px stroke, round linecap/linejoin

모든 아이콘 SVG 파일: `docs/designs/icons/`

| Icon | 파일 | Usage |
|------|------|-------|
| Home | `home.svg` | 탭 바 — 홈 |
| Calendar | `calendar.svg` | 탭 바 — 캘린더 |
| Settings | `settings.svg` | 탭 바 — 설정 |
| Checkmark | `checkmark.svg` | 로그인 로고, 완료 아이콘, Empty State |
| Plus | `plus.svg` | FAB — 할 일 추가 |
| Mic | `mic.svg` | FAB — 음성 입력 |
| Note | `note.svg` | 메모 카운트 아이콘 |
| Trash | `trash.svg` | 삭제 액션 |
| Bell | `bell.svg` | 알림 설정 |
| Globe | `globe.svg` | 타임존 설정 |
| Heart | `heart.svg` | 후원 링크 |
| Mail | `mail.svg` | 이메일 연락처 |
| Chevron Left | `chevron-left.svg` | 뒤로가기, 월 네비게이션 |
| Chevron Right | `chevron-right.svg` | 네비게이션 화살표 |
| Shield | `shield.svg` | 개인정보 처리방침 |
| Document | `document.svg` | 오픈소스 라이센스 |
| Clock | `clock.svg` | 온보딩 시계 아이콘 |
| Coffee | `coffee.svg` | 후원 페이지 |

---

## Components

### Button — Primary
```
background: #6366F1
color: #FFFFFF
border-radius: 14px
height: 52px
font: 15px/SemiBold
```

### Button — Secondary (Pill)
```
background: #F1F5F9 (Slate 100)
color: #0F172A
border-radius: 16px
height: 32px
font: 13px/Medium
```

### Button — Ghost
```
background: transparent
border: 1px solid #E2E8F0
color: #6366F1
border-radius: 8px
height: 32px
font: 13px/Medium
```

### Toggle — ON
```
background: #6366F1
width: 50px, height: 30px
border-radius: 15px
knob: 26px white circle, right-aligned
```

### Toggle — OFF
```
background: #E2E8F0
width: 50px, height: 30px
border-radius: 15px
knob: 26px white circle, left-aligned
```

### FAB (Floating Action Button)
```
background: #6366F1
width: 48px, height: 48px
border-radius: 24px
icon: white, 22px
shadow: 0 4px 12px rgba(99,102,241,0.3)
```

### Tab Bar
```
background: #FFFFFF
border-top: 1px solid #E2E8F0
height: 80px (including 24px safe area)
icon: 24px
label: Label style (10px/SemiBold)
active: #6366F1
inactive: #94A3B8
```

### Todo Item
```
padding: 14px 24px
border-bottom: 1px solid #F1F5F9
checkbox: 22px, border-radius 6px (rounded square)
  - unchecked: border 1.5px solid #CBD5E1
  - checked: fill #4ADE80, white checkmark
text: Body style
  - completed: color #94A3B8, text-decoration line-through
```

### Input Bar (Screen 3-1)
```
container: width 100%, padding 12px 16px, gap 10px
  background: #FFFFFF
  border-top: 1px solid #E2E8F0
text-input: flex-grow 1, height 42px, border-radius 10px
  padding: 0 14px
  background: #F1F5F9 (Slate 100)
  placeholder: "할 일을 입력하세요"
add-button: 42x42px, border-radius 21px (circle)
  background: #6366F1
  icon: white plus, 20px
```

### Blur Overlay (Screen 3-1)
```
background: #0F172A4D (rgba(15,23,42,0.3))
backdrop-filter: blur(4px)
position: absolute, full screen
```

### Item Expanded (Screen 3-2)
```
container: Indigo 50 (#EEF2FF) background
  border-left: 3px solid #6366F1
  
action-button-row: padding-left 55px, padding-right 24px, gap 8px
action-button:
  background: #FFFFFF
  border: 1px solid #E2E8F0
  border-radius: 8px
  padding: 6px 12px, gap 4px
  icon: 14px, text: 12px/Regular
  삭제: text #EF4444 (Red), trash icon
  비활성화: text #64748B (Slate 500), circle-slash icon
  + 메모: text #6366F1 (Indigo), plus icon

memo-card-list: padding-left 55px, padding-right 24px, gap 6px
memo-card:
  background: #FFFFFF
  border-radius: 8px
  padding: 8px 12px, gap 8px
  icon: 14px note, text: 13px/Regular #334155

chevron-up: 16x16px, top-right of expanded item
```

### Card
```
background: #FFFFFF
border: 1px solid #E2E8F0
border-radius: 16px
padding: 20px
```

### Calendar Date Cell
```
width: 40px, height: 40px
font: Body style
selected: background #6366F1, border-radius 12px, white text
today: border 2px solid #6366F1, border-radius 12px
completion dot: 5px circle below date
  - green: 100% 완료
  - orange: 부분 완료
  - red: 미완료
```
