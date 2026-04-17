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

    // WHY: refresh token rotation — 기존 세션을 삭제하고 새 토큰 쌍을 발급한다.
    // 만약 탈취된 refresh token이 사용되면 정상 사용자의 세션도 이미 삭제되어
    // 토큰 재사용을 즉시 감지하고 차단할 수 있다.
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
