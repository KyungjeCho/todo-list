import { UserAuthOauth } from 'src/auth/domain/user-auth-oauth.entity';

describe('UserAuthOauth Entity', () => {
  let entity: UserAuthOauth;

  beforeEach(() => {
    entity = new UserAuthOauth();
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

  it('should have provider property', () => {
    entity.provider = 'google';
    expect(entity.provider).toBe('google');
  });

  it('should accept valid provider values', () => {
    const providers = ['google', 'naver', 'kakao', 'apple'];
    for (const provider of providers) {
      entity.provider = provider;
      expect(entity.provider).toBe(provider);
    }
  });

  it('should have providerUserId property (UNIQUE)', () => {
    entity.providerUserId = 'google-user-123';
    expect(entity.providerUserId).toBe('google-user-123');
  });

  it('should have providerUserEmail property', () => {
    entity.providerUserEmail = 'user@gmail.com';
    expect(entity.providerUserEmail).toBe('user@gmail.com');
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
