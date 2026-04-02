# Screen Specifications

**Branch**: `feature/001-todo-mobile-service` | **Last Updated**: 2026-04-02
**Design Tool**: Paper (Scratchpad file, Page 1)
**Device**: 390 x 844px (iPhone 14 기준)

---

## Screen Map

```
1. Login → 2. Onboarding → 3. Plan Mode (Home)
                                  ↓
                            3-1. Input Active (+ 탭)
                            3-2. Item Expanded (아이템 탭)
                            3-3. Empty State (할 일 없음)
                                  ↓
                            4. Review Mode (Review 탭)
                                  ↓
                            4-1. 일정 완료 (일정 완료 버튼)
                                  ↓
                            4-2. 회고 완료 (확인 후)
                                  
5. Calendar (탭 바)
7. Settings (탭 바) → 7-1. Contact
```

---

## 1. Login

**배경**: Indigo 50 → White 그라데이션
**구성**:
- Checkmark SVG 아이콘 (Indigo stroke)
- "TodoList" H1 (Indigo)
- "하루를 계획하고 돌아보세요" Caption
- OAuth 버튼 4개 (세로 배치):
  - Google: 흰 배경, Slate 200 border, 4색 G 아이콘
  - Naver: `#03C75A` 배경, 흰 N 아이콘
  - Kakao: `#FEE500` 배경, 검정 말풍선 아이콘
  - Apple: `#1D1D1F` 배경, 흰 Apple 아이콘

---

## 2. Onboarding

**배경**: Indigo 50 → White 그라데이션
**구성**:
- Clock SVG 아이콘 (Indigo stroke)
- "루틴 설정" H1
- "하루의 계획과 회고 시간을 정해주세요" Caption
- 계획 시간 섹션: sunrise 아이콘 + "계획 시간" + Slate 50 배경 시간 피커 (08:00)
- 회고 시간 섹션: moon 아이콘 + "회고 시간" + Slate 50 배경 시간 피커 (22:00)
- "완료" Primary 버튼

---

## 3. Main — Plan Mode

**배경**: Slate 50 (`#F8FAFC`)
**헤더**:
- "Plan" H1
- [Review] Secondary Pill 버튼 → 4. Review로 전환
- [공유] Ghost 버튼

**진행률**: "2/5 (40%)" Caption

**할 일 리스트**:
- 각 아이템: 체크박스 + Body 텍스트 + (메모 아이콘 + 카운트)
- 완료: 초록 체크 + 취소선 + Slate 400 텍스트
- 이월 아이템: Amber 뱃지 + Amber 텍스트

**FAB 버튼** (우측 하단, 탭 바 위):
- (+) 추가 FAB → 3-1 Input Active
- (mic) 음성 FAB

**탭 바**: 홈(활성) / 캘린더 / 설정

---

## 3-1. Plan — Input Active

**3번 화면 + 오버레이**:
- 블러 오버레이: `rgba(15,23,42,0.3)`
- 하단 입력 바: "할 일을 입력하세요" placeholder + Indigo (+) 버튼
- iOS 한글 키보드 (Indigo "완료" 버튼)
- FAB 숨김

---

## 3-2. Plan — Item Expanded

**3번 화면에서 아이템 탭 시**:
- 선택 아이템: Indigo 50 배경 + 3px Indigo 좌측 border
- 액션 버튼 행: [삭제] [비활성화] [+ 메모]
  - 공통: 흰 배경, Slate 200 border (`#E2E8F0`), r8, padding 6px 12px, 12px 텍스트
  - 삭제: Red 텍스트 (`#EF4444`), trash 아이콘
  - 비활성화: Slate 500 텍스트 (`#64748B`), circle-slash 아이콘
  - 메모: Indigo 텍스트 (`#6366F1`), plus 아이콘
- 메모 카드 리스트: 흰 배경 카드, r8, padding 8px 12px, 13px Slate 700 텍스트
- 접기: chevron-up 아이콘

---

## 3-3. Plan — Empty State

**3번 화면 + 빈 상태**:
- 중앙: Indigo 50 라운드 컨테이너
- Checkmark SVG 아이콘
- "오늘의 할 일이 없어요" H2
- "우측 하단의 + 버튼을 눌러\n오늘의 계획을 추가해보세요" Caption
- FAB 유지

---

## 4. Main — Review Mode

**배경**: Slate 50
**헤더**:
- "Review" H1
- [Plan] Secondary Pill 버튼 → 3. Plan으로 전환
- [공유] Ghost 버튼

**진행 바**: Green fill / Slate 200 track
**진행률**: "3/5 (60%)" Caption

**완료 섹션**: "완료" Overline (Green) + 완료 아이템 리스트
**미완료 섹션**: "미완료" Overline (Amber) + 미완료 아이템 + 이월 뱃지

**"일정 완료" Primary 버튼** (하단) → 4-1

**탭 바**: 홈(활성) / 캘린더 / 설정

---

## 4-1. Review — 일정 완료

**배경**: Slate 50, 탭 바 없음
**구성**:
- Green 원형 배경 + Checkmark SVG (Green stroke)
- "오늘 하루 수고했어요!" H1
- "2026년 4월 2일 수요일" Caption
- 요약 카드:
  - 완료: 3 (Green)
  - 미완료: 2 (Amber)
  - 달성률: 60% (Indigo)
- "미완료 항목은 내일로 이월됩니다" Caption
- "확인" Primary 버튼 → 4-2

---

## 4-2. Review — 회고 완료

**배경**: Slate 50
**헤더**:
- "Review" H1 + "완료됨" Green 뱃지
- [Plan] [공유] 버튼

**요약 카드**: 완료 3 / 전체 5 / 60%

**완료 섹션**: 완료 아이템 (취소선, dimmed)
**미완료 → 내일 이월 섹션**: 미완료 아이템 + "이월" Amber 화살표

**탭 바**: 홈(활성) / 캘린더 / 설정

---

## 5. Calendar

**배경**: Slate 50
**헤더**: "캘린더" H1

**월 네비게이션**: < 2026년 4월 > (chevron + H2)

**요일 헤더**: 일(Red) 월 화 수 목 금 토(Indigo) — Overline

**캘린더 그리드**:
- 날짜 셀: 40x40px
- 선택 날짜: Indigo 채움, 12px radius, 흰 텍스트
- 오늘: Indigo 2px 테두리, 12px radius
- 완료 dot: 5px 원 (Green/Orange/Red)

**구분선**: Slate 200

**선택 날짜 상세**:
- "4월 1일 수요일" H2 + 달성률 뱃지 (Indigo 50 배경)
- 할 일 리스트 (완료 체크/취소선 + 미완료 이월)

**탭 바**: 홈 / 캘린더(활성) / 설정

---

## 7. Settings

**배경**: Slate 50
**헤더**: "설정" H1

### 알림 설정 (Overline)
- 계획 알림: bell 아이콘 + "계획 알림" + "08:00" (Indigo) + Toggle ON
- 회고 알림: bell-off 아이콘 + "회고 알림" + "해제됨" (Slate) + Toggle OFF

### 지역 설정 (Overline)
- 타임존: globe 아이콘 + "타임존" + "Seoul >" (Indigo)

### 정보 (Overline)
- 오픈소스 라이센스: document 아이콘 + chevron
- 개인정보 처리방침: shield 아이콘 + chevron

### 연락처
- mail 아이콘 + "연락처" + chevron → 7-1

**버전**: "TodoList v1.0.0" (Slate 300, 중앙)

**탭 바**: 홈 / 캘린더 / 설정(활성)

---

## 7-1. Contact

**배경**: Slate 50
**헤더**: chevron-left + "연락처" H2

**프로필 카드** (Card):
- Indigo 50 원형 배경 + code 아이콘
- "KyungJe Cho" Body/SemiBold
- "Indie Developer" Caption

**연락처 카드** (Card):
- 이메일: mail 아이콘 + "이메일" Overline + "contact@todolist.app"
- GitHub: GitHub 아이콘 + "GitHub" Overline + "github.com/KyungJeCho"
- 버그 리포트: info 아이콘 + "버그 리포트" Overline + "GitHub Issues"

**후원 링크**: heart 아이콘 + "커피 한 잔 후원하기" (Indigo, 중앙)
