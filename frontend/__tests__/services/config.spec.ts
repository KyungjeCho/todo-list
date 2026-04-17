describe('config HTTPS enforcement', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should allow HTTP URL when __DEV__ is true', () => {
    (global as Record<string, unknown>).__DEV__ = true;
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://example.com';

    expect(() => require('../../src/services/config')).not.toThrow();
  });

  it('should throw when __DEV__ is false and URL is HTTP', () => {
    (global as Record<string, unknown>).__DEV__ = false;
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://example.com';

    expect(() => require('../../src/services/config')).toThrow(
      'EXPO_PUBLIC_API_BASE_URL must use HTTPS in production builds',
    );
  });

  it('should allow HTTPS URL when __DEV__ is false', () => {
    (global as Record<string, unknown>).__DEV__ = false;
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://example.com';

    expect(() => require('../../src/services/config')).not.toThrow();
  });

  it('should allow localhost default when __DEV__ is true and env not set', () => {
    (global as Record<string, unknown>).__DEV__ = true;
    delete process.env.EXPO_PUBLIC_API_BASE_URL;

    expect(() => require('../../src/services/config')).not.toThrow();
  });

  it('should throw when __DEV__ is false and env not set (localhost HTTP default)', () => {
    (global as Record<string, unknown>).__DEV__ = false;
    delete process.env.EXPO_PUBLIC_API_BASE_URL;

    expect(() => require('../../src/services/config')).toThrow(
      'EXPO_PUBLIC_API_BASE_URL must use HTTPS in production builds',
    );
  });
});
