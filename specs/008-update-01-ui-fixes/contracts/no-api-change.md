# API Contracts — 008-update-01-ui-fixes

## 결론: **신규/변경 API 없음**

본 feature는 외부 API 계약(요청/응답 DTO, HTTP 엔드포인트, 웹소켓 이벤트 등)을 추가하거나 변경하지 **않는다**. 아래 표로 각 사용자 스토리의 인터페이스 영향 범위를 확인한다.

| User Story | 외부 계약 영향 | 상세 |
|------------|----------------|------|
| US1 이월 보존 | 없음 | `GET /todos?date=...` 응답 DTO(`isCarriedOver` 등) 동일. `CarryoverSchedulerUsecase`는 내부 배치로 외부 계약 없음 |
| US2 계획알림 아이콘 | 없음 | 기존 `PATCH /users/me/settings`(또는 유사)의 `planNotificationEnabled` 필드 계속 사용. 새 필드·새 엔드포인트 없음 |
| US3 로그인/온보딩 비주얼 | 없음 | UI 전용. OAuth 제공자 API(Google/Apple 등) 호출 방식 변경 없음 |
| US4 타임존 라벨 | 없음 | 저장 포맷 IANA(`Asia/Seoul` 등) 유지(FR-014). 프론트 표시만 현지화 |

## 검증 방법

1. `backend/test/integration/todo/todo.controller.spec.ts`: 기존 계약 스냅샷 테스트 그대로 통과함을 확인.
2. `backend/test/integration` 디렉토리 내 영향 가능성 있는 e2e 테스트(`full-flow.e2e-spec.ts`) 회귀 실행.
3. 프론트 `__tests__/unit/services/api/*.test.ts` (e.g., `userApi.test.ts`, `todoApi.test.ts`)에서 요청/응답 형태가 변하지 않았음을 확인.

## 회귀 방지 체크리스트

- [ ] `docs/API_SPEC.md` — 이월 동작 설명 문단이 "CARRIED_OVER 전이" 언급 시 문구만 업데이트(계약은 동일하므로 섹션 구조 변경 없음).
- [ ] OpenAPI 스펙 파일이 있다면 diff가 비어 있음을 확인.
- [ ] `GetTodosUsecase`가 반환하는 `isCarriedOver` 의미가 "이월됨의 원본인가" (= `carriedOverToIds.has(id)`)임을 리뷰에서 재확인.
