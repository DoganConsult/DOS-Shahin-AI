import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@dos/db', () => ({
  safeQuery: vi.fn(),
}));

vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@dos/types/errors', () => ({
  toErrorMessage: vi.fn((e: unknown) => (e as Error)?.message || String(e)),
}));

import { safeQuery } from '@dos/db';
import * as service from '../domain/bcp-plan.service';

const mockSafeQuery = vi.mocked(safeQuery);

const TENANT = 'tenant-001';
const PLAN_ID = 'plan-aaa-bbb-ccc';

const samplePlan: service.BcpPlanRecord = {
  plan_id: PLAN_ID,
  tenant_id: TENANT,
  title: 'Data Center Recovery Plan',
  description: 'Recovery procedures for primary data center',
  type: 'disaster-recovery',
  status: 'approved',
  owner_id: 'user-1',
  priority: 'critical',
  rto_hours: 4,
  rpo_hours: 1,
  last_tested_at: '2026-03-01',
  next_review_date: '2026-09-01',
  created_at: '2025-06-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
};

describe('BcpPlanService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('returns paginated results from dos.bcp_plans', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 2 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [samplePlan, { ...samplePlan, plan_id: 'plan-2' }], rowCount: 2 } as any);

      const result = await service.list(TENANT, { page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('dos.bcp_plans');
    });

    it('applies status filter', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [samplePlan], rowCount: 1 } as any);

      await service.list(TENANT, { status: 'approved' });

      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('status = $2');
      expect(mockSafeQuery.mock.calls[0][1]).toEqual([TENANT, 'approved']);
    });

    it('applies search filter', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [samplePlan], rowCount: 1 } as any);

      await service.list(TENANT, { search: 'recovery' });

      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('ILIKE');
      expect(mockSafeQuery.mock.calls[0][1]).toContain('%recovery%');
    });

    it('defaults to page 1 and pageSize 25', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.list(TENANT);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(25);
    });

    it('caps pageSize at 100', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.list(TENANT, { pageSize: 999 });

      expect(result.pageSize).toBe(100);
    });

    it('propagates database errors', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('DB connection lost'));
      await expect(service.list(TENANT)).rejects.toThrow('DB connection lost');
    });
  });

  describe('getById', () => {
    it('returns BCP plan when found', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [samplePlan], rowCount: 1 } as any);

      const result = await service.getById(TENANT, PLAN_ID);

      expect(result).toEqual(samplePlan);
      expect(result!.plan_id).toBe(PLAN_ID);
      expect(result!.rto_hours).toBe(4);
      expect(result!.rpo_hours).toBe(1);
      expect(mockSafeQuery).toHaveBeenCalledWith(
        expect.stringContaining('plan_id = $2'),
        [TENANT, PLAN_ID],
      );
    });

    it('returns null when not found', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.getById(TENANT, 'nonexistent');

      expect(result).toBeNull();
    });

    it('propagates database errors', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('timeout'));
      await expect(service.getById(TENANT, 'r1')).rejects.toThrow('timeout');
    });
  });

  describe('create', () => {
    it('inserts and returns new BCP plan', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [samplePlan], rowCount: 1 } as any);

      const input: service.CreateBcpPlanInput = {
        title: 'Data Center Recovery Plan',
        type: 'disaster-recovery',
        status: 'approved',
        priority: 'critical',
        rto_hours: 4,
        rpo_hours: 1,
      };
      const result = await service.create(TENANT, input);

      expect(result).toEqual(samplePlan);
      const insertQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(insertQuery).toContain('INSERT INTO dos.bcp_plans');
      expect(insertQuery).toContain('RETURNING');
      const params = mockSafeQuery.mock.calls[0][1] as unknown[];
      expect(params).toHaveLength(12); // id + tenant + 10 fields
    });

    it('propagates database errors on insert', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('unique violation'));
      await expect(
        service.create(TENANT, { title: 'x', type: 'x' }),
      ).rejects.toThrow('unique violation');
    });
  });

  describe('update', () => {
    it('updates existing BCP plan', async () => {
      const updated = { ...samplePlan, rto_hours: 2 };
      mockSafeQuery.mockResolvedValueOnce({ rows: [samplePlan], rowCount: 1 } as any);
      mockSafeQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 } as any);

      const result = await service.update(TENANT, PLAN_ID, { rto_hours: 2 });

      expect(result).toEqual(updated);
      const updateQuery = mockSafeQuery.mock.calls[1][0] as string;
      expect(updateQuery).toContain('UPDATE dos.bcp_plans SET');
      expect(updateQuery).toContain('updated_at = NOW()');
    });

    it('returns null for non-existent item', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.update(TENANT, 'nonexistent', { title: 'test' });

      expect(result).toBeNull();
    });

    it('returns existing when no fields to update', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [samplePlan], rowCount: 1 } as any);

      const result = await service.update(TENANT, PLAN_ID, {});

      expect(result).toEqual(samplePlan);
      expect(mockSafeQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('soft-deletes item', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const result = await service.remove(TENANT, PLAN_ID);

      expect(result).toBe(true);
      const deleteQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(deleteQuery).toContain('deleted_at = NOW()');
      expect(deleteQuery).toContain('is_deleted = true');
    });

    it('returns false for non-existent item', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.remove(TENANT, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('restore', () => {
    it('restores soft-deleted plan', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const result = await service.restore(TENANT, PLAN_ID);

      expect(result).toBe(true);
      const restoreQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(restoreQuery).toContain('deleted_at = NULL');
      expect(restoreQuery).toContain('is_deleted = false');
    });

    it('returns false when plan not found', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.restore(TENANT, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('bulkRemove', () => {
    it('returns 0 for empty id list', async () => {
      const result = await service.bulkRemove(TENANT, []);

      expect(result).toBe(0);
      expect(mockSafeQuery).not.toHaveBeenCalled();
    });

    it('removes multiple items', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 2 } as any);

      const result = await service.bulkRemove(TENANT, ['id-1', 'id-2']);

      expect(result).toBe(2);
    });
  });

  describe('getStats', () => {
    it('returns total and byStatus breakdown', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 6 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ status: 'approved', count: 4 }, { status: 'draft', count: 2 }], rowCount: 2 } as any);

      const result = await service.getStats(TENANT);

      expect(result.total).toBe(6);
      expect(result.byStatus).toEqual({ approved: 4, draft: 2 });
    });

    it('returns zero stats on error', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('DB down'));

      const result = await service.getStats(TENANT);

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual({});
    });
  });
});
