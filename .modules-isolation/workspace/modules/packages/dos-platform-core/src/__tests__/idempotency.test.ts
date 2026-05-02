import { describe, it, expect } from 'vitest';
import { idempotencyMiddleware } from '../http/idempotency';

describe('idempotencyMiddleware', () => {
  it('returns middleware function', () => {
    const mw = idempotencyMiddleware();
    expect(typeof mw).toBe('function');
  });

  it('accepts custom options', () => {
    const mw = idempotencyMiddleware({ ttlMs: 1000, headerName: 'x-idem' });
    expect(typeof mw).toBe('function');
  });
});
