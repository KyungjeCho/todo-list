import { TokenRefreshUsecase } from 'src/auth/application/token-refresh.usecase';
import { TokenService } from 'src/auth/infrastructure/token.service';

describe('TokenRefreshUsecase', () => {
  let usecase: TokenRefreshUsecase;

  const mockAuthRepository = {
    findSessionByRefreshToken: jest.fn(),
    deleteSession: jest.fn(),
    createSession: jest.fn(),
  };

  const mockTokenService = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new TokenRefreshUsecase(
      mockAuthRepository as never,
      mockTokenService as never,
    );
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    const validRefreshToken = 'valid-refresh-token';

    it('should return new token pair for valid refresh token', async () => {
      const existingSession = {
        id: 'session-id-1',
        userAuthId: 'auth-id-1',
        refreshToken: validRefreshToken,
        expiredAt: new Date('2026-04-27T00:00:00Z'),
      };

      mockAuthRepository.findSessionByRefreshToken.mockResolvedValue(
        existingSession,
      );
      mockTokenService.verifyRefreshToken.mockReturnValue(true);
      mockAuthRepository.deleteSession.mockResolvedValue(undefined);
      mockAuthRepository.createSession.mockResolvedValue({
        id: 'session-id-2',
      });
      mockTokenService.generateAccessToken.mockReturnValue('new-access-token');
      mockTokenService.generateRefreshToken.mockReturnValue(
        'new-refresh-token',
      );

      const result = await usecase.execute({
        refreshToken: validRefreshToken,
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should invalidate old session on token refresh (rotation)', async () => {
      const existingSession = {
        id: 'session-id-1',
        userAuthId: 'auth-id-1',
        refreshToken: validRefreshToken,
        expiredAt: new Date('2026-04-27T00:00:00Z'),
      };

      mockAuthRepository.findSessionByRefreshToken.mockResolvedValue(
        existingSession,
      );
      mockTokenService.verifyRefreshToken.mockReturnValue(true);
      mockAuthRepository.deleteSession.mockResolvedValue(undefined);
      mockAuthRepository.createSession.mockResolvedValue({
        id: 'session-id-2',
      });
      mockTokenService.generateAccessToken.mockReturnValue('new-access-token');
      mockTokenService.generateRefreshToken.mockReturnValue(
        'new-refresh-token',
      );

      await usecase.execute({ refreshToken: validRefreshToken });

      expect(mockAuthRepository.deleteSession).toHaveBeenCalledWith(
        'session-id-1',
      );
      const expectedHash = TokenService.hashToken('new-refresh-token');
      expect(mockAuthRepository.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshToken: expectedHash,
        }),
      );
    });

    it('should throw UNAUTHORIZED for non-existent refresh token', async () => {
      mockAuthRepository.findSessionByRefreshToken.mockResolvedValue(null);

      await expect(
        usecase.execute({ refreshToken: 'non-existent-token' }),
      ).rejects.toThrow();
    });

    it('should throw UNAUTHORIZED for expired refresh token', async () => {
      const expiredSession = {
        id: 'session-id-1',
        userAuthId: 'auth-id-1',
        refreshToken: validRefreshToken,
        expiredAt: new Date('2020-01-01T00:00:00Z'),
      };

      mockAuthRepository.findSessionByRefreshToken.mockResolvedValue(
        expiredSession,
      );
      mockTokenService.verifyRefreshToken.mockReturnValue(false);

      await expect(
        usecase.execute({ refreshToken: validRefreshToken }),
      ).rejects.toThrow();
    });
  });
});
