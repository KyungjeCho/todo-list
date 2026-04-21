/**
 * Apple form_post 콜백의 `user` 필드(JSON 문자열)에서 사용자 이름을 추출한다.
 * WHY: Apple은 최초 로그인 1회에만 `user`를 전달하며, 이후에는 생략한다.
 * 파싱 실패·빈 필드·구조 불일치는 모두 빈 문자열을 반환하여 usecase 단계의
 * email local-part 폴백 경로로 자연스럽게 위임한다(FR-006).
 *
 * 기대 형식: `{"name":{"firstName":"...","lastName":"..."},"email":"..."}`
 */
export function parseAppleUserField(raw: string | undefined | null): string {
  if (!raw) return '';
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return '';
    const name = (parsed as { name?: unknown }).name;
    if (typeof name !== 'object' || name === null) return '';
    const firstName = (name as { firstName?: unknown }).firstName;
    const lastName = (name as { lastName?: unknown }).lastName;
    const first = typeof firstName === 'string' ? firstName.trim() : '';
    const last = typeof lastName === 'string' ? lastName.trim() : '';
    return [first, last].filter((s) => s.length > 0).join(' ');
  } catch {
    return '';
  }
}
