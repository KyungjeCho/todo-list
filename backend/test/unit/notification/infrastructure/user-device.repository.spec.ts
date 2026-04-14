import { UserDeviceRepository } from 'src/notification/infrastructure/user-device.repository';

describe('UserDeviceRepository.upsertDevice', () => {
  let repository: UserDeviceRepository;

  const mockStaleQueryBuilder = {
    softDelete: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  };

  const mockDeviceRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(() => mockStaleQueryBuilder),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStaleQueryBuilder.softDelete.mockReturnThis();
    mockStaleQueryBuilder.where.mockReturnThis();
    mockStaleQueryBuilder.andWhere.mockReturnThis();
    mockStaleQueryBuilder.execute.mockResolvedValue({ affected: 0 });
    repository = new UserDeviceRepository(mockDeviceRepo as never);
  });

  it('신규 디바이스는 create + save로 삽입된다', async () => {
    mockDeviceRepo.findOne.mockResolvedValue(null);
    const created = {
      userId: 'user-1',
      fcmToken: 'token-new',
      deviceType: 'ANDROID',
      deviceName: null,
    };
    mockDeviceRepo.create.mockReturnValue(created);
    mockDeviceRepo.save.mockResolvedValue(created);

    await repository.upsertDevice({
      userId: 'user-1',
      fcmToken: 'token-new',
      deviceType: 'ANDROID',
    });

    expect(mockDeviceRepo.findOne).toHaveBeenCalledWith({
      where: { fcmToken: 'token-new' },
      withDeleted: true,
    });
    expect(mockDeviceRepo.create).toHaveBeenCalled();
    expect(mockDeviceRepo.save).toHaveBeenCalledWith(created);
  });

  it('기존 활성 디바이스는 user/deviceType이 갱신된다', async () => {
    const existing = {
      id: 'dev-1',
      userId: 'user-old',
      fcmToken: 'token-x',
      deviceType: 'IOS',
      deviceName: null,
      deletedAt: null,
    };
    mockDeviceRepo.findOne.mockResolvedValue(existing);
    mockDeviceRepo.save.mockResolvedValue(existing);

    await repository.upsertDevice({
      userId: 'user-new',
      fcmToken: 'token-x',
      deviceType: 'ANDROID',
    });

    expect(mockDeviceRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dev-1',
        userId: 'user-new',
        deviceType: 'ANDROID',
        deletedAt: null,
      }),
    );
    expect(mockDeviceRepo.create).not.toHaveBeenCalled();
  });

  it('로그아웃으로 soft-deleted된 디바이스는 복원된다 (deletedAt=null)', async () => {
    // WHY: 로그아웃 → softDelete → 재로그인 시 upsert가 동일 fcm_token에 INSERT하면 unique 제약 위반
    // withDeleted: true로 조회해 복원해야 함
    const softDeleted = {
      id: 'dev-1',
      userId: 'user-1',
      fcmToken: 'token-x',
      deviceType: 'ANDROID',
      deviceName: null,
      deletedAt: new Date('2026-04-13T10:00:00Z'),
    };
    mockDeviceRepo.findOne.mockResolvedValue(softDeleted);
    mockDeviceRepo.save.mockResolvedValue(softDeleted);

    await repository.upsertDevice({
      userId: 'user-1',
      fcmToken: 'token-x',
      deviceType: 'ANDROID',
    });

    expect(mockDeviceRepo.findOne).toHaveBeenCalledWith({
      where: { fcmToken: 'token-x' },
      withDeleted: true,
    });
    expect(mockDeviceRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dev-1',
        deletedAt: null,
      }),
    );
    expect(mockDeviceRepo.create).not.toHaveBeenCalled();
  });

  it('같은 (userId, deviceType) 의 다른 활성 토큰은 신규 등록 시 soft-delete 된다', async () => {
    // WHY: FCM 은 기기당 시점별 하나의 유효 토큰만 유지한다(onTokenRefresh 발화 후
    // 옛 토큰은 즉시 무효). DB 에 죽은 토큰이 누적되면 스케줄러가 헛쏘며 실패 로그만
    // 쌓이므로, 새 토큰 등록 시 같은 유저·플랫폼의 이전 활성 행을 정리한다.
    mockDeviceRepo.findOne.mockResolvedValue(null);
    mockDeviceRepo.create.mockReturnValue({
      userId: 'user-1',
      fcmToken: 'token-new',
    });
    mockDeviceRepo.save.mockResolvedValue({});

    await repository.upsertDevice({
      userId: 'user-1',
      fcmToken: 'token-new',
      deviceType: 'ANDROID',
    });

    expect(mockDeviceRepo.createQueryBuilder).toHaveBeenCalled();
    expect(mockStaleQueryBuilder.softDelete).toHaveBeenCalled();
    expect(mockStaleQueryBuilder.where).toHaveBeenCalledWith(
      expect.stringContaining('user_id'),
      expect.objectContaining({ userId: 'user-1' }),
    );
    expect(mockStaleQueryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('device_type'),
      expect.objectContaining({ deviceType: 'ANDROID' }),
    );
    expect(mockStaleQueryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('fcm_token'),
      expect.objectContaining({ fcmToken: 'token-new' }),
    );
    expect(mockStaleQueryBuilder.execute).toHaveBeenCalled();
  });

  it('기존 활성 행 갱신(token 동일, user 변경) 시에도 다른 활성 토큰 정리가 실행된다', async () => {
    // WHY: 같은 토큰을 다른 유저가 재로그인하는 경로에서도 이전 토큰 누적을 막는다.
    const existing = {
      id: 'dev-1',
      userId: 'user-old',
      fcmToken: 'token-x',
      deviceType: 'IOS',
      deviceName: null,
      deletedAt: null,
    };
    mockDeviceRepo.findOne.mockResolvedValue(existing);
    mockDeviceRepo.save.mockResolvedValue(existing);

    await repository.upsertDevice({
      userId: 'user-new',
      fcmToken: 'token-x',
      deviceType: 'IOS',
    });

    expect(mockStaleQueryBuilder.execute).toHaveBeenCalled();
  });
});
