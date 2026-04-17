import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
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

  // WHY: refresh token을 평문이 아닌 SHA-256 해시로 저장하여,
  // DB가 유출되더라도 공격자가 토큰 원본을 복원할 수 없도록 한다.
  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
