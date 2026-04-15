import { GetProfileUsecase } from 'src/user/application/get-profile.usecase';

describe('GetProfileUsecase', () => {
  let usecase: GetProfileUsecase;

  const mockUserRepository = {
    findByUserAuthId: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new GetProfileUsecase(mockUserRepository as never);
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    const userAuthId = 'auth-id-1';

    it('should return user profile for valid userAuthId', async () => {
      const mockUser = {
        id: 'user-id-1',
        userAuthId: 'auth-id-1',
        userName: '홍길동',
        planTime: '08:00',
        reviewTime: '22:00',
        timezone: 'Asia/Seoul',
        language: 'ko',
        hasCompletedOnboarding: true,
      };

      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);

      const result = await usecase.execute({ userAuthId });

      expect(result).toBeDefined();
      expect(result.id).toBe('user-id-1');
      expect(result.userName).toBe('홍길동');
      expect(result.planTime).toBe('08:00');
      expect(result.reviewTime).toBe('22:00');
      expect(result.timezone).toBe('Asia/Seoul');
      expect(result.language).toBe('ko');
      expect(result.hasCompletedOnboarding).toBe(true);
    });

    it('should expose hasCompletedOnboarding:false when not yet completed', async () => {
      const mockUser = {
        id: 'user-id-2',
        userAuthId: 'auth-id-2',
        userName: 'New',
        planTime: null,
        reviewTime: null,
        timezone: null,
        language: 'en',
        hasCompletedOnboarding: false,
      };

      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);

      const result = await usecase.execute({ userAuthId: 'auth-id-2' });

      expect(result.hasCompletedOnboarding).toBe(false);
    });

    it('should return profile with null planTime and reviewTime', async () => {
      const mockUser = {
        id: 'user-id-1',
        userAuthId: 'auth-id-1',
        userName: 'User',
        planTime: null,
        reviewTime: null,
        timezone: 'UTC',
        language: 'en',
      };

      mockUserRepository.findByUserAuthId.mockResolvedValue(mockUser);

      const result = await usecase.execute({ userAuthId });

      expect(result.planTime).toBeNull();
      expect(result.reviewTime).toBeNull();
    });

    it('should throw NOT_FOUND for non-existent user', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue(null);

      await expect(
        usecase.execute({ userAuthId: 'non-existent' }),
      ).rejects.toThrow();
    });

    // WHY(fix-bug-01 ①): Postgres `time` 컬럼이 `HH:mm:ss`로 반환될 때 DTO 경계에서
    // `HH:mm`으로 잘라 보내야 클라이언트가 리로드 전후 포맷을 일치시킬 수 있다.
    it('should normalize HH:mm:ss from DB to HH:mm in response', async () => {
      mockUserRepository.findByUserAuthId.mockResolvedValue({
        id: 'user-id-3',
        userAuthId: 'auth-id-3',
        userName: 'User',
        planTime: '08:00:00',
        reviewTime: '22:30:00',
        timezone: 'UTC',
        language: 'en',
        hasCompletedOnboarding: true,
      });

      const result = await usecase.execute({ userAuthId: 'auth-id-3' });

      expect(result.planTime).toBe('08:00');
      expect(result.reviewTime).toBe('22:30');
    });
  });
});
