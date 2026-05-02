import { describe, it, expect, vi } from 'vitest';

/**
 * Contract tests for DOS-AIO standard API response formats.
 *
 * These are unit-style tests that verify the response helper functions
 * from @dos/platform-core/http produce output matching the platform contracts.
 * No live services needed.
 */

// Mock Express Response object
function createMockResponse(): {
  res: any;
  getJson: () => any;
  getStatus: () => number;
} {
  let jsonBody: any = null;
  let statusCode = 200;
  const res: any = {
    req: { correlationId: 'test-request-id-123' },
    status: (code: number) => { statusCode = code; return res; },
    json: (body: any) => { jsonBody = body; return res; },
  };
  return {
    res,
    getJson: () => jsonBody,
    getStatus: () => statusCode,
  };
}

// Mock Express Request for validation tests
function createMockRequest(overrides: Record<string, any> = {}): any {
  return {
    body: {},
    query: {},
    params: {},
    ...overrides,
  };
}

// Mock next function
function createMockNext(): any {
  return vi.fn();
}

describe('Standard Response Format Contracts', () => {

  describe('paginated() — StandardListResponse', () => {
    it('returns correct shape with success, data array, and meta', async () => {
      const { ok, paginated } = await import('@dos/platform-core/http');

      const { res, getJson } = createMockResponse();
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];

      paginated(res, items, 50, 1, 25);

      const body = getJson();
      expect(body).toEqual({
        success: true,
        data: items,
        meta: {
          requestId: 'test-request-id-123',
          timestamp: expect.any(String),
          page: 1,
          pageSize: 25,
          total: 50,
          totalPages: 2,
        },
      });
    });

    it('calculates totalPages correctly', async () => {
      const { paginated } = await import('@dos/platform-core/http');

      const { res, getJson } = createMockResponse();
      paginated(res, [], 7, 1, 3);

      const body = getJson();
      expect(body.meta.totalPages).toBe(3); // ceil(7/3) = 3
    });

    it('handles zero total', async () => {
      const { paginated } = await import('@dos/platform-core/http');

      const { res, getJson } = createMockResponse();
      paginated(res, [], 0, 1, 25);

      const body = getJson();
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
      expect(body.meta.total).toBe(0);
      expect(body.meta.totalPages).toBe(0);
    });

    it('includes timestamp in ISO format', async () => {
      const { paginated } = await import('@dos/platform-core/http');

      const { res, getJson } = createMockResponse();
      paginated(res, [], 0, 1, 25);

      const body = getJson();
      expect(body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('ok() — Detail response', () => {
    it('returns correct shape with success, data object, and meta', async () => {
      const { ok } = await import('@dos/platform-core/http');

      const { res, getJson } = createMockResponse();
      const data = { risk_id: 'r1', title: 'Test Risk', status: 'open' };

      ok(res, data);

      const body = getJson();
      expect(body).toEqual({
        success: true,
        data,
        meta: {
          requestId: 'test-request-id-123',
          timestamp: expect.any(String),
        },
      });
    });

    it('works with null data', async () => {
      const { ok } = await import('@dos/platform-core/http');

      const { res, getJson } = createMockResponse();
      ok(res, null);

      const body = getJson();
      expect(body.success).toBe(true);
      expect(body.data).toBeNull();
    });
  });

  describe('action() — Mutation response', () => {
    it('returns correct shape with success and message', async () => {
      const { action } = await import('@dos/platform-core/http');

      const { res, getJson } = createMockResponse();
      action(res, 'Record deleted successfully');

      const body = getJson();
      expect(body).toEqual({
        success: true,
        message: 'Record deleted successfully',
        meta: {
          requestId: 'test-request-id-123',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('validate() — Validation error response', () => {
    it('returns VALIDATION_ERROR format on invalid body', async () => {
      // We need a Zod-like schema to test validate()
      const { validate } = await import('@dos/platform-core/http');

      const mockSchema = {
        safeParse: (_data: unknown) => ({
          success: false,
          error: {
            issues: [
              { path: ['title'], message: 'Required', code: 'invalid_type' },
              { path: ['category'], message: 'Required', code: 'invalid_type' },
            ],
          },
        }),
        parse: (_data: unknown) => { throw new Error('parse failed'); },
      };

      const middleware = validate(mockSchema);
      const req = createMockRequest({ body: {} });
      const { res, getJson, getStatus } = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(getStatus()).toBe(400);
      const body = getJson();
      expect(body).toEqual({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        source: 'body',
        details: [
          { field: 'title', message: 'Required', code: 'invalid_type' },
          { field: 'category', message: 'Required', code: 'invalid_type' },
        ],
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() on valid input', async () => {
      const { validate } = await import('@dos/platform-core/http');

      const mockSchema = {
        safeParse: (data: unknown) => ({
          success: true,
          data,
        }),
        parse: (data: unknown) => data,
      };

      const middleware = validate(mockSchema);
      const req = createMockRequest({ body: { title: 'Valid' } });
      const { res } = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('validates query params when source=query', async () => {
      const { validate } = await import('@dos/platform-core/http');

      const mockSchema = {
        safeParse: (_data: unknown) => ({
          success: false,
          error: {
            issues: [
              { path: ['page'], message: 'Expected number', code: 'invalid_type' },
            ],
          },
        }),
        parse: (_data: unknown) => { throw new Error('parse failed'); },
      };

      const middleware = validate(mockSchema, { source: 'query' });
      const req = createMockRequest({ query: { page: 'abc' } });
      const { res, getJson } = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      const body = getJson();
      expect(body.source).toBe('query');
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('errorHandler() — Error response', () => {
    it('returns error format with status code', async () => {
      const { errorHandler } = await import('@dos/platform-core/http');

      const { res, getJson, getStatus } = createMockResponse();
      const req = createMockRequest();
      const next = createMockNext();
      const err = { status: 422, message: 'Unprocessable entity', code: 'VALIDATION_FAILED' };

      errorHandler(err, req, res, next);

      expect(getStatus()).toBe(422);
      const body = getJson();
      expect(body).toEqual({
        error: 'Unprocessable entity',
        code: 'VALIDATION_FAILED',
      });
    });

    it('defaults to 500 and INTERNAL_ERROR', async () => {
      const { errorHandler } = await import('@dos/platform-core/http');

      const { res, getJson, getStatus } = createMockResponse();
      const req = createMockRequest();
      const next = createMockNext();

      errorHandler({}, req, res, next);

      expect(getStatus()).toBe(500);
      const body = getJson();
      expect(body.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Response meta consistency', () => {
    it('all response helpers include requestId from correlationId', async () => {
      const { ok, paginated, action } = await import('@dos/platform-core/http');

      for (const helper of [
        (r: any) => ok(r, {}),
        (r: any) => paginated(r, [], 0, 1, 10),
        (r: any) => action(r, 'test'),
      ]) {
        const { res, getJson } = createMockResponse();
        helper(res);
        const body = getJson();
        expect(body.meta.requestId).toBe('test-request-id-123');
      }
    });

    it('falls back to "unknown" when no correlationId', async () => {
      const { ok } = await import('@dos/platform-core/http');

      const { res, getJson } = createMockResponse();
      res.req = {};
      ok(res, {});

      const body = getJson();
      expect(body.meta.requestId).toBe('unknown');
    });
  });

  describe('Multi-source validation', () => {
    it('validates body and query simultaneously', async () => {
      const { validate } = await import('@dos/platform-core/http');

      const bodySchema = {
        safeParse: (data: unknown) => ({ success: true, data }),
        parse: (data: unknown) => data,
      };
      const querySchema = {
        safeParse: (_data: unknown) => ({
          success: false,
          error: {
            issues: [{ path: ['page'], message: 'Invalid', code: 'invalid_type' }],
          },
        }),
        parse: (_data: unknown) => { throw new Error(); },
      };

      const middleware = validate({ body: bodySchema, query: querySchema });
      const req = createMockRequest({ body: { title: 'ok' }, query: {} });
      const { res, getJson } = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      const body = getJson();
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.source).toBe('query');
      expect(next).not.toHaveBeenCalled();
    });
  });
});
