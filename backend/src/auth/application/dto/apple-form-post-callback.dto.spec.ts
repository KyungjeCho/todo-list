import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AppleFormPostCallbackDto } from './apple-form-post-callback.dto';

describe('AppleFormPostCallbackDto', () => {
  function validateDto(payload: Record<string, unknown>) {
    const instance = plainToInstance(AppleFormPostCallbackDto, payload);
    return validateSync(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  }

  it('유효한 페이로드(code, state, user JSON)는 검증 통과', () => {
    const errors = validateDto({
      code: 'auth-code-123',
      state: 'signed-state',
      user: JSON.stringify({
        name: { firstName: 'Kim', lastName: 'Minji' },
        email: 'minji@privaterelay.appleid.com',
      }),
    });
    expect(errors).toHaveLength(0);
  });

  it('user 필드가 없어도 검증 통과 (재로그인 시나리오)', () => {
    const errors = validateDto({
      code: 'auth-code-123',
      state: 'signed-state',
    });
    expect(errors).toHaveLength(0);
  });

  it('code가 비어있으면 실패', () => {
    const errors = validateDto({
      code: '',
      state: 'signed-state',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('code');
  });

  // WHY(P1): code가 누락되면 DTO 수준에서는 통과한다. 취소 흐름(error만 전달)을
  // 수용해야 하기 때문이다. "code 또는 error 중 하나는 필수" 규칙은 컨트롤러가
  // 비즈니스 계층에서 강제한다(apple-oauth.spec에서 검증).
  it('code가 누락되면 DTO 수준에서는 통과 (컨트롤러가 code|error 규칙 강제)', () => {
    const errors = validateDto({
      state: 'signed-state',
    });
    expect(errors).toHaveLength(0);
  });

  it('state가 누락되면 실패', () => {
    const errors = validateDto({
      code: 'auth-code-123',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'state')).toBe(true);
  });

  it('user 필드가 4096자 초과이면 실패', () => {
    const oversized = 'a'.repeat(4097);
    const errors = validateDto({
      code: 'auth-code-123',
      state: 'signed-state',
      user: oversized,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'user')).toBe(true);
  });

  it('user 필드가 정확히 4096자이면 통과', () => {
    const boundary = 'a'.repeat(4096);
    const errors = validateDto({
      code: 'auth-code-123',
      state: 'signed-state',
      user: boundary,
    });
    expect(errors).toHaveLength(0);
  });

  it('id_token 필드가 선택적으로 허용됨', () => {
    const errors = validateDto({
      code: 'auth-code-123',
      state: 'signed-state',
      id_token: 'eyJhbGciOi...',
    });
    expect(errors).toHaveLength(0);
  });

  it('허용되지 않은 필드가 포함되면 실패 (whitelist)', () => {
    const errors = validateDto({
      code: 'auth-code-123',
      state: 'signed-state',
      evil: 'payload',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  // WHY(P1): Apple은 사용자가 권한을 거부하거나 취소하면 같은 form_post로
  // error/error_description을 state와 함께 전달한다. 이 경우 `code`는 존재하지
  // 않으므로 DTO 검증에서 통과해야 하고, 컨트롤러가 state 검증 후 클라이언트
  // 딥링크로 복귀시킬 수 있어야 한다.
  it('error만 있고 code가 없어도 검증 통과 (Apple 취소 흐름)', () => {
    const errors = validateDto({
      state: 'signed-state',
      error: 'user_cancelled_authorize',
    });
    expect(errors).toHaveLength(0);
  });

  it('error_description 필드가 선택적으로 허용됨', () => {
    const errors = validateDto({
      state: 'signed-state',
      error: 'user_cancelled_authorize',
      error_description: 'The user cancelled the authorization request.',
    });
    expect(errors).toHaveLength(0);
  });

  it('error 필드가 256자 초과이면 실패', () => {
    const errors = validateDto({
      state: 'signed-state',
      error: 'x'.repeat(257),
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'error')).toBe(true);
  });

  it('error_description 필드가 1024자 초과이면 실패', () => {
    const errors = validateDto({
      state: 'signed-state',
      error: 'user_cancelled_authorize',
      error_description: 'x'.repeat(1025),
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'error_description')).toBe(true);
  });
});
