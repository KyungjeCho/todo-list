import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Apple OAuth `response_mode=form_post` 콜백 페이로드.
 * WHY: Apple은 authorization_code 교환 콜백을 POST(application/x-www-form-urlencoded)로 전달하며,
 * 첫 로그인에 한해 `user` 필드에 사용자 정보를 JSON 문자열로 포함한다.
 * 재로그인 시에는 `user` 필드가 생략되므로 Optional로 선언한다.
 *
 * WHY(P1): 사용자가 Apple 시트에서 권한을 거부/취소하면 `code` 대신 `error`와
 * `error_description`이 같은 form_post로 전달된다. 이 경우 DTO 검증에서 바로 400이 나면
 * 사용자는 브라우저 세션에 갇히므로 `code`를 Optional로 완화하고, 컨트롤러가
 * "code 또는 error 둘 중 하나는 필수"라는 비즈니스 규칙을 처리한다.
 */
export class AppleFormPostCallbackDto {
  /**
   * 인가 코드. 성공 흐름에서는 필수이나 Apple 취소/에러 흐름에서는 생략되므로
   * DTO 수준에서는 Optional이다. 컨트롤러에서 `error` 부재 시에만 필수로 강제.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  code?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  state!: string;

  /**
   * 최초 로그인 시 Apple이 전달하는 사용자 정보 JSON 문자열.
   * 형식: `{"name":{"firstName":"...","lastName":"..."},"email":"..."}`
   * 최대 4096자로 제한 — Apple 페이로드는 통상 수백 바이트.
   */
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  user?: string;

  /**
   * Apple이 토큰 교환 대신 id_token을 직접 form_post로 보내는 설정에 대비.
   * 현재 구현은 authorization_code 기반이지만 페이로드 변형 대응을 위해 허용만 해둔다.
   */
  @IsOptional()
  @IsString()
  @MaxLength(8192)
  id_token?: string;

  /**
   * Apple 권한 거부/취소/서버 오류 시 전달되는 에러 코드.
   * 예: `user_cancelled_authorize`, `invalid_request`, `invalid_scope`.
   */
  @IsOptional()
  @IsString()
  @MaxLength(256)
  error?: string;

  /**
   * Apple이 함께 전달할 수 있는 사람이 읽을 수 있는 에러 설명.
   * 로그·클라이언트에는 원문을 그대로 노출하지 않고 i18n 키로 매핑한다.
   */
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  error_description?: string;
}
