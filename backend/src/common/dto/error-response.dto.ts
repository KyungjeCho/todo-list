export class ErrorResponseDto {
  readonly statusCode: number;
  readonly code: string;
  readonly message: string;
  readonly timestamp: string;

  constructor(statusCode: number, code: string, message: string) {
    this.statusCode = statusCode;
    this.code = code;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }
}
