import { UserDevice } from 'src/notification/domain/user-device.entity';

describe('UserDevice Entity', () => {
  let entity: UserDevice;

  beforeEach(() => {
    entity = new UserDevice();
  });

  it('should be defined', () => {
    expect(entity).toBeDefined();
  });

  it('should have id property (UUID PK)', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    entity.id = id;
    expect(entity.id).toBe(id);
  });

  it('should have userId property (FK)', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440001';
    entity.userId = userId;
    expect(entity.userId).toBe(userId);
  });

  it('should have fcmToken property (UNIQUE)', () => {
    const token = 'fcm-token-abc123xyz';
    entity.fcmToken = token;
    expect(entity.fcmToken).toBe(token);
  });

  it('should have deviceType property', () => {
    entity.deviceType = 'IOS';
    expect(entity.deviceType).toBe('IOS');
  });

  it('should accept valid deviceType values', () => {
    const types = ['IOS', 'ANDROID'];
    for (const type of types) {
      entity.deviceType = type;
      expect(entity.deviceType).toBe(type);
    }
  });

  it('should have nullable deviceName property', () => {
    expect(entity.deviceName).toBeUndefined();

    entity.deviceName = 'iPhone 15 Pro';
    expect(entity.deviceName).toBe('iPhone 15 Pro');
  });

  it('should allow deviceName to be null', () => {
    entity.deviceName = null;
    expect(entity.deviceName).toBeNull();
  });

  it('should inherit audit fields from BaseEntity', () => {
    const now = new Date();
    const userId = '550e8400-e29b-41d4-a716-446655440001';

    entity.createdAt = now;
    entity.createdBy = userId;
    entity.updatedAt = now;
    entity.updatedBy = userId;
    entity.deletedAt = null;

    expect(entity.createdAt).toBe(now);
    expect(entity.createdBy).toBe(userId);
    expect(entity.updatedAt).toBe(now);
    expect(entity.updatedBy).toBe(userId);
    expect(entity.deletedAt).toBeNull();
  });

  it('should have user relation (many-to-one)', () => {
    expect(entity).toHaveProperty('user');
  });
});
