import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';

export interface JwtPayload {
  sub: string; // userAuthId
  type: 'access' | 'refresh';
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateAccessToken(userAuthId: string): string {
    const payload: JwtPayload = { sub: userAuthId, type: 'access' };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn:
        this.configService.get<StringValue>('jwt.accessExpiration') || '15m',
    });
  }

  generateRefreshToken(userAuthId: string): string {
    const payload: JwtPayload = { sub: userAuthId, type: 'refresh' };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn:
        this.configService.get<StringValue>('jwt.refreshExpiration') || '7d',
    });
  }

  verifyRefreshToken(token: string): boolean {
    try {
      this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
      return true;
    } catch {
      return false;
    }
  }
}
