import { OAuthCallbackUsecase } from 'src/auth/application/oauth-callback.usecase';

describe('OAuthCallbackUsecase', () => {
  let usecase: OAuthCallbackUsecase;

  const mockAuthRepository = {
    findOauthByProviderUserId: jest.fn(),
    createUserAuth: jest.fn(),
    createOauthAccount: jest.fn(),
    createSession: jest.fn(),
  };

  const mockUserRepository = {
    create: jest.fn(),
    findByUserAuthId: jest.fn(),
  };

  const mockUserDeviceRepository = {
    upsertDevice: jest.fn(),
  };

  const mockTokenService = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new OAuthCallbackUsecase(
      mockAuthRepository as never,
      mockUserRepository as never,
      mockUserDeviceRepository as never,
      mockTokenService as never,
    );
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    const callbackDto = {
      provider: 'google',
      providerUserId: 'google-123',
      providerUserEmail: 'user@gmail.com',
      providerUserName: 'Test User',
      fcmToken: 'fcm-token-123',
      deviceType: 'IOS' as const,
      deviceName: 'iPhone 15',
      userAgent: 'Mozilla/5.0',
      ipAddress: '192.168.1.1',
    };

    it('should create new user for first-time OAuth login', async () => {
      mockAuthRepository.findOauthByProviderUserId.mockResolvedValue(null);
      mockAuthRepository.createUserAuth.mockResolvedValue({
        id: 'auth-id-1',
      });
      mockAuthRepository.createOauthAccount.mockResolvedValue({
        id: 'oauth-id-1',
      });
      mockUserRepository.create.mockResolvedValue({
        id: 'user-id-1',
        userAuthId: 'auth-id-1',
      });
      mockAuthRepository.createSession.mockResolvedValue({
        id: 'session-id-1',
      });
      mockTokenService.generateAccessToken.mockReturnValue('access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh-token');
      mockUserDeviceRepository.upsertDevice.mockResolvedValue(undefined);

      const result = await usecase.execute(callbackDto);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.isNewUser).toBe(true);
      expect(mockAuthRepository.createUserAuth).toHaveBeenCalled();
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserDeviceRepository.upsertDevice).toHaveBeenCalledWith(
        expect.objectContaining({
          fcmToken: 'fcm-token-123',
          deviceType: 'IOS',
        }),
      );
    });

    it('should return existing user for returning OAuth login', async () => {
      const existingOauth = {
        id: 'oauth-id-1',
        userAuthId: 'auth-id-1',
        userAuth: { id: 'auth-id-1' },
      };
      mockAuthRepository.findOauthByProviderUserId.mockResolvedValue(
        existingOauth,
      );
      mockUserRepository.findByUserAuthId.mockResolvedValue({
        id: 'user-id-1',
        userAuthId: 'auth-id-1',
      });
      mockAuthRepository.createSession.mockResolvedValue({
        id: 'session-id-1',
      });
      mockTokenService.generateAccessToken.mockReturnValue('access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh-token');
      mockUserDeviceRepository.upsertDevice.mockResolvedValue(undefined);

      const result = await usecase.execute(callbackDto);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.isNewUser).toBe(false);
      expect(mockAuthRepository.createUserAuth).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should register FCM device on login', async () => {
      mockAuthRepository.findOauthByProviderUserId.mockResolvedValue({
        id: 'oauth-id-1',
        userAuthId: 'auth-id-1',
      });
      mockUserRepository.findByUserAuthId.mockResolvedValue({
        id: 'user-id-1',
      });
      mockAuthRepository.createSession.mockResolvedValue({
        id: 'session-id-1',
      });
      mockTokenService.generateAccessToken.mockReturnValue('access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh-token');
      mockUserDeviceRepository.upsertDevice.mockResolvedValue(undefined);

      await usecase.execute(callbackDto);

      expect(mockUserDeviceRepository.upsertDevice).toHaveBeenCalledWith(
        expect.objectContaining({
          fcmToken: 'fcm-token-123',
          deviceType: 'IOS',
          deviceName: 'iPhone 15',
        }),
      );
    });

    it('should create session with userAgent and ipAddress', async () => {
      mockAuthRepository.findOauthByProviderUserId.mockResolvedValue({
        id: 'oauth-id-1',
        userAuthId: 'auth-id-1',
      });
      mockUserRepository.findByUserAuthId.mockResolvedValue({
        id: 'user-id-1',
      });
      mockAuthRepository.createSession.mockResolvedValue({
        id: 'session-id-1',
      });
      mockTokenService.generateAccessToken.mockReturnValue('access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh-token');
      mockUserDeviceRepository.upsertDevice.mockResolvedValue(undefined);

      await usecase.execute(callbackDto);

      expect(mockAuthRepository.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
        }),
      );
    });

    it('should throw error when provider email is missing', async () => {
      const dtoWithoutEmail = { ...callbackDto, providerUserEmail: '' };

      await expect(usecase.execute(dtoWithoutEmail)).rejects.toThrow();
    });
  });
});
