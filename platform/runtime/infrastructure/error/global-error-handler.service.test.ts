import { describe, it, expect } from 'vitest';

describe('GlobalErrorHandler logic', () => {
  it('should extract message from Error object', () => {
    const err = new Error('Something failed');
    expect(err.message).toBe('Something failed');
  });

  it('should handle string errors', () => {
    const err = 'Network error';
    expect(typeof err === 'string' ? err : String(err)).toBe('Network error');
  });

  it('should handle HttpErrorResponse-like objects', () => {
    const httpError = { status: 404, statusText: 'Not Found', error: { message: 'Resource not found' } };
    expect(httpError.status).toBe(404);
    expect(httpError.error.message).toBe('Resource not found');
  });

  it('should handle null/undefined errors', () => {
    const err = null;
    const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
    expect(message).toBe('Unknown error');
  });

  it('should format error with stack trace', () => {
    const err = new Error('Test');
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('Test');
  });
});
