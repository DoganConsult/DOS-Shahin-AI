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
import * as service from '../domain/asset.service';

const mockSafeQuery = vi.mocked(safeQuery);

const TENANT = 'tenant-001';
const ASSET_ID = 'asset-aaa-bbb-ccc';

const sampleAsset: service.AssetRecord = {
  asset_id: ASSET_ID,
  tenant_id: TENANT,
  name: 'Production DB Server',
  description: 'Primary PostgreSQL instance',
  type: 'server',
  category: 'infrastructure',
  status: 'active',
  criticality: 'high',
  owner_id: 'user-1',
  department_id: 'dept-eng',
  location: 'us-east-1',
  ip_address: '10.0.1.50',
  os_type: 'linux',
  vendor: 'Dell',
  classification: 'confidential',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
};

describe('AssetService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('returns paginated results from dos.assets', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 2 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [sampleAsset, { ...sampleAsset, asset_id: 'asset-2' }], rowCount: 2 } as any);

      const result = await service.list(TENANT, { page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('dos.assets');
    });

    it('applies status filter', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [sampleAsset], rowCount: 1 } as any);

      await service.list(TENANT, { status: 'active' });

      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('status = $2');
      expect(mockSafeQuery.mock.calls[0][1]).toEqual([TENANT, 'active']);
    });

    it('applies search filter with ILIKE', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [sampleAsset], rowCount: 1 } as any);

      await service.list(TENANT, { search: 'production' });

      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('ILIKE');
      expect(mockSafeQuery.mock.calls[0][1]).toContain('%production%');
    });

    it('defaults to page 1 and pageSize 25', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.list(TENANT);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(25);
    });

    it('excludes soft-deleted records', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await service.list(TENANT);

      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('deleted_at IS NULL');
    });

    it('propagates database errors', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('DB connection lost'));
      await expect(service.list(TENANT)).rejects.toThrow('DB connection lost');
    });
  });

  describe('getById', () => {
    it('returns asset when found', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [sampleAsset], rowCount: 1 } as any);

      const result = await service.getById(TENANT, ASSET_ID);

      expect(result).toEqual(sampleAsset);
      expect(result!.asset_id).toBe(ASSET_ID);
      expect(result!.os_type).toBe('linux');
      expect(mockSafeQuery).toHaveBeenCalledWith(
        expect.stringContaining('asset_id = $2'),
        [TENANT, ASSET_ID],
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
    it('inserts and returns new asset', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [sampleAsset], rowCount: 1 } as any);

      const input: service.CreateAssetInput = {
        name: 'Production DB Server',
        type: 'server',
        os_type: 'linux',
        category: 'infrastructure',
        status: 'active',
        criticality: 'high',
      };
      const result = await service.create(TENANT, input);

      expect(result).toEqual(sampleAsset);
      const insertQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(insertQuery).toContain('INSERT INTO dos.assets');
      expect(insertQuery).toContain('RETURNING');
      // 15 params: id + tenant + 13 input fields
      const params = mockSafeQuery.mock.calls[0][1] as unknown[];
      expect(params).toHaveLength(15);
    });

    it('propagates database errors on insert', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('unique violation'));
      await expect(
        service.create(TENANT, { name: 'x', type: 'x', os_type: 'x' }),
      ).rejects.toThrow('unique violation');
    });
  });

  describe('update', () => {
    it('updates existing asset', async () => {
      const updated = { ...sampleAsset, name: 'Staging DB Server' };
      mockSafeQuery.mockResolvedValueOnce({ rows: [sampleAsset], rowCount: 1 } as any);
      mockSafeQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 } as any);

      const result = await service.update(TENANT, ASSET_ID, { name: 'Staging DB Server' });

      expect(result).toEqual(updated);
      const updateQuery = mockSafeQuery.mock.calls[1][0] as string;
      expect(updateQuery).toContain('UPDATE dos.assets SET');
      expect(updateQuery).toContain('updated_at = NOW()');
    });

    it('returns null for non-existent item', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.update(TENANT, 'nonexistent', { name: 'test' });

      expect(result).toBeNull();
    });

    it('returns existing when no fields to update', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [sampleAsset], rowCount: 1 } as any);

      const result = await service.update(TENANT, ASSET_ID, {});

      expect(result).toEqual(sampleAsset);
      expect(mockSafeQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('soft-deletes item', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const result = await service.remove(TENANT, ASSET_ID);

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
    it('restores soft-deleted asset', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const result = await service.restore(TENANT, ASSET_ID);

      expect(result).toBe(true);
      const restoreQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(restoreQuery).toContain('deleted_at = NULL');
      expect(restoreQuery).toContain('is_deleted = false');
    });
  });

  describe('getStats', () => {
    it('returns total and byStatus breakdown', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 20 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ status: 'active', count: 15 }, { status: 'decommissioned', count: 5 }], rowCount: 2 } as any);

      const result = await service.getStats(TENANT);

      expect(result.total).toBe(20);
      expect(result.byStatus).toEqual({ active: 15, decommissioned: 5 });
    });

    it('returns zero stats on error', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('DB down'));

      const result = await service.getStats(TENANT);

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual({});
    });
  });
});
