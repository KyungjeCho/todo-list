import { UserAuth } from 'src/auth/domain/user-auth.entity';

describe('UserAuth Entity', () => {
  let entity: UserAuth;

  beforeEach(() => {
    entity = new UserAuth();
  });

  it('should be defined', () => {
    expect(entity).toBeDefined();
  });

  it('should have id property (UUID PK)', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    entity.id = id;
    expect(entity.id).toBe(id);
  });

  it('should have nullable loginId property', () => {
    expect(entity.loginId).toBeUndefined();

    entity.loginId = 'test@example.com';
    expect(entity.loginId).toBe('test@example.com');
  });

  it('should allow loginId to be null (OAuth-only user)', () => {
    entity.loginId = null;
    expect(entity.loginId).toBeNull();
  });

  it('should have nullable passwordHash property', () => {
    expect(entity.passwordHash).toBeUndefined();

    entity.passwordHash = '$2b$10$hashedvalue';
    expect(entity.passwordHash).toBe('$2b$10$hashedvalue');
  });

  it('should allow passwordHash to be null (OAuth-only user)', () => {
    entity.passwordHash = null;
    expect(entity.passwordHash).toBeNull();
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

  it('should have oauthAccounts relation (one-to-many)', () => {
    expect(entity).toHaveProperty('oauthAccounts');
  });

  it('should have sessions relation (one-to-many)', () => {
    expect(entity).toHaveProperty('sessions');
  });

  it('should have user relation (one-to-one)', () => {
    expect(entity).toHaveProperty('user');
  });
});
