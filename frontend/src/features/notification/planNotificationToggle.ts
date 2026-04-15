/**
 * 계획알림 토글 + optimistic 업데이트 + 실패 롤백 헬퍼.
 *
 * WHY(FR-005~007, SC-003):
 * - 저장 API 왕복(수백 ms)을 기다리지 않고 UI가 1초 이내에 반응하려면 optimistic 갱신이 필요하다.
 * - 실패 시 이전 값으로 되돌려 사용자가 잘못된 상태를 관찰하지 않게 한다.
 * - 이 유틸은 상태 저장소·API 클라이언트에 의존하지 않는 순수 로직으로, SettingsScreen/feature
 *   테스트가 둘 다 동일한 흐름을 검증할 수 있도록 인자로 주입한다.
 */
export interface PlanNotificationToggleInput {
  /** 사용자가 원하는 차기 상태(true=ON, false=OFF) */
  next: boolean;
  /** ON 전환 시 저장할 기본 계획 시간(HH:mm) */
  defaultPlanTime: string;
  /** 실제 서버 저장 함수 */
  updateSettings: (data: { planTime: string | null }) => Promise<unknown>;
  /** optimistic 표시 전환 콜백(UI에 즉시 반영) */
  onOptimistic: (enabled: boolean) => void;
  /** 실패 시 롤백 콜백 */
  onRollback: (prev: boolean) => void;
  /** 실패 시 호출되는 옵션 콜백(토스트/로그 등) */
  onError?: (err: unknown) => void;
}

export async function togglePlanNotification(
  input: PlanNotificationToggleInput,
): Promise<void> {
  const {
    next,
    defaultPlanTime,
    updateSettings,
    onOptimistic,
    onRollback,
    onError,
  } = input;
  const prev = !next;
  onOptimistic(next);
  try {
    await updateSettings({ planTime: next ? defaultPlanTime : null });
  } catch (err) {
    onRollback(prev);
    onError?.(err);
    throw err;
  }
}
