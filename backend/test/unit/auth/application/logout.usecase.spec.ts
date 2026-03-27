import { LogoutUsecase } from 'src/auth/application/logout.usecase';

describe('LogoutUsecase', () => {
  let usecase: LogoutUsecase;

  const mockAuthRepository = {
    findSessionByRefreshToken: jest.fn(),
    deleteSession: jest.fn(),
  };

  const mockUserDeviceRepository = {
    deleteByFcmToken: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new LogoutUsecase(
      mockAuthRepository as never,
      mockUserDeviceRepository as never,
    );
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    const logoutDto = {
      refreshToken: 'valid-refresh-token',
      fcmToken: 'fcm-token-123',
    };

    it('should invalidate session on logout', async () => {
      const existingSession = {
        id: 'session-id-1',
        userAuthId: 'auth-id-1',
        refreshToken: 'valid-refresh-token',
      };

      mockAuthRepository.findSessionByRefreshToken.mockResolvedValue(
        existingSession,
      );
      mockAuthRepository.deleteSession.mockResolvedValue(undefined);
      mockUserDeviceRepository.deleteByFcmToken.mockResolvedValue(undefined);

      const result = await usecase.execute(logoutDto);

      expect(result).toBeDefined();
      expect(result.message).toBe('Successfully logged out');
      expect(mockAuthRepository.deleteSession).toHaveBeenCalledWith(
        'session-id-1',
      );
    });

    it('should delete FCM device token on logout', async () => {
      const existingSession = {
        id: 'session-id-1',
        userAuthId: 'auth-id-1',
        refreshToken: 'valid-refresh-token',
      };

      mockAuthRepository.findSessionByRefreshToken.mockResolvedValue(
        existingSession,
      );
      mockAuthRepository.deleteSession.mockResolvedValue(undefined);
      mockUserDeviceRepository.deleteByFcmToken.mockResolvedValue(undefined);

      await usecase.execute(logoutDto);

      expect(mockUserDeviceRepository.deleteByFcmToken).toHaveBeenCalledWith(
        'fcm-token-123',
      );
    });

    it('should throw error for invalid refresh token', async () => {
      mockAuthRepository.findSessionByRefreshToken.mockResolvedValue(null);

      await expect(
        usecase.execute({
          refreshToken: 'invalid-token',
          fcmToken: 'fcm-token-123',
        }),
      ).rejects.toThrow();
    });

    it('should succeed even if FCM token does not exist', async () => {
      const existingSession = {
        id: 'session-id-1',
        userAuthId: 'auth-id-1',
        refreshToken: 'valid-refresh-token',
      };

      mockAuthRepository.findSessionByRefreshToken.mockResolvedValue(
        existingSession,
      );
      mockAuthRepository.deleteSession.mockResolvedValue(undefined);
      mockUserDeviceRepository.deleteByFcmToken.mockResolvedValue(undefined);

      const result = await usecase.execute(logoutDto);

      expect(result.message).toBe('Successfully logged out');
    });
  });
});
