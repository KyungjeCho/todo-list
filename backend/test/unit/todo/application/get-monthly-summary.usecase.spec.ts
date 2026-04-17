import { NotFoundException } from '@nestjs/common';
import { GetMonthlySummaryUsecase } from 'src/todo/application/get-monthly-summary.usecase';

describe('GetMonthlySummaryUsecase', () => {
  let usecase: GetMonthlySummaryUsecase;

  const mockTodoRepository = {
    findByUserIdAndMonth: jest.fn(),
  };

  const mockUserValidationService = {
    ensureUserExists: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new GetMonthlySummaryUsecase(
      mockTodoRepository as never,
      mockUserValidationService as never,
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

    const input = {
      userAuthId: 'auth-id-1',
      year: 2026,
      month: 3,
    };

    it('날짜별 완료/전체 건수를 집계하여 반환한다', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndMonth.mockResolvedValue([
        {
          id: 'todo-1',
          userId: 'user-id-1',
          todoDate: '2026-03-01',
          content: '할 일 1',
          status: 'COMPLETED',
          createdAt: new Date('2026-03-01T09:00:00Z'),
          updatedAt: new Date('2026-03-01T10:00:00Z'),
        },
        {
          id: 'todo-2',
          userId: 'user-id-1',
          todoDate: '2026-03-01',
          content: '할 일 2',
          status: 'ACTIVE',
          createdAt: new Date('2026-03-01T09:00:00Z'),
          updatedAt: new Date('2026-03-01T09:00:00Z'),
        },
        {
          id: 'todo-3',
          userId: 'user-id-1',
          todoDate: '2026-03-15',
          content: '할 일 3',
          status: 'COMPLETED',
          createdAt: new Date('2026-03-15T09:00:00Z'),
          updatedAt: new Date('2026-03-15T12:00:00Z'),
        },
        {
          id: 'todo-4',
          userId: 'user-id-1',
          todoDate: '2026-03-15',
          content: '할 일 4',
          status: 'COMPLETED',
          createdAt: new Date('2026-03-15T09:00:00Z'),
          updatedAt: new Date('2026-03-15T14:00:00Z'),
        },
        {
          id: 'todo-5',
          userId: 'user-id-1',
          todoDate: '2026-03-15',
          content: '할 일 5',
          status: 'ACTIVE',
          createdAt: new Date('2026-03-15T09:00:00Z'),
          updatedAt: new Date('2026-03-15T09:00:00Z'),
        },
      ]);

      const result = await usecase.execute(input);

      expect(result.year).toBe(2026);
      expect(result.month).toBe(3);
      expect(result.days).toHaveLength(2);

      const day1 = result.days.find(
        (d: { date: string }) => d.date === '2026-03-01',
      );
      expect(day1).toBeDefined();
      expect(day1!.totalCount).toBe(2);
      expect(day1!.completedCount).toBe(1);
      expect(day1!.activeCount).toBe(1);

      const day15 = result.days.find(
        (d: { date: string }) => d.date === '2026-03-15',
      );
      expect(day15).toBeDefined();
      expect(day15!.totalCount).toBe(3);
      expect(day15!.completedCount).toBe(2);
      expect(day15!.activeCount).toBe(1);
    });

    it('할 일이 없는 월은 빈 days 배열을 반환한다', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndMonth.mockResolvedValue([]);

      const result = await usecase.execute(input);

      expect(result.year).toBe(2026);
      expect(result.month).toBe(3);
      expect(result.days).toHaveLength(0);
    });

    it('사용자를 찾지 못하면 NotFoundException을 던진다', async () => {
      mockUserValidationService.ensureUserExists.mockRejectedValue(
        new NotFoundException('USER_NOT_FOUND'),
      );

      await expect(usecase.execute(input)).rejects.toThrow('USER_NOT_FOUND');
    });

    it('userAuthId로 사용자를 조회한다', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndMonth.mockResolvedValue([]);

      await usecase.execute(input);

      expect(mockUserValidationService.ensureUserExists).toHaveBeenCalledWith(
        'auth-id-1',
      );
    });

    it('userId, year, month를 repository에 전달한다', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndMonth.mockResolvedValue([]);

      await usecase.execute(input);

      expect(mockTodoRepository.findByUserIdAndMonth).toHaveBeenCalledWith(
        'user-id-1',
        2026,
        3,
      );
    });

    it('INACTIVE는 totalCount에 포함되고 CARRIED_OVER는 제외된다', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndMonth.mockResolvedValue([
        {
          id: 'todo-1',
          userId: 'user-id-1',
          todoDate: '2026-03-10',
          content: '할 일 1',
          status: 'INACTIVE',
          createdAt: new Date('2026-03-10T09:00:00Z'),
          updatedAt: new Date('2026-03-10T09:00:00Z'),
        },
        {
          id: 'todo-2',
          userId: 'user-id-1',
          todoDate: '2026-03-10',
          content: '할 일 2',
          status: 'CARRIED_OVER',
          createdAt: new Date('2026-03-10T09:00:00Z'),
          updatedAt: new Date('2026-03-10T09:00:00Z'),
        },
        {
          id: 'todo-3',
          userId: 'user-id-1',
          todoDate: '2026-03-10',
          content: '할 일 3',
          status: 'ACTIVE',
          createdAt: new Date('2026-03-10T09:00:00Z'),
          updatedAt: new Date('2026-03-10T09:00:00Z'),
        },
      ]);

      const result = await usecase.execute(input);

      const day10 = result.days.find(
        (d: { date: string }) => d.date === '2026-03-10',
      );
      expect(day10!.totalCount).toBe(2);
      expect(day10!.completedCount).toBe(0);
      expect(day10!.activeCount).toBe(1);
      expect(day10!.carriedOverCount).toBe(1);
    });

    it('모든 할 일이 완료+이월이면 completedCount === totalCount (초록 표시)', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndMonth.mockResolvedValue([
        {
          id: 'todo-1',
          userId: 'user-id-1',
          todoDate: '2026-03-10',
          content: '완료된 할 일',
          status: 'COMPLETED',
          createdAt: new Date('2026-03-10T09:00:00Z'),
          updatedAt: new Date('2026-03-10T10:00:00Z'),
        },
        {
          id: 'todo-2',
          userId: 'user-id-1',
          todoDate: '2026-03-10',
          content: '이월된 할 일',
          status: 'CARRIED_OVER',
          createdAt: new Date('2026-03-10T09:00:00Z'),
          updatedAt: new Date('2026-03-10T10:00:00Z'),
        },
      ]);

      const result = await usecase.execute(input);

      const day10 = result.days.find(
        (d: { date: string }) => d.date === '2026-03-10',
      );
      expect(day10!.totalCount).toBe(1);
      expect(day10!.completedCount).toBe(1);
      expect(day10!.carriedOverCount).toBe(1);
    });

    it('days 배열은 날짜순으로 정렬된다', async () => {
      mockUserValidationService.ensureUserExists.mockResolvedValue(mockUser);
      mockTodoRepository.findByUserIdAndMonth.mockResolvedValue([
        {
          id: 'todo-1',
          userId: 'user-id-1',
          todoDate: '2026-03-20',
          content: '나중 할 일',
          status: 'ACTIVE',
          createdAt: new Date('2026-03-20T09:00:00Z'),
          updatedAt: new Date('2026-03-20T09:00:00Z'),
        },
        {
          id: 'todo-2',
          userId: 'user-id-1',
          todoDate: '2026-03-05',
          content: '먼저 할 일',
          status: 'ACTIVE',
          createdAt: new Date('2026-03-05T09:00:00Z'),
          updatedAt: new Date('2026-03-05T09:00:00Z'),
        },
      ]);

      const result = await usecase.execute(input);

      expect(result.days).toHaveLength(2);
      expect(result.days[0].date).toBe('2026-03-05');
      expect(result.days[1].date).toBe('2026-03-20');
    });
  });
});
