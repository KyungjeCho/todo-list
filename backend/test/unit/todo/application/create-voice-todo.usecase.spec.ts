import { NotFoundException } from '@nestjs/common';
import { CreateVoiceTodoUsecase } from 'src/todo/application/create-voice-todo.usecase';

describe('CreateVoiceTodoUsecase', () => {
  let usecase: CreateVoiceTodoUsecase;

  const mockTodoRepository = {
    create: jest.fn(),
    findById: jest.fn(),
  };

  const mockUserValidationService = {
    ensureUserExists: jest.fn(),
  };

  const mockGeminiService = {
    transcribeAndRefine: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new CreateVoiceTodoUsecase(
      mockTodoRepository as never,
      mockUserValidationService as never,
      mockGeminiService as never,
    );
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    const mockUser = {
      id: 'user-id-1',
      userAuthId: 'auth-id-1',
    };

    const audioBuffer = Buffer.from('fake-audio-data');

    const executeDto = {
      userAuthId: 'auth-id-1',
      audioBuffer,
      mimeType: 'audio/wav',
      todoDate: '2026-04-01',
    };

    it('오디오를 Gemini로 변환 후 할 일을 생성하고 rawText 포함 응답을 반환한다', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockGeminiService.transcribeAndRefine.mockResolvedValue('장보기');
      mockTodoRepository.create.mockResolvedValue({
        id: 'todo-id-1',
        userId: 'user-id-1',
        content: '장보기',
        status: 'ACTIVE',
        todoDate: '2026-04-01',
        memos: [],
        createdAt: new Date('2026-04-01T09:00:00Z'),
        updatedAt: new Date('2026-04-01T09:00:00Z'),
      });

      const result = await usecase.execute(executeDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('todo-id-1');
      expect(result.content).toBe('장보기');
      expect(result.rawText).toBe('장보기');
      expect(result.status).toBe('ACTIVE');
      expect(result.todoDate).toBe('2026-04-01');
    });

    it('GeminiService.transcribeAndRefine에 오디오 버퍼와 mimeType을 전달한다', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockGeminiService.transcribeAndRefine.mockResolvedValue('운동하기');
      mockTodoRepository.create.mockResolvedValue({
        id: 'todo-id-1',
        userId: 'user-id-1',
        content: '운동하기',
        status: 'ACTIVE',
        todoDate: '2026-04-01',
        memos: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await usecase.execute(executeDto);

      expect(mockGeminiService.transcribeAndRefine).toHaveBeenCalledWith(
        audioBuffer,
        'audio/wav',
      );
    });

    it('변환된 텍스트로 Todo를 생성한다', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockGeminiService.transcribeAndRefine.mockResolvedValue('독서하기');
      mockTodoRepository.create.mockResolvedValue({
        id: 'todo-id-1',
        userId: 'user-id-1',
        content: '독서하기',
        status: 'ACTIVE',
        todoDate: '2026-04-01',
        memos: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await usecase.execute(executeDto);

      expect(mockTodoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id-1',
          content: '독서하기',
          todoDate: '2026-04-01',
          status: 'ACTIVE',
        }),
      );
    });

    it('전달된 todoDate를 그대로 사용한다', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockGeminiService.transcribeAndRefine.mockResolvedValue('할 일');
      mockTodoRepository.create.mockResolvedValue({
        id: 'todo-id-1',
        userId: 'user-id-1',
        content: '할 일',
        status: 'ACTIVE',
        todoDate: '2026-04-01',
        memos: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await usecase.execute(executeDto);

      expect(mockTodoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          todoDate: '2026-04-01',
        }),
      );
    });

    it('사용자를 찾을 수 없으면 에러를 throw한다', async () => {
      mockUserValidationService.ensureUserExists.mockRejectedValue(
        new NotFoundException('USER_NOT_FOUND'),
      );

      await expect(usecase.execute(executeDto)).rejects.toThrow();
    });

    it('GeminiService 호출이 실패하면 에러를 전파한다', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockGeminiService.transcribeAndRefine.mockRejectedValue(
        new Error('VOICE_AI_API_ERROR'),
      );

      await expect(usecase.execute(executeDto)).rejects.toThrow();
    });

    it('createdBy를 사용자 ID로 설정한다', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockGeminiService.transcribeAndRefine.mockResolvedValue('할 일');
      mockTodoRepository.create.mockResolvedValue({
        id: 'todo-id-1',
        userId: 'user-id-1',
        content: '할 일',
        status: 'ACTIVE',
        todoDate: '2026-04-01',
        memos: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await usecase.execute(executeDto);

      expect(mockTodoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'user-id-1',
        }),
      );
    });

    it('Gemini 반환 텍스트가 빈 문자열이면 CONTENT_REQUIRED 에러를 throw한다', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockGeminiService.transcribeAndRefine.mockResolvedValue('   ');

      await expect(usecase.execute(executeDto)).rejects.toThrow(
        'CONTENT_REQUIRED',
      );
    });

    it('Gemini 반환 텍스트가 255자를 초과하면 CONTENT_TOO_LONG 에러를 throw한다', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockGeminiService.transcribeAndRefine.mockResolvedValue('가'.repeat(256));

      await expect(usecase.execute(executeDto)).rejects.toThrow(
        'CONTENT_TOO_LONG',
      );
    });

    it('응답에 memos 배열을 포함한다', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockGeminiService.transcribeAndRefine.mockResolvedValue('장보기');
      mockTodoRepository.create.mockResolvedValue({
        id: 'todo-id-1',
        userId: 'user-id-1',
        content: '장보기',
        status: 'ACTIVE',
        todoDate: '2026-04-01',
        memos: [],
        createdAt: new Date('2026-04-01T09:00:00Z'),
        updatedAt: new Date('2026-04-01T09:00:00Z'),
      });

      const result = await usecase.execute(executeDto);

      expect(result.memos).toEqual([]);
    });
  });
});
