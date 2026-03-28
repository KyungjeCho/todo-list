import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { firstValueFrom, isObservable } from 'rxjs';

interface AuthRequest extends Request {
  user?: { userAuthId: string };
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: AuthRequest = context
      .switchToHttp()
      .getRequest<AuthRequest>();
    const authHeader = request.headers?.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }

    try {
      const result: boolean | Promise<boolean> | Observable<boolean> =
        super.canActivate(context);
      if (isObservable(result)) {
        return await firstValueFrom(result);
      }
      return await result;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('UNAUTHORIZED');
    }
  }

  handleRequest<T>(err: Error | null, user: T): T {
    if (err || !user) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }
    return user;
  }
}
