import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  const createMockExecutionContext = (): ExecutionContext =>
    ({
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
        getResponse: jest.fn().mockReturnValue({}),
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    }) as unknown as ExecutionContext;

  const createMockCallHandler = (data: unknown): CallHandler => ({
    handle: () => of(data),
  });

  it('should wrap response data in standard format', (done) => {
    const context = createMockExecutionContext();
    const data = { id: '1', name: 'Test' };
    const callHandler = createMockCallHandler(data);

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toEqual({
        data: { id: '1', name: 'Test' },
      });
      done();
    });
  });

  it('should wrap array response in standard format', (done) => {
    const context = createMockExecutionContext();
    const data = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ];
    const callHandler = createMockCallHandler(data);

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toEqual({
        data: [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
        ],
      });
      done();
    });
  });

  it('should wrap null response in standard format', (done) => {
    const context = createMockExecutionContext();
    const callHandler = createMockCallHandler(null);

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toEqual({
        data: null,
      });
      done();
    });
  });

  it('should wrap primitive response in standard format', (done) => {
    const context = createMockExecutionContext();
    const callHandler = createMockCallHandler('success');

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toEqual({
        data: 'success',
      });
      done();
    });
  });

  it('should wrap empty object response in standard format', (done) => {
    const context = createMockExecutionContext();
    const callHandler = createMockCallHandler({});

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toEqual({
        data: {},
      });
      done();
    });
  });

  it('should preserve paginated response structure', (done) => {
    const context = createMockExecutionContext();
    const paginatedData = {
      data: [{ id: '1' }],
      meta: { page: 1, limit: 10, totalCount: 1, totalPages: 1 },
    };
    const callHandler = createMockCallHandler(paginatedData);

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toEqual({
        data: {
          data: [{ id: '1' }],
          meta: { page: 1, limit: 10, totalCount: 1, totalPages: 1 },
        },
      });
      done();
    });
  });
});
