import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn((t: string) => `tenant_${t}`),
}));

import {
  transitionStatus,
  bulkTransitionStatus,
  getStatusHistory,
  getFailedInstallations,
  getLifecycleState,
  getAvailableTransitions,
} from './packs-lifecycle.service';
import { safeQuery } from '../ports/database.port';

const TENANT = 'test-tenant';
const ENTITY = 'entity-001';
const USER = 'user-001';

describe('PacksLifecycleService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('transitionStatus()', () => {
    it('transitions installation from available to installing', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'available' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await transitionStatus(TENANT, ENTITY, 'installing', USER);
      expect(result).toEqual({ fromStatus: 'available', toStatus: 'installing' });
    });

    it('transitions record from draft to in_review', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await transitionStatus(TENANT, ENTITY, 'in_review', USER, 'record');
      expect(result).toEqual({ fromStatus: 'draft', toStatus: 'in_review' });
    });

    it('throws 404 when not found', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(transitionStatus(TENANT, ENTITY, 'installing', USER)).rejects.toThrow('not found');
    });

    it('throws 400 for invalid transition', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ status: 'available' }] });
      await expect(transitionStatus(TENANT, ENTITY, 'archived', USER)).rejects.toThrow('Cannot transition');
    });

    it('uses pack_installations table for installation type', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'available' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      await transitionStatus(TENANT, ENTITY, 'installing', USER, 'installation');
      expect((safeQuery as any).mock.calls[0][0]).toContain('pack_installations');
    });
  });

  describe('bulkTransitionStatus()', () => {
    it('processes multiple entities', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'available' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await bulkTransitionStatus(TENANT, ['e-1', 'e-2'], 'installing', USER);
      expect(result.succeeded.length + result.failed.length).toBe(2);
    });
  });

  describe('getStatusHistory()', () => {
    it('returns rows', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ fromStatus: 'available' }] });
      expect(await getStatusHistory(TENANT, ENTITY)).toHaveLength(1);
    });

    it('returns empty on error', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('db'));
      expect(await getStatusHistory(TENANT, ENTITY)).toEqual([]);
    });
  });

  describe('getFailedInstallations()', () => {
    it('returns failed installs', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ id: 'p-1', status: 'failed' }] });
      expect(await getFailedInstallations(TENANT)).toHaveLength(1);
    });

    it('returns empty on error', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('db'));
      expect(await getFailedInstallations(TENANT)).toEqual([]);
    });
  });

  describe('getLifecycleState()', () => {
    it('returns state with SLA', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ id: ENTITY, status: 'installed', created_at: new Date().toISOString() }] });
      const result = await getLifecycleState(TENANT, ENTITY);
      expect(result!.slaHours).toBe(72);
      expect(result!.status).toBe('installed');
    });

    it('returns null when not found', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      expect(await getLifecycleState(TENANT, ENTITY)).toBeNull();
    });
  });

  describe('getAvailableTransitions()', () => {
    it('returns targets for available installation', async () => {
      expect(await getAvailableTransitions('available')).toContain('installing');
    });

    it('returns targets for draft record', async () => {
      expect(await getAvailableTransitions('draft', 'record')).toContain('in_review');
    });

    it('returns empty for archived', async () => {
      expect(await getAvailableTransitions('archived')).toEqual([]);
    });
  });
});
