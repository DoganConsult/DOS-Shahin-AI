import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn((t: string) => `tenant_${t}`),
}));

import {
  transitionStatus,
  bulkTransitionStatus,
  getStatusHistory,
  getFailedNotifications,
  retryFailedNotifications,
  getAvailableTransitions,
} from './notification-lifecycle.service';
import { safeQuery } from '../ports/database.port';

const TENANT = 'test-tenant';
const ENTITY = 'entity-001';
const USER = 'user-001';

describe('NotificationLifecycleService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('transitionStatus()', () => {
    it('transitions notification from pending to sent', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'pending' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await transitionStatus(TENANT, ENTITY, 'sent', USER);
      expect(result).toEqual({ fromStatus: 'pending', toStatus: 'sent' });
    });

    it('transitions template from draft to in_review', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await transitionStatus(TENANT, ENTITY, 'in_review', USER, 'template');
      expect(result).toEqual({ fromStatus: 'draft', toStatus: 'in_review' });
    });

    it('throws 404 when not found', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(transitionStatus(TENANT, ENTITY, 'sent', USER)).rejects.toThrow('not found');
    });

    it('throws 400 for invalid transition', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ status: 'pending' }] });
      await expect(transitionStatus(TENANT, ENTITY, 'archived', USER)).rejects.toThrow('Cannot transition');
    });
  });

  describe('bulkTransitionStatus()', () => {
    it('returns succeeded and failed', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ status: 'pending' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await bulkTransitionStatus(TENANT, ['e-1', 'e-2'], 'sent', USER);
      expect(result.succeeded).toContain('e-1');
      expect(result.failed.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getStatusHistory()', () => {
    it('returns audit trail rows', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ fromStatus: 'pending', toStatus: 'sent' }] });
      const result = await getStatusHistory(TENANT, ENTITY);
      expect(result).toHaveLength(1);
    });

    it('returns empty array on error', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('db'));
      expect(await getStatusHistory(TENANT, ENTITY)).toEqual([]);
    });
  });

  describe('getFailedNotifications()', () => {
    it('returns failed notifications', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ id: 'n-1', status: 'failed' }] });
      const result = await getFailedNotifications(TENANT);
      expect(result).toHaveLength(1);
    });

    it('returns empty on error', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('db'));
      expect(await getFailedNotifications(TENANT)).toEqual([]);
    });
  });

  describe('retryFailedNotifications()', () => {
    it('retries and returns count', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ id: 'n-1' }, { id: 'n-2' }] })
        .mockResolvedValue({ rows: [] });
      const result = await retryFailedNotifications(TENANT, USER);
      expect(result.retried).toBe(2);
    });

    it('returns 0 on error', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('db'));
      expect((await retryFailedNotifications(TENANT, USER)).retried).toBe(0);
    });
  });

  describe('getAvailableTransitions()', () => {
    it('returns transitions for pending notification', async () => {
      const result = await getAvailableTransitions('pending');
      expect(result).toContain('sent');
    });

    it('returns transitions for draft template', async () => {
      const result = await getAvailableTransitions('draft', 'template');
      expect(result).toContain('in_review');
    });

    it('returns empty for unknown state', async () => {
      expect(await getAvailableTransitions('unknown')).toEqual([]);
    });
  });
});
