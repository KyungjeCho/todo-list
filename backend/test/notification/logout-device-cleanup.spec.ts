import { UserDeviceRepository } from 'src/notification/infrastructure/user-device.repository';

/**
 * US3 (012-apple-fcm-integration) — 로그아웃 시 기기 격리 검증.
 * WHY: `deleteByFcmTokenForOwner(fcmToken, userAuthId)` 는 해당 소유자의 해당 토큰만
 *      soft-delete 해야 하며, 같은 userId 의 다른 deviceName 행은 영향받지 않아야 한다.
 *      (iPhone 에서 로그아웃 해도 iPad 는 여전히 알림을 받아야 한다.)
 */
describe('UserDeviceRepository.deleteByFcmTokenForOwner — 기기 격리', () => {
  let repository: UserDeviceRepository;

  const mockQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockDeviceRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    softDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.innerJoin.mockReturnThis();
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    repository = new UserDeviceRepository(mockDeviceRepo as never);
  });

  it('소유자와 일치하는 디바이스만 soft-delete 한다 (정상 경로)', async () => {
    mockQueryBuilder.getOne.mockResolvedValue({
      id: 'dev-iphone',
      fcmToken: 'ios-iphone-token',
      deviceType: 'IOS',
      deviceName: 'iPhone 15',
    });

    await repository.deleteByFcmTokenForOwner(
      'ios-iphone-token',
      'auth-user-1',
    );

    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      expect.stringContaining('fcmToken'),
      expect.objectContaining({ fcmToken: 'ios-iphone-token' }),
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('userAuthId'),
      expect.objectContaining({ userAuthId: 'auth-user-1' }),
    );
    expect(mockDeviceRepo.softDelete).toHaveBeenCalledWith('dev-iphone');
    expect(mockDeviceRepo.softDelete).toHaveBeenCalledTimes(1);
  });

  it('소유자 불일치(다른 유저 토큰) 시 softDelete 가 호출되지 않는다', async () => {
    mockQueryBuilder.getOne.mockResolvedValue(null);

    await repository.deleteByFcmTokenForOwner(
      'ios-other-user-token',
      'auth-user-1',
    );

    expect(mockDeviceRepo.softDelete).not.toHaveBeenCalled();
  });

  it('iPhone 로그아웃 호출이 iPad 행(다른 fcmToken)에는 영향을 주지 않는다', async () => {
    // WHY: deleteByFcmTokenForOwner 는 항상 단일 fcmToken 을 키로 받으므로,
    //      iPhone 의 토큰으로 호출해도 iPad 의 다른 토큰 행은 조회 대상조차 되지 않는다.
    mockQueryBuilder.getOne.mockResolvedValue({
      id: 'dev-iphone',
      fcmToken: 'ios-iphone-token',
      deviceType: 'IOS',
      deviceName: 'iPhone 15',
    });

    await repository.deleteByFcmTokenForOwner(
      'ios-iphone-token',
      'auth-user-1',
    );

    // softDelete 는 iPhone 행 id 에 대해서만 1회
    expect(mockDeviceRepo.softDelete).toHaveBeenCalledTimes(1);
    expect(mockDeviceRepo.softDelete).toHaveBeenCalledWith('dev-iphone');
    // iPad 토큰값은 절대 파라미터로 사용되지 않았음
    const softDeleteArgs = mockDeviceRepo.softDelete.mock.calls[0];
    expect(softDeleteArgs?.[0]).not.toBe('dev-ipad');
  });
});
