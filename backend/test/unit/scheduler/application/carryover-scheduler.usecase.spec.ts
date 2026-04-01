import { CarryoverSchedulerUsecase } from 'src/scheduler/application/carryover-scheduler.usecase';
import { TodoStatus } from 'src/todo/domain/todo.entity';

describe('CarryoverSchedulerUsecase', () => {
  let usecase: CarryoverSchedulerUsecase;

  const mockUserRepository = {
    findAllWithTimezone: jest.fn(),
  };

  const mockTodoRepository = {
    findByUserIdAndDate: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };

  const mockTxTodoRepo = {
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockTxHistoryRepo = {
    save: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(async (cb: (manager: unknown) => Promise<void>) => {
      const manager = {
        getRepository: jest.fn((entity: unknown) => {
          const entityName = typeof entity === 'function' ? entity.name : '';
          if (entityName === 'Todo') return mockTxTodoRepo;
          return mockTxHistoryRepo;
        }),
      };
      await cb(manager);
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTxHistoryRepo.findOne.mockResolvedValue(null);
    usecase = new CarryoverSchedulerUsecase(
      mockUserRepository as never,
      mockTodoRepository as never,
      mockDataSource as never,
    );
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    describe('timezone-based midnight detection', () => {
      it('should process users whose local time is midnight (Asia/Seoul, UTC+9)', async () => {
        // UTC 15:00 = Asia/Seoul 00:00 (midnight)
        const now = new Date('2026-03-28T15:00:00Z');

        const seoulUser = {
          id: 'user-seoul',
          timezone: 'Asia/Seoul',
        };

        mockUserRepository.findAllWithTimezone.mockResolvedValue([seoulUser]);
        mockTxTodoRepo.find.mockResolvedValue([]);

        await usecase.execute(now);

        // Seoul 사용자의 어제 날짜(2026-03-28 KST) 기준으로 조회 (트랜잭션 내 pessimistic lock)
        expect(mockTxTodoRepo.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: 'user-seoul', todoDate: '2026-03-28' },
          }),
        );
      });

      it('should not process users whose local time is not midnight', async () => {
        // UTC 10:00 = Asia/Seoul 19:00 (not midnight)
        const now = new Date('2026-03-28T10:00:00Z');

        const seoulUser = {
          id: 'user-seoul',
          timezone: 'Asia/Seoul',
        };

        mockUserRepository.findAllWithTimezone.mockResolvedValue([seoulUser]);

        await usecase.execute(now);

        expect(mockDataSource.transaction).not.toHaveBeenCalled();
      });

      it('should handle multiple timezones simultaneously', async () => {
        // UTC 15:00 = Seoul 00:00, UTC 15:00 = US/Eastern 11:00
        const now = new Date('2026-03-28T15:00:00Z');

        const users = [
          { id: 'user-seoul', timezone: 'Asia/Seoul' },
          { id: 'user-ny', timezone: 'America/New_York' },
        ];

        mockUserRepository.findAllWithTimezone.mockResolvedValue(users);
        mockTxTodoRepo.find.mockResolvedValue([]);

        await usecase.execute(now);

        // Seoul만 자정이므로 Seoul 사용자만 처리
        expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
        expect(mockTxTodoRepo.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: 'user-seoul', todoDate: '2026-03-28' },
          }),
        );
      });
    });

    describe('duplicate carry-over prevention', () => {
      it('should skip todos that are already CARRIED_OVER', async () => {
        const now = new Date('2026-03-28T15:00:00Z');
        const user = { id: 'user-1', timezone: 'Asia/Seoul' };

        const alreadyCarriedOver = {
          id: 'todo-1',
          userId: 'user-1',
          status: TodoStatus.CARRIED_OVER,
          content: '이미 이월됨',
          todoDate: '2026-03-28',
        };

        mockUserRepository.findAllWithTimezone.mockResolvedValue([user]);
        mockTxTodoRepo.find.mockResolvedValue([alreadyCarriedOver]);

        await usecase.execute(now);

        // ACTIVE가 없으므로 save/create 호출 없음
        expect(mockTxTodoRepo.save).not.toHaveBeenCalled();
        expect(mockTxTodoRepo.create).not.toHaveBeenCalled();
      });

      it('should check carry-over history to prevent double carry-over', async () => {
        const now = new Date('2026-03-28T15:00:00Z');
        const user = { id: 'user-1', timezone: 'Asia/Seoul' };

        const activeTodo = {
          id: 'todo-1',
          userId: 'user-1',
          status: TodoStatus.ACTIVE,
          content: '할 일',
          todoDate: '2026-03-28',
        };

        mockUserRepository.findAllWithTimezone.mockResolvedValue([user]);
        mockTxTodoRepo.find.mockResolvedValue([activeTodo]);
        // 이미 이월 이력이 존재함
        mockTxHistoryRepo.findOne.mockResolvedValue({
          id: 'history-1',
          fromTodoId: 'todo-1',
          toTodoId: 'existing-new-todo',
        });

        await usecase.execute(now);

        // 이미 이월 이력이 있으므로 다시 이월하지 않음
        expect(mockTxTodoRepo.save).not.toHaveBeenCalled();
        expect(mockTxTodoRepo.create).not.toHaveBeenCalled();
      });
    });

    describe('carry-over execution', () => {
      it('should carry over ACTIVE todos at midnight within a transaction', async () => {
        const now = new Date('2026-03-28T15:00:00Z');
        const user = { id: 'user-1', timezone: 'Asia/Seoul' };

        const activeTodo = {
          id: 'todo-1',
          userId: 'user-1',
          status: TodoStatus.ACTIVE,
          content: '미완료 할 일',
          todoDate: '2026-03-28',
        };

        mockUserRepository.findAllWithTimezone.mockResolvedValue([user]);
        mockTxTodoRepo.find.mockResolvedValue([activeTodo]);
        mockTxTodoRepo.save.mockImplementation((todo) =>
          Promise.resolve({ id: todo.id ?? 'new-todo-1', ...todo }),
        );
        mockTxTodoRepo.create.mockImplementation((data) => ({
          id: 'new-todo-1',
          ...data,
        }));
        mockTxHistoryRepo.create.mockImplementation((data) => data);
        mockTxHistoryRepo.save.mockResolvedValue({
          id: 'history-1',
          fromTodoId: 'todo-1',
          toTodoId: 'new-todo-1',
        });

        await usecase.execute(now);

        // 트랜잭션 내에서 실행 확인
        expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);

        // 원본 ACTIVE -> CARRIED_OVER
        expect(mockTxTodoRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'todo-1',
            status: TodoStatus.CARRIED_OVER,
          }),
        );

        // 새 ACTIVE todo 생성 (다음 날)
        expect(mockTxTodoRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-1',
            content: '미완료 할 일',
            status: TodoStatus.ACTIVE,
            todoDate: '2026-03-29',
          }),
        );

        // 이월 이력 기록
        expect(mockTxHistoryRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            fromTodoId: 'todo-1',
          }),
        );
      });
    });

    describe('timezone change scenario', () => {
      it('should recalculate midnight based on updated user timezone', async () => {
        // UTC 05:00 = America/New_York 00:00 (EDT, midnight)
        const now = new Date('2026-03-29T04:00:00Z');

        const userChangedTz = {
          id: 'user-1',
          timezone: 'America/New_York',
        };

        mockUserRepository.findAllWithTimezone.mockResolvedValue([
          userChangedTz,
        ]);
        mockTxTodoRepo.find.mockResolvedValue([]);

        await usecase.execute(now);

        // NY 자정 기준이므로 2026-03-28 (NY 날짜) 기준으로 조회
        expect(mockTxTodoRepo.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: 'user-1', todoDate: '2026-03-28' },
          }),
        );
      });
    });

    describe('edge cases', () => {
      it('should handle no users gracefully', async () => {
        const now = new Date('2026-03-28T15:00:00Z');
        mockUserRepository.findAllWithTimezone.mockResolvedValue([]);

        await usecase.execute(now);

        expect(mockDataSource.transaction).not.toHaveBeenCalled();
      });

      it('should not carry over COMPLETED or INACTIVE todos', async () => {
        const now = new Date('2026-03-28T15:00:00Z');
        const user = { id: 'user-1', timezone: 'Asia/Seoul' };

        const completedTodo = {
          id: 'todo-1',
          userId: 'user-1',
          status: TodoStatus.COMPLETED,
          content: '완료',
          todoDate: '2026-03-28',
        };
        const inactiveTodo = {
          id: 'todo-2',
          userId: 'user-1',
          status: TodoStatus.INACTIVE,
          content: '비활성',
          todoDate: '2026-03-28',
        };

        mockUserRepository.findAllWithTimezone.mockResolvedValue([user]);
        mockTxTodoRepo.find.mockResolvedValue([completedTodo, inactiveTodo]);

        await usecase.execute(now);

        // ACTIVE가 없으므로 save/create 호출 없음
        expect(mockTxTodoRepo.save).not.toHaveBeenCalled();
        expect(mockTxTodoRepo.create).not.toHaveBeenCalled();
      });
    });
  });
});
