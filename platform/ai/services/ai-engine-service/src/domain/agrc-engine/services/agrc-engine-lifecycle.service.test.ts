import { describe, it, expect, vi, beforeEach as _beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
}));

import {
  transitionStatus,
  getStatusHistory,
  getAvailableTransitions,
  getLifecycleState,
  bulkTransitionStatus,
  getFailedRuns,
  getStuckRuns,
} from './agrc-engine-lifecycle.service';
import { safeQuery } from '../ports/database.port';


// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({rows: []}),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({rows: []}) })),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
  query: vi.fn().mockResolvedValue({rows: []})
}));

  describe('transitionStatus', () => {
    it('should transition from draft to in_review', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })
        .mockResolvedValue({ rows: [] });
      const result = await transitionStatus('t1', 'e1', 'in_review', 'u1');
      expect(result.fromStatus).toBe('draft');
      expect(result.toStatus).toBe('in_review');
    });

    it('should throw 404 for missing entity', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(transitionStatus('t1', 'missing', 'in_review', 'u1')).rejects.toThrow();
    });

    it('should throw 400 for invalid transition', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ status: 'draft' }] });
      await expect(transitionStatus('t1', 'e1', 'archived', 'u1')).rejects.toThrow();
    });
  });

  describe('bulkTransitionStatus', () => {
    it('should process multiple entities', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })
        .mockResolvedValue({ rows: [] });
      const result = await bulkTransitionStatus('t1', ['e1'], 'in_review', 'u1');
      expect(result.succeeded.length + result.failed.length).toBe(1);
    });

    it('should track failures separately', async () => {
      (safeQuery as any).mockResolvedValue({ rows: [] });
      const result = await bulkTransitionStatus('t1', ['e1'], 'in_review', 'u1');
      expect(result.failed.length).toBe(1);
    });
  });

  describe('getStatusHistory', () => {
    it('should return history array', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ fromStatus: 'draft', toStatus: 'in_review', changedBy: 'u1', changedAt: '2024-01-01' }] });
      const result = await getStatusHistory('t1', 'e1');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });

    it('should return empty on error', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('db'));
      const result = await getStatusHistory('t1', 'e1');
      expect(result).toEqual([]);
    });
  });

  describe('getLifecycleState', () => {
    it('should return lifecycle state with SLA tracking', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ id: 'e1', status: 'active', created_at: new Date().toISOString() }] });
      const result = await getLifecycleState('t1', 'e1');
      expect(result).not.toBeNull();
      expect(result!.slaHours).toBeGreaterThan(0);
      expect(typeof result!.breached).toBe('boolean');
    });

    it('should return null for missing entity', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const result = await getLifecycleState('t1', 'missing');
      expect(result).toBeNull();
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return transitions for draft', async () => {
      const result = await getAvailableTransitions('draft');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('in_review');
    });

    it('should return empty for archived', async () => {
      const result = await getAvailableTransitions('archived');
      expect(result).toEqual([]);
    });

    it('should return empty for unknown state', async () => {
      const result = await getAvailableTransitions('nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('domain queries', () => {
    it('getFailedRuns should return array', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ id: '1', status: 'test', updatedAt: '2024-01-01' }] });
      const result = await getFailedRuns('t1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('getFailedRuns should return empty on error', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('db'));
      const result = await getFailedRuns('t1');
      expect(result).toEqual([]);
    });

    it('getStuckRuns should return array', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ id: '1', status: 'test', updatedAt: '2024-01-01' }] });
      const result = await getStuckRuns('t1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('getStuckRuns should return empty on error', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('db'));
      const result = await getStuckRuns('t1');
      expect(result).toEqual([]);
    });

  });
