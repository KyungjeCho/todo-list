import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

interface ExceptionResponseObject {
  message?: string;
  code?: string;
  statusCode?: number;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message: string;
      let code: string;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = HttpException.name;
      } else {
        const responseObj = exceptionResponse as ExceptionResponseObject;
        message = responseObj.message ?? exception.message;
        code = responseObj.code ?? HttpException.name;
      }

      response.status(statusCode).json({
        statusCode,
        code,
        message,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const err = exception as ExceptionResponseObject;
    const statusCode = err?.statusCode ?? 500;
    const code = err?.code ?? 'INTERNAL_SERVER_ERROR';
    const message = err?.message ?? 'Internal server error';

    response.status(statusCode).json({
      statusCode,
      code,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
