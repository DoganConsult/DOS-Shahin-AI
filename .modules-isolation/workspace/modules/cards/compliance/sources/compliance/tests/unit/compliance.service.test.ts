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
import * as service from '../../domain/compliance.service';

const mockSafeQuery = vi.mocked(safeQuery);

const TENANT = 'tenant-001';
const REQ_ID = 'req-aaa-bbb-ccc';

const sampleCompliance: service.ComplianceRecord = {
  requirement_id: REQ_ID,
  tenant_id: TENANT,
  framework_id: 'fw-iso27001',
  framework_name: 'ISO 27001',
  control_ref: 'A.5.1',
  title: 'Information security policies',
  description: 'Policies for information security',
  status: 'compliant',
  evidence_status: 'collected',
  owner_id: 'user-1',
  due_date: '2026-06-01',
  last_assessed_at: '2026-03-15',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
};

describe('ComplianceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('returns paginated results from dos.compliance_requirements', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 2 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [sampleCompliance, { ...sampleCompliance, requirement_id: 'req-2' }], rowCount: 2 } as any);

      const result = await service.list(TENANT, { page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('dos.compliance_requirements');
    });

    it('applies status filter with parameterized query', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [sampleCompliance], rowCount: 1 } as any);

      await service.list(TENANT, { status: 'compliant' });

      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('status = $2');
      expect(mockSafeQuery.mock.calls[0][1]).toEqual([TENANT, 'compliant']);
    });

    it('applies search filter across title and description', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [sampleCompliance], rowCount: 1 } as any);

      await service.list(TENANT, { search: 'security' });

      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('ILIKE');
      expect(mockSafeQuery.mock.calls[0][1]).toContain('%security%');
    });

    it('defaults to page 1 and pageSize 25', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.list(TENANT);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(25);
    });

    it('handles combined status and search filters', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [sampleCompliance], rowCount: 1 } as any);

      await service.list(TENANT, { status: 'compliant', search: 'policy' });

      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('status = $2');
      expect(countQuery).toContain('ILIKE $3');
      expect(mockSafeQuery.mock.calls[0][1]).toEqual([TENANT, 'compliant', '%policy%']);
    });

    it('propagates database errors', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('DB connection lost'));
      await expect(service.list(TENANT)).rejects.toThrow('DB connection lost');
    });
  });

  describe('getById', () => {
    it('returns compliance record when found', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [sampleCompliance], rowCount: 1 } as any);

      const result = await service.getById(TENANT, REQ_ID);

      expect(result).toEqual(sampleCompliance);
      expect(result!.requirement_id).toBe(REQ_ID);
      expect(result!.framework_name).toBe('ISO 27001');
      expect(mockSafeQuery).toHaveBeenCalledWith(
        expect.stringContaining('requirement_id = $2'),
        [TENANT, REQ_ID],
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
    it('inserts and returns new compliance requirement', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [sampleCompliance], rowCount: 1 } as any);

      const input: service.CreateComplianceInput = {
        framework_name: 'ISO 27001',
        title: 'Information security policies',
        framework_id: 'fw-iso27001',
        control_ref: 'A.5.1',
        status: 'compliant',
      };
      const result = await service.create(TENANT, input);

      expect(result).toEqual(sampleCompliance);
      const insertQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(insertQuery).toContain('INSERT INTO dos.compliance_requirements');
      expect(insertQuery).toContain('RETURNING');
      const params = mockSafeQuery.mock.calls[0][1] as unknown[];
      expect(params).toHaveLength(12); // id + tenant + 10 fields
    });

    it('propagates database errors on insert', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('unique violation'));
      await expect(
        service.create(TENANT, { framework_name: 'x', title: 'x' }),
      ).rejects.toThrow('unique violation');
    });
  });

  describe('update', () => {
    it('updates existing compliance record', async () => {
      const updated = { ...sampleCompliance, status: 'non_compliant' };
      mockSafeQuery.mockResolvedValueOnce({ rows: [sampleCompliance], rowCount: 1 } as any);
      mockSafeQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 } as any);

      const result = await service.update(TENANT, REQ_ID, { status: 'non_compliant' });

      expect(result).toEqual(updated);
      const updateQuery = mockSafeQuery.mock.calls[1][0] as string;
      expect(updateQuery).toContain('UPDATE dos.compliance_requirements SET');
      expect(updateQuery).toContain('updated_at = NOW()');
    });

    it('returns null for non-existent item', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.update(TENANT, 'nonexistent', { title: 'test' });

      expect(result).toBeNull();
    });

    it('returns existing when no fields to update', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [sampleCompliance], rowCount: 1 } as any);

      const result = await service.update(TENANT, REQ_ID, {});

      expect(result).toEqual(sampleCompliance);
      expect(mockSafeQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('soft-deletes item', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const result = await service.remove(TENANT, REQ_ID);

      expect(result).toBe(true);
      const deleteQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(deleteQuery).toContain('deleted_at = NOW()');
      expect(deleteQuery).toContain('is_deleted = true');
      expect(deleteQuery).toContain('dos.compliance_requirements');
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

      const result = await service.restore(TENANT, REQ_ID);

      expect(result).toBe(true);
      const restoreQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(restoreQuery).toContain('deleted_at = NULL');
      expect(restoreQuery).toContain('is_deleted = false');
    });
  });

  describe('bulkRemove', () => {
    it('returns 0 for empty id list', async () => {
      const result = await service.bulkRemove(TENANT, []);

      expect(result).toBe(0);
      expect(mockSafeQuery).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('returns total and byStatus breakdown', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 10 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ status: 'compliant', count: 7 }, { status: 'non_compliant', count: 3 }], rowCount: 2 } as any);

      const result = await service.getStats(TENANT);

      expect(result.total).toBe(10);
      expect(result.byStatus).toEqual({ compliant: 7, non_compliant: 3 });
    });

    it('returns zero stats on error', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('DB down'));

      const result = await service.getStats(TENANT);

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual({});
    });
  });
});
