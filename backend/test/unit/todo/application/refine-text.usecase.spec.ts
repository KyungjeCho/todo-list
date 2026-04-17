import { NotFoundException } from '@nestjs/common';
import { RefineTextUsecase } from 'src/todo/application/refine-text.usecase';

describe('RefineTextUsecase', () => {
  let usecase: RefineTextUsecase;

  const mockUserValidationService = {
    ensureUserExists: jest.fn(),
  };

  const mockGeminiService = {
    refineText: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new RefineTextUsecase(
      mockUserValidationService as never,
      mockGeminiService as never,
    );
  });

  it('사용자 확인 후 Gemini로 텍스트를 정리하여 반환한다', async () => {
    mockUserValidationService.ensureUserExists.mockResolvedValue({
      id: 'user-id-1',
      language: 'ko',
    });
    mockGeminiService.refineText.mockResolvedValue('내일까지 장보기');

    const result = await usecase.execute({
      userAuthId: 'test-user-auth-id',
      text: '장보기 가야 돼 내일까지',
    });

    expect(result).toEqual({ refinedText: '내일까지 장보기' });
    expect(mockUserValidationService.ensureUserExists).toHaveBeenCalledWith(
      'test-user-auth-id',
    );
    expect(mockGeminiService.refineText).toHaveBeenCalledWith(
      '장보기 가야 돼 내일까지',
      'ko',
    );
  });

  it('사용자 언어가 영어면 en으로 GeminiService에 전달한다', async () => {
    mockUserValidationService.ensureUserExists.mockResolvedValue({
      id: 'user-id-1',
      language: 'en',
    });
    mockGeminiService.refineText.mockResolvedValue('Buy groceries');

    await usecase.execute({
      userAuthId: 'test-user-auth-id',
      text: 'I need to buy groceries',
    });

    expect(mockGeminiService.refineText).toHaveBeenCalledWith(
      'I need to buy groceries',
      'en',
    );
  });

  it('사용자 언어가 일본어면 ja로 전달한다', async () => {
    mockUserValidationService.ensureUserExists.mockResolvedValue({
      id: 'user-id-1',
      language: 'ja',
    });
    mockGeminiService.refineText.mockResolvedValue('買い物');

    await usecase.execute({
      userAuthId: 'test-user-auth-id',
      text: '買い物しなきゃ',
    });

    expect(mockGeminiService.refineText).toHaveBeenCalledWith(
      '買い物しなきゃ',
      'ja',
    );
  });

  it('사용자 언어가 스페인어면 es로 전달한다', async () => {
    mockUserValidationService.ensureUserExists.mockResolvedValue({
      id: 'user-id-1',
      language: 'es',
    });
    mockGeminiService.refineText.mockResolvedValue('Comprar');

    await usecase.execute({
      userAuthId: 'test-user-auth-id',
      text: 'necesito comprar',
    });

    expect(mockGeminiService.refineText).toHaveBeenCalledWith(
      'necesito comprar',
      'es',
    );
  });

  it('사용자가 존재하지 않으면 NotFoundException을 throw한다', async () => {
    mockUserValidationService.ensureUserExists.mockRejectedValue(
      new NotFoundException('USER_NOT_FOUND'),
    );

    await expect(
      usecase.execute({
        userAuthId: 'non-existent',
        text: '장보기',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('Gemini 에러를 그대로 전파한다', async () => {
    mockUserValidationService.ensureUserExists.mockResolvedValue({
      id: 'user-id-1',
      language: 'ko',
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
