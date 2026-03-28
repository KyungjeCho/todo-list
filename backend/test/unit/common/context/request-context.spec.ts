import {
  RequestContext,
  SYSTEM_USER_ID,
} from 'src/common/context/request-context';

describe('RequestContext', () => {
  it('should return SYSTEM_USER_ID when no context is set', () => {
    expect(RequestContext.getCurrentUserId()).toBe(SYSTEM_USER_ID);
  });

  it('should return the user ID set in the current context', (done) => {
    const userId = '550e8400-e29b-41d4-a716-446655440001';

    RequestContext.run({ currentUserId: userId }, () => {
      expect(RequestContext.getCurrentUserId()).toBe(userId);
      done();
    });
  });

  it('should isolate context between different runs', (done) => {
    let firstDone = false;
    let secondDone = false;

    const checkDone = () => {
      if (firstDone && secondDone) done();
    };

    RequestContext.run({ currentUserId: 'user-1' }, () => {
      expect(RequestContext.getCurrentUserId()).toBe('user-1');
      firstDone = true;
      checkDone();
    });

    RequestContext.run({ currentUserId: 'user-2' }, () => {
      expect(RequestContext.getCurrentUserId()).toBe('user-2');
      secondDone = true;
      checkDone();
    });
  });

  it('should define SYSTEM_USER_ID as a nil-like UUID', () => {
    expect(SYSTEM_USER_ID).toBe('00000000-0000-0000-0000-000000000000');
  });
});
