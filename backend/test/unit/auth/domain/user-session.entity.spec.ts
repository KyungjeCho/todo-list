import { UserSession } from 'src/auth/domain/user-session.entity';

describe('UserSession Entity', () => {
  let entity: UserSession;

  beforeEach(() => {
    entity = new UserSession();
  });

  it('should be defined', () => {
    expect(entity).toBeDefined();
  });

  it('should have id property (UUID PK)', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    entity.id = id;
    expect(entity.id).toBe(id);
  });

  it('should have userAuthId property (FK)', () => {
    const authId = '550e8400-e29b-41d4-a716-446655440001';
    entity.userAuthId = authId;
    expect(entity.userAuthId).toBe(authId);
  });

  it('should have refreshToken property (UNIQUE)', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token';
    entity.refreshToken = token;
    expect(entity.refreshToken).toBe(token);
  });

  it('should have nullable userAgent property', () => {
    expect(entity.userAgent).toBeUndefined();

    entity.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)';
    expect(entity.userAgent).toBe('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)');
  });

  it('should allow userAgent to be null', () => {
    entity.userAgent = null;
    expect(entity.userAgent).toBeNull();
  });

  it('should have nullable ipAddress property', () => {
    expect(entity.ipAddress).toBeUndefined();

    entity.ipAddress = '192.168.1.1';
    expect(entity.ipAddress).toBe('192.168.1.1');
  });

  it('should allow ipAddress to be null', () => {
    entity.ipAddress = null;
    expect(entity.ipAddress).toBeNull();
  });

  it('should support IPv6 addresses', () => {
    entity.ipAddress = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
    expect(entity.ipAddress).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
  });

  it('should have expiredAt property', () => {
    const future = new Date('2026-04-27T00:00:00Z');
    entity.expiredAt = future;
    expect(entity.expiredAt).toBe(future);
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

  it('should have userAuth relation (many-to-one)', () => {
    expect(entity).toHaveProperty('userAuth');
  });
});
