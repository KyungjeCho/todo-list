import {
  Injectable,
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { RequestContext, SYSTEM_USER_ID } from './request-context';

interface AuthenticatedRequest extends Request {
  user?: { userAuthId: string };
}

/** Wraps every request in an AsyncLocalStorage context carrying the authenticated user ID. */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = req.user?.userAuthId ?? SYSTEM_USER_ID;

    return new Observable((subscriber) => {
      RequestContext.run({ currentUserId: userId }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
