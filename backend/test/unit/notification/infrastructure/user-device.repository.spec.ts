import { UserDeviceRepository } from 'src/notification/infrastructure/user-device.repository';

describe('UserDeviceRepository.upsertDevice', () => {
  let repository: UserDeviceRepository;

  const mockDeviceRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
});
