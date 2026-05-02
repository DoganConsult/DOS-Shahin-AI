import { describe, it, expect, vi, beforeEach as _beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
}));

import {
  transitionStatus,
  bulkTransitionStatus,
  getStatusHistory,
  cancelItem,
  reopenItem,
} from './action-lifecycle.service';
import { safeQuery } from '../ports/database.port';


// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({rows: []}),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({rows: []}) })),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
  query: vi.fn().mockResolvedValue({rows: []})
}));

  describe('transitionStatus', () => {
    it('should transition from open to in_progress', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'open' }] })
        .mockResolvedValue({ rows: [] });
      const result = await transitionStatus('t1', 'e1', 'in_progress', 'u1');
      expect(result.fromStatus).toBe('open');
      expect(result.toStatus).toBe('in_progress');
    });

    it('should throw 404 for missing entity', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(transitionStatus('t1', 'missing', 'in_progress', 'u1')).rejects.toThrow();
    });

    it('should throw 400 for invalid transition', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ status: 'open' }] });
      await expect(transitionStatus('t1', 'e1', 'completed', 'u1')).rejects.toThrow();
    });
  });

  describe('bulkTransitionStatus', () => {
    it('should process multiple entities', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'open' }] })
        .mockResolvedValue({ rows: [] });
      const result = await bulkTransitionStatus('t1', ['e1'], 'in_progress', 'u1');
      expect(result.succeeded.length + result.failed.length).toBe(1);
    });
  });

  describe('getStatusHistory', () => {
    it('should return history array', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ fromStatus: 'open', toStatus: 'in_progress', changedBy: 'u1', changedAt: '2024-01-01' }] });
      const result = await getStatusHistory('t1', 'e1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty on error', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('db'));
      const result = await getStatusHistory('t1', 'e1');
      expect(result).toEqual([]);
    });
  });

  describe('cancelItem', () => {
    it('should transition to cancelled', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'open' }] })
        .mockResolvedValue({ rows: [] });
      const result = await cancelItem('t1', 'e1', 'u1');
      expect(result.toStatus).toBe('cancelled');
    });
  });

  describe('reopenItem', () => {
    it('should transition to open', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'completed' }] })
        .mockResolvedValue({ rows: [] });
      const result = await reopenItem('t1', 'e1', 'u1');
      expect(result.toStatus).toBe('open');
    });
  });
