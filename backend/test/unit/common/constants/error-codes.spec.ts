import { ERROR_CODES } from '../../../../src/common/constants/error-codes';

describe('ERROR_CODES', () => {
  it('should define USER_NOT_FOUND', () => {
    expect(ERROR_CODES.USER_NOT_FOUND).toBe('USER_NOT_FOUND');
  });

  it('should define TODO_NOT_FOUND', () => {
    expect(ERROR_CODES.TODO_NOT_FOUND).toBe('TODO_NOT_FOUND');
  });

  it('should define MEMO_NOT_FOUND', () => {
    expect(ERROR_CODES.MEMO_NOT_FOUND).toBe('MEMO_NOT_FOUND');
  });

  it('should define FORBIDDEN', () => {
    expect(ERROR_CODES.FORBIDDEN).toBe('FORBIDDEN');
  });

  it('should define INVALID_STATUS_TRANSITION', () => {
    expect(ERROR_CODES.INVALID_STATUS_TRANSITION).toBe(
      'INVALID_STATUS_TRANSITION',
    );
  });

  it('should define NOT_FOUND', () => {
    expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
  });

  it('should define USER_NOT_FOUND_FOR_OAUTH', () => {
    expect(ERROR_CODES.USER_NOT_FOUND_FOR_OAUTH).toBe(
      'USER_NOT_FOUND_FOR_OAUTH',
    );
  });

  it('should have all values as strings', () => {
    for (const [key, value] of Object.entries(ERROR_CODES)) {
      expect(typeof value).toBe('string');
      expect(value).toBe(key);
    }
  });
});
