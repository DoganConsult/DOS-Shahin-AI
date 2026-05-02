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
import * as service from '../domain/vendor.service';

const mockSafeQuery = vi.mocked(safeQuery);

const TENANT = 'tenant-001';
const VENDOR_ID = 'vendor-aaa-bbb-ccc';

const sampleVendor: service.VendorRecord = {
  vendor_id: VENDOR_ID,
  tenant_id: TENANT,
  name: 'CloudCorp Inc',
  description: 'Cloud infrastructure provider',
  category: 'technology',
  status: 'active',
  risk_tier: 'tier-1',
  contact_name: 'Jane Smith',
  contact_email: 'jane@cloudcorp.example',
  contract_start: '2025-01-01',
  contract_end: '2027-01-01',
  sla_score: 98.5,
  last_assessment_date: '2026-03-01',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
};

describe('VendorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('returns paginated results from dos.vendors', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 2 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [sampleVendor, { ...sampleVendor, vendor_id: 'vendor-2' }], rowCount: 2 } as any);

      const result = await service.list(TENANT, { page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('dos.vendors');
    });

    it('applies status filter', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [sampleVendor], rowCount: 1 } as any);

      await service.list(TENANT, { status: 'active' });

      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('status = $2');
      expect(mockSafeQuery.mock.calls[0][1]).toEqual([TENANT, 'active']);
    });

    it('applies search filter', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [sampleVendor], rowCount: 1 } as any);

      await service.list(TENANT, { search: 'cloud' });

      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('ILIKE');
      expect(mockSafeQuery.mock.calls[0][1]).toContain('%cloud%');
    });

    it('defaults to page 1 and pageSize 25', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.list(TENANT);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(25);
    });

    it('propagates database errors', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('DB connection lost'));
      await expect(service.list(TENANT)).rejects.toThrow('DB connection lost');
    });
  });

  describe('getById', () => {
    it('returns vendor when found', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [sampleVendor], rowCount: 1 } as any);

      const result = await service.getById(TENANT, VENDOR_ID);

      expect(result).toEqual(sampleVendor);
      expect(result!.vendor_id).toBe(VENDOR_ID);
      expect(result!.sla_score).toBe(98.5);
      expect(mockSafeQuery).toHaveBeenCalledWith(
        expect.stringContaining('vendor_id = $2'),
        [TENANT, VENDOR_ID],
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
    it('inserts and returns new vendor', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [sampleVendor], rowCount: 1 } as any);

      const input: service.CreateVendorInput = {
        name: 'CloudCorp Inc',
        category: 'technology',
        contact_name: 'Jane Smith',
        status: 'active',
        risk_tier: 'tier-1',
      };
      const result = await service.create(TENANT, input);

      expect(result).toEqual(sampleVendor);
      const insertQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(insertQuery).toContain('INSERT INTO dos.vendors');
      expect(insertQuery).toContain('RETURNING');
    });

    it('propagates database errors on insert', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('unique violation'));
      await expect(
        service.create(TENANT, { name: 'x', category: 'x', contact_name: 'x' }),
      ).rejects.toThrow('unique violation');
    });
  });

  describe('update', () => {
    it('updates existing vendor', async () => {
      const updated = { ...sampleVendor, name: 'CloudCorp v2' };
      mockSafeQuery.mockResolvedValueOnce({ rows: [sampleVendor], rowCount: 1 } as any);
      mockSafeQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 } as any);

      const result = await service.update(TENANT, VENDOR_ID, { name: 'CloudCorp v2' });

      expect(result).toEqual(updated);
      const updateQuery = mockSafeQuery.mock.calls[1][0] as string;
      expect(updateQuery).toContain('UPDATE dos.vendors SET');
      expect(updateQuery).toContain('updated_at = NOW()');
    });

    it('returns null for non-existent item', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.update(TENANT, 'nonexistent', { name: 'test' });

      expect(result).toBeNull();
    });

    it('returns existing when no fields to update', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [sampleVendor], rowCount: 1 } as any);

      const result = await service.update(TENANT, VENDOR_ID, {});

      expect(result).toEqual(sampleVendor);
      expect(mockSafeQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('soft-deletes item', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const result = await service.remove(TENANT, VENDOR_ID);

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
    it('restores soft-deleted vendor and returns record', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [sampleVendor], rowCount: 1 } as any);

      const result = await service.restore(TENANT, VENDOR_ID);

      expect(result).toEqual(sampleVendor);
      const restoreQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(restoreQuery).toContain('deleted_at = NULL');
      expect(restoreQuery).toContain('RETURNING');
    });

    it('returns null when vendor not found', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.restore(TENANT, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    it('returns total and byStatus breakdown', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 8 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ status: 'active', count: 6 }, { status: 'inactive', count: 2 }], rowCount: 2 } as any);

      const result = await service.getStats(TENANT);

      expect(result.total).toBe(8);
      expect(result.byStatus).toEqual({ active: 6, inactive: 2 });
    });

    it('returns zero stats on error', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('DB down'));

      const result = await service.getStats(TENANT);

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual({});
    });
  });
});
