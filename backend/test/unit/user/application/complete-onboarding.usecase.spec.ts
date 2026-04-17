import { NotFoundException } from '@nestjs/common';
import { CompleteOnboardingUsecase } from 'src/user/application/complete-onboarding.usecase';

describe('CompleteOnboardingUsecase', () => {
  let usecase: CompleteOnboardingUsecase;

  const mockUserRepository = {
    update: jest.fn(),
  };

  const mockUserValidationService = {
    ensureUserExists: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new CompleteOnboardingUsecase(
      mockUserRepository as never,
      mockUserValidationService as never,
    );
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    const userAuthId = 'auth-id-1';
    const baseUser = {
      id: 'user-id-1',
      userAuthId,
      userName: '홍길동',
      planTime: '08:00',
      reviewTime: '22:00',
      timezone: 'Asia/Seoul',
      language: 'ko',
      hasCompletedOnboarding: false,
    };

    it('C1: FALSE -> TRUE 로 전이 후 프로필 반환', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue({
        ...baseUser,
      });
      mockUserRepository.update.mockImplementation((u) => Promise.resolve(u));

      const result = await usecase.execute({ userAuthId });

      expect(mockUserRepository.update).toHaveBeenCalledTimes(1);
      const saved = mockUserRepository.update.mock.calls[0][0];
      expect(saved.hasCompletedOnboarding).toBe(true);
      expect(result.hasCompletedOnboarding).toBe(true);
      expect(result.id).toBe('user-id-1');
    });

    it('C2: 이미 true 인 경우 멱등 -- update 호출 없음', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue({
        ...baseUser,
        hasCompletedOnboarding: true,
      });

      const result = await usecase.execute({ userAuthId });

      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(result.hasCompletedOnboarding).toBe(true);
    });

    it('C4: 매핑 사용자 없음 -> NotFoundException(NOT_FOUND)', async () => {
      mockUserValidationService.ensureUserExists.mockRejectedValue(
        new NotFoundException('USER_NOT_FOUND'),
      );

      await expect(usecase.execute({ userAuthId: 'ghost' })).rejects.toThrow(
        /NOT_FOUND/,
      );
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });
});
