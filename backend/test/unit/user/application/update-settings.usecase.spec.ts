import { UpdateSettingsUsecase } from 'src/user/application/update-settings.usecase';

describe('UpdateSettingsUsecase', () => {
  let usecase: UpdateSettingsUsecase;

  const mockUserRepository = {
    findByUserAuthId: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new UpdateSettingsUsecase(mockUserRepository as never);
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    const userAuthId = 'auth-id-1';
    const existingUser = {
      id: 'user-id-1',
      userAuthId: 'auth-id-1',
      userName: '홍길동',
      planTime: '08:00',
      reviewTime: '22:00',
      timezone: 'Asia/Seoul',
      language: 'ko-KR',
    };

    it('should update userName', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({
        ...existingUser,
        userName: '김철수',
      });

      const result = await usecase.execute({
        userAuthId,
        userName: '김철수',
      });

      expect(result).toBeDefined();
      expect(result.userName).toBe('김철수');
    });

    it('should update planTime', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({
        ...existingUser,
        planTime: '09:00',
      });

      const result = await usecase.execute({
        userAuthId,
        planTime: '09:00',
      });

      expect(result.planTime).toBe('09:00');
    });

    it('should set planTime to null (disable notification)', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({
        ...existingUser,
        planTime: null,
      });

      const result = await usecase.execute({
        userAuthId,
        planTime: null,
      });

      expect(result.planTime).toBeNull();
    });

    it('should update reviewTime', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({
        ...existingUser,
        reviewTime: '21:00',
      });

      const result = await usecase.execute({
        userAuthId,
        reviewTime: '21:00',
      });

      expect(result.reviewTime).toBe('21:00');
    });

    it('should update timezone', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({
        ...existingUser,
        timezone: 'America/New_York',
      });

      const result = await usecase.execute({
        userAuthId,
        timezone: 'America/New_York',
      });

      expect(result.timezone).toBe('America/New_York');
    });

    it('should update language with valid supported language', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({
        ...existingUser,
        language: 'en',
      });

      const result = await usecase.execute({
        userAuthId,
        language: 'en',
      });

      expect(result.language).toBe('en');
    });

    it.each(['ko', 'en', 'ja', 'es'])(
      'should accept valid language: %s',
      async (lang) => {
        mockUserRepository.findByUserAuthId.mockResolvedValue(existingUser);
        mockUserRepository.update.mockResolvedValue({
          ...existingUser,
          language: lang,
        });

        const result = await usecase.execute({
          userAuthId,
          language: lang,
        });

        expect(result.language).toBe(lang);
      },
    );

    it.each(['fr', 'zh', 'ko-KR', 'en-US', 'invalid', ''])(
      'should throw BAD_REQUEST for unsupported language: %s',
      async (lang) => {
        mockUserRepository.findByUserAuthId.mockResolvedValue(existingUser);

        await expect(
          usecase.execute({ userAuthId, language: lang }),
        ).rejects.toThrow();
      },
    );

    it('should update multiple fields at once (onboarding)', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(existingUser);
      const updated = {
        ...existingUser,
        planTime: '07:00',
        reviewTime: '23:00',
        timezone: 'Asia/Tokyo',
      };
      mockUserRepository.update.mockResolvedValue(updated);

      const result = await usecase.execute({
        userAuthId,
        planTime: '07:00',
        reviewTime: '23:00',
        timezone: 'Asia/Tokyo',
      });

      expect(result.planTime).toBe('07:00');
      expect(result.reviewTime).toBe('23:00');
      expect(result.timezone).toBe('Asia/Tokyo');
    });

    it('should throw NOT_FOUND for non-existent user', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(null);

      await expect(
        usecase.execute({ userAuthId: 'non-existent', userName: 'Test' }),
      ).rejects.toThrow();
    });

    it('should throw error for invalid time format', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(existingUser);

      await expect(
        usecase.execute({ userAuthId, planTime: 'invalid' }),
      ).rejects.toThrow();
    });

    it('should throw error for invalid timezone', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(existingUser);

      await expect(
        usecase.execute({ userAuthId, timezone: 'Invalid/Zone' }),
      ).rejects.toThrow();
    });

    it('should throw error for userName exceeding 100 characters', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(existingUser);

      await expect(
        usecase.execute({ userAuthId, userName: 'a'.repeat(101) }),
      ).rejects.toThrow();
    });
  });
});
