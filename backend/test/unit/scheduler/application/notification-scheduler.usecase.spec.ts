import { NotificationSchedulerUsecase } from 'src/scheduler/application/notification-scheduler.usecase';

describe('NotificationSchedulerUsecase', () => {
  let usecase: NotificationSchedulerUsecase;

  const mockUserRepository = {
    findAllWithTimezone: jest.fn(),
  };

  const mockSendNotificationUsecase = {
    execute: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new NotificationSchedulerUsecase(
      mockUserRepository as never,
      mockSendNotificationUsecase as never,
    );
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    describe('타임존별 발송', () => {
      it('사용자의 로컬 시간이 planTime과 일치하면 PLAN 알림을 발송한다', async () => {
        // UTC 23:00 = Asia/Seoul 08:00
        const now = new Date('2026-03-28T23:00:00Z');

        const user = {
          id: 'user-1',
          planTime: '08:00',
          reviewTime: '22:00',
          timezone: 'Asia/Seoul',
        };

        mockUserRepository.findAllWithTimezone.mockResolvedValue([user]);
        mockSendNotificationUsecase.execute.mockResolvedValue(undefined);

        await usecase.execute(now);

        expect(mockSendNotificationUsecase.execute).toHaveBeenCalledWith(
          'user-1',
          'PLAN',
        );
      });

      it('사용자의 로컬 시간이 reviewTime과 일치하면 REVIEW 알림을 발송한다', async () => {
        // UTC 13:00 = Asia/Seoul 22:00
        const now = new Date('2026-03-28T13:00:00Z');

        const user = {
          id: 'user-1',
          planTime: '08:00',
          reviewTime: '22:00',
          timezone: 'Asia/Seoul',
        };

        mockUserRepository.findAllWithTimezone.mockResolvedValue([user]);
        mockSendNotificationUsecase.execute.mockResolvedValue(undefined);

        await usecase.execute(now);

        expect(mockSendNotificationUsecase.execute).toHaveBeenCalledWith(
          'user-1',
          'REVIEW',
        );
      });

      it('다른 타임존의 사용자들에게 각각 올바른 시간에 알림을 발송한다', async () => {
        // WHY: 1월은 EST(UTC-5) 기간이므로 UTC 23:00 = Seoul 08:00 = NY 18:00
        const now = new Date('2026-01-28T23:00:00Z');

        const users = [
          {
            id: 'user-seoul',
            planTime: '08:00',
            reviewTime: '22:00',
            timezone: 'Asia/Seoul',
          },
          {
            id: 'user-ny',
            planTime: '09:00',
            reviewTime: '18:00',
            timezone: 'America/New_York',
          },
        ];

        mockUserRepository.findAllWithTimezone.mockResolvedValue(users);
        mockSendNotificationUsecase.execute.mockResolvedValue(undefined);

        await usecase.execute(now);

        // Seoul user: 08:00 = planTime → PLAN
        expect(mockSendNotificationUsecase.execute).toHaveBeenCalledWith(
          'user-seoul',
          'PLAN',
        );
        // NY user: 18:00 = reviewTime → REVIEW
        expect(mockSendNotificationUsecase.execute).toHaveBeenCalledWith(
          'user-ny',
          'REVIEW',
        );
      });
    });

    describe('NULL 시간 미발송', () => {
      it('planTime이 NULL이면 PLAN 알림을 발송하지 않는다', async () => {
        // UTC 23:00 = Asia/Seoul 08:00
        const now = new Date('2026-03-28T23:00:00Z');

        const user = {
          id: 'user-1',
          planTime: null,
          reviewTime: '22:00',
          timezone: 'Asia/Seoul',
        };

        mockUserRepository.findAllWithTimezone.mockResolvedValue([user]);

        await usecase.execute(now);

        expect(mockSendNotificationUsecase.execute).not.toHaveBeenCalledWith(
          'user-1',
          'PLAN',
        );
      });

      it('reviewTime이 NULL이면 REVIEW 알림을 발송하지 않는다', async () => {
        // UTC 13:00 = Asia/Seoul 22:00
        const now = new Date('2026-03-28T13:00:00Z');

        const user = {
          id: 'user-1',
          planTime: '08:00',
          reviewTime: null,
          timezone: 'Asia/Seoul',
        };

        mockUserRepository.findAllWithTimezone.mockResolvedValue([user]);

        await usecase.execute(now);

        expect(mockSendNotificationUsecase.execute).not.toHaveBeenCalledWith(
          'user-1',
          'REVIEW',
        );
      });

      it('planTime과 reviewTime 모두 NULL이면 알림을 발송하지 않는다', async () => {
        const now = new Date('2026-03-28T23:00:00Z');

        const user = {
          id: 'user-1',
          planTime: null,
          reviewTime: null,
          timezone: 'Asia/Seoul',
        };

        mockUserRepository.findAllWithTimezone.mockResolvedValue([user]);

        await usecase.execute(now);

        expect(mockSendNotificationUsecase.execute).not.toHaveBeenCalled();
      });
    });

    describe('타임존 변경 시 알림 시점 재계산', () => {
      it('타임존이 변경된 사용자의 알림 시점을 새 타임존 기준으로 계산한다', async () => {
        // UTC 14:00 = America/New_York 10:00 (EDT)
        const now = new Date('2026-03-28T14:00:00Z');

        const userChangedToNY = {
          id: 'user-1',
          planTime: '10:00',
          reviewTime: '22:00',
          timezone: 'America/New_York',
        };

        mockUserRepository.findAllWithTimezone.mockResolvedValue([
          userChangedToNY,
        ]);
        mockSendNotificationUsecase.execute.mockResolvedValue(undefined);

        await usecase.execute(now);

        // NY 10:00 = planTime → PLAN 발송
        expect(mockSendNotificationUsecase.execute).toHaveBeenCalledWith(
          'user-1',
          'PLAN',
        );
      });

      it('로컬 시간이 설정 시간과 일치하지 않으면 알림을 발송하지 않는다', async () => {
        // UTC 14:00 = America/New_York 10:00
        const now = new Date('2026-03-28T14:00:00Z');

        const user = {
          id: 'user-1',
          planTime: '08:00',
          reviewTime: '22:00',
          timezone: 'America/New_York',
        };

        mockUserRepository.findAllWithTimezone.mockResolvedValue([user]);

        await usecase.execute(now);

        // NY 10:00 ≠ planTime(08:00) and ≠ reviewTime(22:00)
        expect(mockSendNotificationUsecase.execute).not.toHaveBeenCalled();
      });
    });

    describe('비정시 알림', () => {
      it('08:30 같은 비정시 planTime도 정확히 매칭하여 발송한다', async () => {
        // UTC 23:30 = Asia/Seoul 08:30
        const now = new Date('2026-03-28T23:30:00Z');

        const user = {
          id: 'user-1',
          planTime: '08:30',
          reviewTime: '22:15',
          timezone: 'Asia/Seoul',
        };

        mockUserRepository.findAllWithTimezone.mockResolvedValue([user]);
        mockSendNotificationUsecase.execute.mockResolvedValue(undefined);

        await usecase.execute(now);

        expect(mockSendNotificationUsecase.execute).toHaveBeenCalledWith(
          'user-1',
          'PLAN',
        );
        expect(mockSendNotificationUsecase.execute).not.toHaveBeenCalledWith(
          'user-1',
          'REVIEW',
        );
      });

      it('22:15 같은 비정시 reviewTime도 정확히 매칭하여 발송한다', async () => {
        // UTC 13:15 = Asia/Seoul 22:15
        const now = new Date('2026-03-28T13:15:00Z');

        const user = {
          id: 'user-1',
          planTime: '08:30',
          reviewTime: '22:15',
          timezone: 'Asia/Seoul',
        };

        mockUserRepository.findAllWithTimezone.mockResolvedValue([user]);
        mockSendNotificationUsecase.execute.mockResolvedValue(undefined);

        await usecase.execute(now);

        expect(mockSendNotificationUsecase.execute).toHaveBeenCalledWith(
          'user-1',
          'REVIEW',
        );
      });
    });

    describe('edge cases', () => {
      it('사용자가 없으면 아무 알림도 발송하지 않는다', async () => {
        const now = new Date('2026-03-28T23:00:00Z');
        mockUserRepository.findAllWithTimezone.mockResolvedValue([]);

        await usecase.execute(now);

        expect(mockSendNotificationUsecase.execute).not.toHaveBeenCalled();
      });

      it('planTime과 reviewTime이 같은 시간이면 두 알림 모두 발송한다', async () => {
        // UTC 23:00 = Asia/Seoul 08:00
        const now = new Date('2026-03-28T23:00:00Z');

        const user = {
          id: 'user-1',
          planTime: '08:00',
          reviewTime: '08:00',
          timezone: 'Asia/Seoul',
        };

        mockUserRepository.findAllWithTimezone.mockResolvedValue([user]);
        mockSendNotificationUsecase.execute.mockResolvedValue(undefined);

        await usecase.execute(now);

        expect(mockSendNotificationUsecase.execute).toHaveBeenCalledWith(
          'user-1',
          'PLAN',
        );
        expect(mockSendNotificationUsecase.execute).toHaveBeenCalledWith(
          'user-1',
          'REVIEW',
        );
      });
    });
  });
});
