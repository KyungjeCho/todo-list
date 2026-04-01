import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from '../infrastructure/auth.repository';
import { TokenService } from '../infrastructure/token.service';
import { SESSION_EXPIRY_MS } from '../domain/auth.constants';

interface TokenRefreshInput {
  refreshToken: string;
}

interface TokenRefreshOutput {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenRefreshUsecase {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: TokenRefreshInput): Promise<TokenRefreshOutput> {
    const session = await this.authRepository.findSessionByRefreshToken(
      input.refreshToken,
    );

    if (!session) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }

    if (session.expiredAt && new Date(session.expiredAt) < new Date()) {
      await this.authRepository.deleteSession(session.id);
      throw new UnauthorizedException('SESSION_EXPIRED');
    }

    const isValid = this.tokenService.verifyRefreshToken(input.refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }

    await this.authRepository.deleteSession(session.id);

    const accessToken = this.tokenService.generateAccessToken(
      session.userAuthId,
    );
    const refreshToken = this.tokenService.generateRefreshToken(
      session.userAuthId,
    );

    await this.authRepository.createSession({
      userAuthId: session.userAuthId,
      refreshToken: TokenService.hashToken(refreshToken),
      expiredAt: new Date(Date.now() + SESSION_EXPIRY_MS),
    });

    return { accessToken, refreshToken };
  }
}
