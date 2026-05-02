import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn((t: string) => `tenant_${t}`),
}));

import {
  transitionStatus,
  bulkTransitionStatus,
  getStatusHistory,
  getLifecycleState,
  getAvailableTransitions,
} from './analytics-lifecycle.service';
import { safeQuery } from '../../ports/database.port';

const TENANT = 'test-tenant';
const ENTITY = 'entity-001';
const USER = 'user-001';

describe('AnalyticsLifecycleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('transitionStatus()', () => {
    it('transitions from draft to in_review for dashboard', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await transitionStatus(TENANT, ENTITY, 'in_review', USER, 'dashboard');
      expect(result).toEqual({ fromStatus: 'draft', toStatus: 'in_review' });
    });

    it('throws 404 when entity not found', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(transitionStatus(TENANT, ENTITY, 'in_review', USER)).rejects.toThrow('not found');
    });

    it('throws 400 for invalid transition', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ status: 'draft' }] });
      await expect(transitionStatus(TENANT, ENTITY, 'archived', USER)).rejects.toThrow('Cannot transition');
    });

    it('uses correct table for dataset entity type', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      await transitionStatus(TENANT, ENTITY, 'in_review', USER, 'dataset');
      expect((safeQuery as any).mock.calls[0][0]).toContain('analytics_datasets');
    });

    it('uses correct table for metric entity type', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      await transitionStatus(TENANT, ENTITY, 'in_review', USER, 'metric');
      expect((safeQuery as any).mock.calls[0][0]).toContain('analytics_metrics');
    });
  });

  describe('bulkTransitionStatus()', () => {
    it('returns succeeded and failed arrays', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await bulkTransitionStatus(TENANT, ['e-1', 'e-2'], 'in_review', USER);
      expect(result.succeeded).toContain('e-1');
      expect(result.failed.find(f => f.id === 'e-2')).toBeDefined();
    });
  });

  describe('getStatusHistory()', () => {
    it('returns rows from audit trail', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ fromStatus: 'draft', toStatus: 'in_review' }] });
      const result = await getStatusHistory(TENANT, ENTITY);
      expect(result).toHaveLength(1);
    });

    it('returns empty array on error', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('db'));
      const result = await getStatusHistory(TENANT, ENTITY);
      expect(result).toEqual([]);
    });
  });

  describe('getLifecycleState()', () => {
    it('returns lifecycle state with SLA info', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ id: ENTITY, status: 'active', created_at: new Date().toISOString() }] });
      const result = await getLifecycleState(TENANT, ENTITY);
      expect(result).not.toBeNull();
      expect(result!.slaHours).toBe(168);
      expect(result!.status).toBe('active');
    });

    it('returns null when not found', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const result = await getLifecycleState(TENANT, ENTITY);
      expect(result).toBeNull();
    });
  });

  describe('getAvailableTransitions()', () => {
    it('returns transitions for draft state', async () => {
      const result = await getAvailableTransitions(TENANT, 'draft');
      expect(result).toContain('in_review');
    });

    it('returns empty for archived state', async () => {
      const result = await getAvailableTransitions(TENANT, 'archived');
      expect(result).toEqual([]);
    });
  });
});
