import { OAuthCallbackUsecase } from 'src/auth/application/oauth-callback.usecase';

describe('OAuthCallbackUsecase — i18n (timezone/language)', () => {
  let usecase: OAuthCallbackUsecase;

  const mockAuthRepository = {
    findOauthByProvider: jest.fn(),
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
    generateAccessToken: jest.fn().mockReturnValue('access-token'),
    generateRefreshToken: jest.fn().mockReturnValue('refresh-token'),
  };

  const baseDto = {
    provider: 'google',
    providerUserId: 'google-i18n-1',
    providerUserEmail: 'i18n@example.com',
    providerUserName: 'I18n User',
    deviceType: 'IOS' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthRepository.findOauthByProvider.mockResolvedValue(null);
    mockAuthRepository.createUserAuth.mockResolvedValue({ id: 'auth-id-1' });
    mockAuthRepository.createOauthAccount.mockResolvedValue({
      id: 'oauth-id-1',
    });
    mockUserRepository.create.mockResolvedValue({
      id: 'user-id-1',
      userAuthId: 'auth-id-1',
    });
    mockAuthRepository.createSession.mockResolvedValue({ id: 'session-id-1' });

    usecase = new OAuthCallbackUsecase(
      mockAuthRepository as never,
      mockUserRepository as never,
      mockUserDeviceRepository as never,
      mockTokenService as never,
    );
  });

  it('신규 사용자 생성 시 유효한 timezone/language를 그대로 저장한다', async () => {
    await usecase.execute({
      ...baseDto,
      timezone: 'America/Buenos_Aires',
      language: 'es',
    });

    expect(mockUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        timezone: 'America/Buenos_Aires',
        language: 'es',
      }),
    );
  });

  it('무효한 timezone은 null로 저장한다', async () => {
    await usecase.execute({
      ...baseDto,
      timezone: 'Invalid/Unknown',
      language: 'en',
    });

    expect(mockUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ timezone: null, language: 'en' }),
    );
  });

  it('무효한 language는 "en"으로 저장한다', async () => {
    await usecase.execute({
      ...baseDto,
      timezone: 'Asia/Seoul',
      language: 'fr',
    });

    expect(mockUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ timezone: 'Asia/Seoul', language: 'en' }),
    );
  });

  it('legacy 형식(ko-KR)도 "en"으로 저장한다 (엄격 화이트리스트)', async () => {
    await usecase.execute({
      ...baseDto,
      language: 'ko-KR',
    });

    expect(mockUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'en' }),
    );
  });

  it('timezone/language 미전달 시 기본값(null, "en")을 저장한다', async () => {
    await usecase.execute(baseDto);

    expect(mockUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ timezone: null, language: 'en' }),
    );
  });

  it.each(['ko', 'en', 'ja', 'es'])('유효 언어 %s를 수용한다', async (lang) => {
    await usecase.execute({ ...baseDto, language: lang });
    expect(mockUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ language: lang }),
    );
  });

  it('기존 사용자 로그인 시에는 timezone/language를 변경하지 않는다', async () => {
    mockAuthRepository.findOauthByProvider.mockResolvedValue({
      id: 'oauth-id-1',
      userAuthId: 'auth-id-1',
    });
    mockUserRepository.findByUserAuthId.mockResolvedValue({
      id: 'user-id-1',
      userAuthId: 'auth-id-1',
    });

    await usecase.execute({
      ...baseDto,
      timezone: 'Asia/Tokyo',
      language: 'ja',
    });

    expect(mockUserRepository.create).not.toHaveBeenCalled();
  });
});
