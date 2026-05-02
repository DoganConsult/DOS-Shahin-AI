import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@dos/db', () => ({
  safeQuery: vi.fn(),
  // Sibling exports resolved by risk.service.ts at module load.
  tenantSchema: (t: string) => `tenant_${t}`,
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  getDbLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  withTenantClient: async (_t: string, fn: (c: unknown) => unknown) =>
    fn({ query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }) }),
}));

vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@dos/types/errors', () => ({
  toErrorMessage: vi.fn((e: unknown) => (e as Error)?.message || String(e)),
}));

import { safeQuery } from '@dos/db';
import * as service from '../domain/risk.service';

const mockSafeQuery = vi.mocked(safeQuery);

const TENANT = 'tenant-001';
const RISK_ID = 'risk-aaa-bbb-ccc';

const sampleRisk: service.RiskRecord = {
  risk_id: RISK_ID,
  tenant_id: TENANT,
  title: 'Data breach risk',
  description: 'Potential exposure of PII',
  category: 'cybersecurity',
  likelihood: 'high',
  impact: 'critical',
  risk_score: 92,
  status: 'open',
  owner_id: 'user-1',
  mitigation_plan: 'Encrypt all PII at rest',
  residual_risk: 'low',
  review_date: '2026-06-01',
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
};

describe('RiskService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('returns paginated results with correct shape', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 2 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [sampleRisk, { ...sampleRisk, risk_id: 'risk-2' }], rowCount: 2 } as any);

      const result = await service.list(TENANT, { page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(mockSafeQuery).toHaveBeenCalledTimes(2);
      // Verify count query targets the tenant-scoped risks table.
      // Phase 2 tenant-safety hardening replaced the shared `dos.risks`
      // reference with per-tenant `"tenant_<id>"."risks"` via tenantSchema().
      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('"tenant_tenant-001"."risks"');
      expect(countQuery).toContain('COUNT(*)');
    });

    it('applies status filter with parameterized query', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [sampleRisk], rowCount: 1 } as any);

      const result = await service.list(TENANT, { status: 'open' });

      expect(result.data).toHaveLength(1);
      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      // Post Phase-2 tenant-scoped shape: tenantId is NOT a bind param
      // (schema is derived via tenantSchema()); the first bind is status.
      expect(countQuery).toContain('status = $1');
      expect(mockSafeQuery.mock.calls[0][1]).toEqual(['open']);
    });

    it('applies search filter with ILIKE', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [sampleRisk], rowCount: 1 } as any);

      await service.list(TENANT, { search: 'breach' });

      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('title ILIKE');
      expect(countQuery).toContain('description ILIKE');
      expect(mockSafeQuery.mock.calls[0][1]).toContain('%breach%');
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

      const result = await service.list(TENANT, { pageSize: 500 });

      expect(result.pageSize).toBe(100);
    });

    it('handles pagination boundaries', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 100 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.list(TENANT, { page: 5, pageSize: 10 });

      expect(result.page).toBe(5);
      expect(result.pageSize).toBe(10);
      // Verify OFFSET is calculated correctly: (5-1)*10 = 40
      const dataQuery = mockSafeQuery.mock.calls[1][0] as string;
      expect(dataQuery).toContain('OFFSET 40');
    });

    it('propagates database errors', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('DB connection lost'));
      await expect(service.list(TENANT)).rejects.toThrow('DB connection lost');
    });

    it('excludes soft-deleted records', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await service.list(TENANT);

      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('deleted_at IS NULL');
    });
  });

  describe('getById', () => {
    it('returns risk record when found', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [sampleRisk], rowCount: 1 } as any);

      const result = await service.getById(TENANT, RISK_ID);

      expect(result).toEqual(sampleRisk);
      expect(result!.risk_id).toBe(RISK_ID);
      expect(result!.tenant_id).toBe(TENANT);
      expect(mockSafeQuery).toHaveBeenCalledWith(
        expect.stringContaining('risk_id = $2'),
        [TENANT, RISK_ID],
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
    it('inserts and returns new risk with generated UUID', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [sampleRisk], rowCount: 1 } as any);

      const input: service.CreateRiskInput = {
        title: 'Data breach risk',
        category: 'cybersecurity',
        likelihood: 'high',
        impact: 'critical',
        risk_score: 92,
        status: 'open',
      };
      const result = await service.create(TENANT, input);

      expect(result).toEqual(sampleRisk);
      const insertQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(insertQuery).toContain('INSERT INTO dos.risks');
      expect(insertQuery).toContain('RETURNING');
      // Verify 13 parameter placeholders ($1-$13)
      const params = mockSafeQuery.mock.calls[0][1] as unknown[];
      expect(params).toHaveLength(13);
      expect(params[1]).toBe(TENANT); // tenant_id is $2
    });

    it('propagates database errors on insert', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('unique violation'));
      await expect(service.create(TENANT, { title: 'x', category: 'x' })).rejects.toThrow('unique violation');
    });
  });

  describe('update', () => {
    it('updates existing risk and returns updated record', async () => {
      const updated = { ...sampleRisk, title: 'Updated risk' };
      // getById call
      mockSafeQuery.mockResolvedValueOnce({ rows: [sampleRisk], rowCount: 1 } as any);
      // update call
      mockSafeQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 } as any);

      const result = await service.update(TENANT, RISK_ID, { title: 'Updated risk' });

      expect(result).toEqual(updated);
      const updateQuery = mockSafeQuery.mock.calls[1][0] as string;
      expect(updateQuery).toContain('UPDATE dos.risks SET');
      expect(updateQuery).toContain('updated_at = NOW()');
    });

    it('returns null for non-existent item', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.update(TENANT, 'nonexistent', { title: 'test' });

      expect(result).toBeNull();
      expect(mockSafeQuery).toHaveBeenCalledTimes(1); // only getById
    });

    it('returns existing record when no fields to update', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [sampleRisk], rowCount: 1 } as any);

      const result = await service.update(TENANT, RISK_ID, {});

      expect(result).toEqual(sampleRisk);
      expect(mockSafeQuery).toHaveBeenCalledTimes(1); // only getById, no UPDATE
    });
  });

  describe('remove', () => {
    it('soft-deletes item with deleted_at and is_deleted', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const result = await service.remove(TENANT, RISK_ID);

      expect(result).toBe(true);
      const deleteQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(deleteQuery).toContain('deleted_at = NOW()');
      expect(deleteQuery).toContain('is_deleted = true');
      expect(deleteQuery).not.toContain('DELETE FROM');
    });

    it('returns false for non-existent item', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.remove(TENANT, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('restore', () => {
    it('restores soft-deleted item', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const result = await service.restore(TENANT, RISK_ID);

      expect(result).toBe(true);
      const restoreQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(restoreQuery).toContain('deleted_at = NULL');
      expect(restoreQuery).toContain('is_deleted = false');
    });

    it('returns false when not previously deleted', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.restore(TENANT, RISK_ID);

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
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 3 } as any);

      const result = await service.bulkRemove(TENANT, ['id-1', 'id-2', 'id-3']);

      expect(result).toBe(3);
      const query = mockSafeQuery.mock.calls[0][0] as string;
      expect(query).toContain('$2');
      expect(query).toContain('$3');
      expect(query).toContain('$4');
    });
  });

  describe('getStats', () => {
    it('returns total and byStatus breakdown', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 5 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ status: 'open', count: 3 }, { status: 'mitigated', count: 2 }], rowCount: 2 } as any);

      const result = await service.getStats(TENANT);

      expect(result.total).toBe(5);
      expect(result.byStatus).toEqual({ open: 3, mitigated: 2 });
    });

    it('returns zero stats on error', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('DB down'));

      const result = await service.getStats(TENANT);

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual({});
    });
  });
});
