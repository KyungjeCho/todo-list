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
6. Voice Input (마이크 FAB)
7. Settings (탭 바) → 7-1. Contact
                    → 7-2. Language Expanded (언어 탭)
8. Timezone Select (타임존 탭)
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

---

## 6. Voice Input

**배경**: Slate 50
**헤더**: chevron-left + "음성 할 일 입력" H2

**임시 Todo 리스트** (FlatList, 스크롤 가능):
- 확정 카드: checkmark-square 아이콘 (Indigo) + 정리된 텍스트 + ✕ 삭제 버튼
- 정리 중 카드: 빈 사각형 + 원본 텍스트 + ✕ 삭제 버튼 (로딩 상태)
- 각 카드: 350px 너비, 53px 높이, Slate 200 border-bottom

**실시간 전사 영역** (중하단):
- 현재 인식 중인 interim 텍스트 (Slate 400, italic)
- 말 없을 때: "말씀하세요..." placeholder

**녹음 상태**:
- 빨간 dot (8x8) + "녹음 중 0:23" Caption

**종료 버튼**:
- 60x60 원형, Slate 200 border, 빨간 사각형(■) 20x20 중앙 배치
- 탭 → 녹음 중단 + 임시 할 일 일괄 생성

---

## 7-2. Settings — Language Expanded

**배경**: Slate 50
**7번 화면에서 "언어" 행 탭 시**:

### 지역 설정 (Overline) — 변경 사항
- 타임존: globe 아이콘 + "타임존" + "Seoul >" (Indigo) → 8. Timezone Select
- 언어: translate 아이콘 + "언어" + chevron-down (∨)
  - 접힘 상태: chevron-right (>) + 현재 언어명 (Indigo)
  - 펼침 상태: chevron-down (∨) + 아래 인라인 리스트 표시

### 언어 인라인 리스트 (펼침 상태)
- 왼쪽 48px 인덴트 (아이콘 라인 정렬)
- 각 행: 40px 높이
- 선택 항목: Indigo 50 배경 (`#EEF2FF`) + Indigo 텍스트 (SemiBold) + 체크마크 (✓)
- 비선택 항목: 투명 배경 + Slate 600 텍스트 (`#475569`)
- 언어 목록 (원어명 표시):
  - 한국어
  - English
  - 日本語
  - Español

나머지 섹션(정보, 연락처)은 7번 화면과 동일

---

## 8. Timezone Select

**배경**: Slate 50
**헤더**: chevron-left + "타임존 선택" H2

**검색 필드**:
- Slate 100 배경 (`#F1F5F9`), r12, 44px 높이
- search 아이콘 (Slate 400) + "도시 또는 타임존 검색" placeholder
- 입력 시 실시간 필터링, ✕ 버튼으로 검색어 초기화

**타임존 리스트** (스크롤 가능):
- 각 행: padding 14px 0, Slate 100 border-bottom
- 타임존 이름: Body (15px, Slate 900)
- UTC 오프셋: Caption (13px, Slate 400) — 이름 아래
- 선택 항목: Indigo 텍스트 (SemiBold) + 체크마크 (✓) 우측, 최상단 고정
- 정렬: UTC 오프셋 오름차순
- 빈 결과: "검색 결과가 없습니다" 중앙 메시지

**주요 타임존 예시**:
- Asia/Seoul (UTC+09:00) ✓
- Asia/Shanghai (UTC+08:00)
- Asia/Tokyo (UTC+09:00)
- Asia/Kolkata (UTC+05:30)
- Europe/London (UTC+00:00)
- Europe/Paris (UTC+01:00)
- America/New_York (UTC-05:00)
- America/Los_Angeles (UTC-08:00)
- America/Chicago (UTC-06:00)
- Pacific/Auckland (UTC+12:00)
