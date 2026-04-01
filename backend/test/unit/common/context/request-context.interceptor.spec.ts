import { RequestContextInterceptor } from 'src/common/context/request-context.interceptor';
import {
  RequestContext,
  SYSTEM_USER_ID,
} from 'src/common/context/request-context';
import type { ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, lastValueFrom } from 'rxjs';

describe('RequestContextInterceptor', () => {
  let interceptor: RequestContextInterceptor;

  beforeEach(() => {
    interceptor = new RequestContextInterceptor();
  });

  function createMockContext(user?: { userAuthId: string }): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should set authenticated user ID in RequestContext', async () => {
    const userId = 'auth-user-123';
    const context = createMockContext({ userAuthId: userId });
    let capturedUserId = '';

    const handler: CallHandler = {
      handle: () =>
        new Observable((subscriber) => {
          capturedUserId = RequestContext.getCurrentUserId();
          subscriber.next('result');
          subscriber.complete();
        }),
    };

    const result$ = interceptor.intercept(context, handler);
    const result = await lastValueFrom(result$);

    expect(result).toBe('result');
    expect(capturedUserId).toBe(userId);
  });

  it('should use SYSTEM_USER_ID when no user is authenticated', async () => {
    const context = createMockContext(undefined);
    let capturedUserId = '';

    const handler: CallHandler = {
      handle: () =>
        new Observable((subscriber) => {
          capturedUserId = RequestContext.getCurrentUserId();
          subscriber.next('result');
          subscriber.complete();
        }),
    };

    const result$ = interceptor.intercept(context, handler);
    await lastValueFrom(result$);

    expect(capturedUserId).toBe(SYSTEM_USER_ID);
  });
});
