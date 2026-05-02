import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn((t: string) => `tenant_${t}`),
}));

import {
  transitionStatus,
  bulkTransitionStatus,
  getStatusHistory,
  getStaleDataSources,
  getDisabledWidgets,
  getAvailableTransitions,
} from './widgets-lifecycle.service';
import { safeQuery } from '../ports/database.port';

const TENANT = 'test-tenant';
const ENTITY = 'entity-001';
const USER = 'user-001';

describe('WidgetsLifecycleService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('transitionStatus()', () => {
    it('transitions widget from draft to configured', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await transitionStatus(TENANT, ENTITY, 'configured', USER, 'widget');
      expect(result).toEqual({ fromStatus: 'draft', toStatus: 'configured' });
    });

    it('transitions record from draft to in_review', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await transitionStatus(TENANT, ENTITY, 'in_review', USER, 'record');
      expect(result).toEqual({ fromStatus: 'draft', toStatus: 'in_review' });
    });

    it('transitions data_source from connected to active', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'connected' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await transitionStatus(TENANT, ENTITY, 'active', USER, 'data_source');
      expect(result).toEqual({ fromStatus: 'connected', toStatus: 'active' });
    });

    it('throws 404 when not found', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(transitionStatus(TENANT, ENTITY, 'configured', USER)).rejects.toThrow('not found');
    });

    it('throws 400 for invalid transition', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ status: 'draft' }] });
      await expect(transitionStatus(TENANT, ENTITY, 'archived', USER, 'widget')).rejects.toThrow('Cannot transition');
    });
  });

  describe('bulkTransitionStatus()', () => {
    it('processes multiple entities', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await bulkTransitionStatus(TENANT, ['e-1', 'e-2'], 'configured', USER);
      expect(result.succeeded.length + result.failed.length).toBe(2);
    });
  });

  describe('getStatusHistory()', () => {
    it('returns rows', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ fromStatus: 'draft' }] });
      expect(await getStatusHistory(TENANT, ENTITY)).toHaveLength(1);
    });

    it('returns empty on error', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('db'));
      expect(await getStatusHistory(TENANT, ENTITY)).toEqual([]);
    });
  });

  describe('getStaleDataSources()', () => {
    it('returns stale sources', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ id: 'ds-1', status: 'stale' }] });
      expect(await getStaleDataSources(TENANT)).toHaveLength(1);
    });

    it('returns empty on error', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('db'));
      expect(await getStaleDataSources(TENANT)).toEqual([]);
    });
  });

  describe('getDisabledWidgets()', () => {
    it('returns disabled widgets', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ id: 'w-1', status: 'disabled' }] });
      expect(await getDisabledWidgets(TENANT)).toHaveLength(1);
    });

    it('returns empty on error', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('db'));
      expect(await getDisabledWidgets(TENANT)).toEqual([]);
    });
  });

  describe('getAvailableTransitions()', () => {
    it('returns widget transitions from draft', async () => {
      expect(await getAvailableTransitions('draft', 'widget')).toContain('configured');
    });

    it('returns data_source transitions from active', async () => {
      const result = await getAvailableTransitions('active', 'data_source');
      expect(result).toContain('stale');
      expect(result).toContain('disconnected');
    });

    it('returns record transitions from draft', async () => {
      expect(await getAvailableTransitions('draft', 'record')).toContain('in_review');
    });

    it('returns empty for terminal', async () => {
      expect(await getAvailableTransitions('archived', 'widget')).toEqual([]);
    });
  });
});
