import { describe, expect, it } from 'vitest';
import { NotFoundError, ServiceError, ValidationError } from './index';

describe('errors', () => {
  it('NotFoundError carries status/code and details', () => {
    const err = new NotFoundError('Decision', 'd_1');
    expect(err).toBeInstanceOf(ServiceError);
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Decision not found');
    expect(err.details).toEqual({ entityType: 'Decision', entityId: 'd_1' });
  });

  it('ValidationError supports array issues', () => {
    const err = new ValidationError([{ path: 'q', message: 'required' }]);
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.issues).toEqual([{ path: 'q', message: 'required' }]);
    expect(err.details).toEqual({ issues: [{ path: 'q', message: 'required' }] });
  });

  it('ValidationError redacts sensitive fields in details', () => {
    const err = new ServiceError({
      message: 'x',
      status: 400,
      code: 'X',
      details: { token: 'abc', nested: { password: 'p', keep: 'ok' } },
    });
    expect(err.details).toEqual({ token: '[redacted]', nested: { password: '[redacted]', keep: 'ok' } });
  });
});

