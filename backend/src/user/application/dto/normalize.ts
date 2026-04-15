// WHY: Postgres `time` 컬럼은 `HH:mm:ss`로 반환되지만 클라이언트는 저장/표시 모두 `HH:mm`을
// 전제로 한다. 리로드 직후와 저장 직후의 포맷이 일치하도록 DTO 경계에서 정규화한다.
export function normalizeHmm(value: string | null): string | null {
  if (value === null) return null;
  return value.length >= 5 ? value.slice(0, 5) : value;
}
