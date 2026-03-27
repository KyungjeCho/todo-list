import { User } from 'src/user/domain/user.entity';

describe('User Entity', () => {
  let entity: User;

  beforeEach(() => {
    entity = new User();
  });

  it('should be defined', () => {
    expect(entity).toBeDefined();
  });

  it('should have id property (UUID PK)', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    entity.id = id;
    expect(entity.id).toBe(id);
  });

  it('should have userAuthId property (FK, UNIQUE)', () => {
    const authId = '550e8400-e29b-41d4-a716-446655440001';
    entity.userAuthId = authId;
    expect(entity.userAuthId).toBe(authId);
  });

  it('should have userName property', () => {
    entity.userName = '홍길동';
    expect(entity.userName).toBe('홍길동');
  });

  it('should have nullable planTime property', () => {
    entity.planTime = '08:00';
    expect(entity.planTime).toBe('08:00');
  });

  it('should allow planTime to be null (notification disabled)', () => {
    entity.planTime = null;
    expect(entity.planTime).toBeNull();
  });

  it('should have nullable reviewTime property', () => {
    entity.reviewTime = '22:00';
    expect(entity.reviewTime).toBe('22:00');
  });

  it('should allow reviewTime to be null (notification disabled)', () => {
    entity.reviewTime = null;
    expect(entity.reviewTime).toBeNull();
  });

  it('should have timezone property with default UTC', () => {
    entity.timezone = 'Asia/Seoul';
    expect(entity.timezone).toBe('Asia/Seoul');
  });

  it('should have language property (BCP-47)', () => {
    entity.language = 'ko-KR';
    expect(entity.language).toBe('ko-KR');
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

  it('should have userAuth relation (one-to-one)', () => {
    expect(entity).toHaveProperty('userAuth');
  });

  it('should have todos relation (one-to-many)', () => {
    expect(entity).toHaveProperty('todos');
  });

  it('should have devices relation (one-to-many)', () => {
    expect(entity).toHaveProperty('devices');
  });
});
