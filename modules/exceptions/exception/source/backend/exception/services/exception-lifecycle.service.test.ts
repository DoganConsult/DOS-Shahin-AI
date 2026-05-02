import { describe, it, expect, vi, beforeEach as _beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
}));

vi.mock('../workflows/exception-lifecycle', () => ({
  EXCEPTION_TRANSITIONS: {
    draft: ['submitted', 'archived'],
    submitted: ['under_review', 'draft', 'archived'],
    under_review: ['approved', 'rejected', 'submitted', 'archived'],
    approved: ['active', 'revoked'],
    rejected: ['archived'],
    active: ['expiring', 'revoked', 'closed'],
    expiring: ['active', 'expired', 'closed'],
    expired: ['closed', 'archived'],
    revoked: ['archived'],
    closed: ['archived'],
    archived: [],
  },
}));

import {
  getExceptionTimeline,
  extendException,
  revokeException,
} from './exception-lifecycle.service';
import { safeQuery } from '../ports/database.port';


// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({rows: []}),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({rows: []}) })),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
  query: vi.fn().mockResolvedValue({rows: []})
}));

  describe('getExceptionTimeline', () => {
    it('should return paginated result', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ total: 0 }] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await getExceptionTimeline('t1', 'e1');
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
    });
  });

  describe('extendException', () => {
    it('should be a function', () => {
      expect(typeof extendException).toBe('function');
    });

    it('should throw 404 for missing exception', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(extendException('t1', 'e1', { additionalDays: 30, justification: 'test', requestedBy: 'u1' })).rejects.toThrow();
    });
  });

  describe('revokeException', () => {
    it('should be a function', () => {
      expect(typeof revokeException).toBe('function');
    });

    it('should throw 404 for missing exception', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(revokeException('t1', 'e1', { reason: 'test', revokedBy: 'u1' })).rejects.toThrow();
    });
  });
