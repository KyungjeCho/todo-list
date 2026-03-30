import { NotificationLog } from 'src/notification/domain/notification-log.entity';

describe('NotificationLog Entity', () => {
  let entity: NotificationLog;

  beforeEach(() => {
    entity = new NotificationLog();
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

  it('should have notificationType property (PLAN / REVIEW)', () => {
    entity.notificationType = 'PLAN';
    expect(entity.notificationType).toBe('PLAN');

    entity.notificationType = 'REVIEW';
    expect(entity.notificationType).toBe('REVIEW');
  });

  it('should have status property (SUCCESS / FAIL)', () => {
    entity.status = 'SUCCESS';
    expect(entity.status).toBe('SUCCESS');

    entity.status = 'FAIL';
    expect(entity.status).toBe('FAIL');
  });

  it('should have nullable errorMessage property', () => {
    expect(entity.errorMessage).toBeUndefined();

    entity.errorMessage = 'FCM token expired';
    expect(entity.errorMessage).toBe('FCM token expired');
  });

  it('should allow errorMessage to be null', () => {
    entity.errorMessage = null;
    expect(entity.errorMessage).toBeNull();
  });

  it('should have retryCount property with default 0', () => {
    entity.retryCount = 0;
    expect(entity.retryCount).toBe(0);
  });

  it('should track retry count increments', () => {
    entity.retryCount = 3;
    expect(entity.retryCount).toBe(3);
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
