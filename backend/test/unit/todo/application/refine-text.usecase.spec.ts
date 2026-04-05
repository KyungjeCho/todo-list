import { NotFoundException } from '@nestjs/common';
import { RefineTextUsecase } from 'src/todo/application/refine-text.usecase';

describe('RefineTextUsecase', () => {
  let usecase: RefineTextUsecase;

  const mockUserRepository = {
    findByUserAuthId: jest.fn(),
  };

  const mockGeminiService = {
    refineText: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new RefineTextUsecase(
      mockUserRepository as never,
      mockGeminiService as never,
    );
  });

  it('사용자 확인 후 Gemini로 텍스트를 정리하여 반환한다', async () => {
    mockUserRepository.findByUserAuthId.mockResolvedValue({
      id: 'user-id-1',
    });
    mockGeminiService.refineText.mockResolvedValue('내일까지 장보기');

    const result = await usecase.execute({
      userAuthId: 'test-user-auth-id',
      text: '장보기 가야 돼 내일까지',
    });

    expect(result).toEqual({ refinedText: '내일까지 장보기' });
    expect(mockUserRepository.findByUserAuthId).toHaveBeenCalledWith(
      'test-user-auth-id',
    );
    expect(mockGeminiService.refineText).toHaveBeenCalledWith(
      '장보기 가야 돼 내일까지',
    );
  });

  it('사용자가 존재하지 않으면 NotFoundException을 throw한다', async () => {
    mockUserRepository.findByUserAuthId.mockResolvedValue(null);

    await expect(
      usecase.execute({
        userAuthId: 'non-existent',
        text: '장보기',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('Gemini 에러를 그대로 전파한다', async () => {
    mockUserRepository.findByUserAuthId.mockResolvedValue({
      id: 'user-id-1',
    });
    const error = new Error('Gemini API failure');
    mockGeminiService.refineText.mockRejectedValue(error);

    await expect(
      usecase.execute({
        userAuthId: 'test-user-auth-id',
        text: '장보기',
      }),
    ).rejects.toThrow(error);
  });
});
