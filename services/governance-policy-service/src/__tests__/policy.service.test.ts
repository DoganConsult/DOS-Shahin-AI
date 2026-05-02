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
import * as service from '../domain/policy.service';

const mockSafeQuery = vi.mocked(safeQuery);

const TENANT = 'tenant-001';
const POLICY_ID = 'policy-aaa-bbb-ccc';

const samplePolicy: service.PolicyRecord = {
  policy_id: POLICY_ID,
  tenant_id: TENANT,
  title: 'Acceptable Use Policy',
  description: 'Defines acceptable use of company resources',
  version: '2.1',
  status: 'published',
  category: 'security',
  owner_id: 'user-1',
  approver_id: 'user-2',
  effective_date: '2026-01-01',
  review_date: '2027-01-01',
  content: 'Full policy text goes here...',
  created_at: '2025-12-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
};

describe('PolicyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('returns paginated results from dos.policies', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 2 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [samplePolicy, { ...samplePolicy, policy_id: 'policy-2' }], rowCount: 2 } as any);

      const result = await service.list(TENANT, { page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('dos.policies');
    });

    it('applies status filter', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [samplePolicy], rowCount: 1 } as any);

      await service.list(TENANT, { status: 'published' });

      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('status = $2');
      expect(mockSafeQuery.mock.calls[0][1]).toEqual([TENANT, 'published']);
    });

    it('applies search filter', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [samplePolicy], rowCount: 1 } as any);

      await service.list(TENANT, { search: 'acceptable' });

      const countQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(countQuery).toContain('ILIKE');
      expect(mockSafeQuery.mock.calls[0][1]).toContain('%acceptable%');
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
    it('returns policy when found', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [samplePolicy], rowCount: 1 } as any);

      const result = await service.getById(TENANT, POLICY_ID);

      expect(result).toEqual(samplePolicy);
      expect(result!.policy_id).toBe(POLICY_ID);
      expect(result!.version).toBe('2.1');
      expect(mockSafeQuery).toHaveBeenCalledWith(
        expect.stringContaining('policy_id = $2'),
        [TENANT, POLICY_ID],
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
    it('inserts and returns new policy', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [samplePolicy], rowCount: 1 } as any);

      const input: service.CreatePolicyInput = {
        title: 'Acceptable Use Policy',
        category: 'security',
        version: '2.1',
        status: 'published',
      };
      const result = await service.create(TENANT, input);

      expect(result).toEqual(samplePolicy);
      const insertQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(insertQuery).toContain('INSERT INTO dos.policies');
      expect(insertQuery).toContain('RETURNING');
      const params = mockSafeQuery.mock.calls[0][1] as unknown[];
      expect(params).toHaveLength(12); // id + tenant + 10 fields
    });

    it('propagates database errors on insert', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('unique violation'));
      await expect(
        service.create(TENANT, { title: 'x', category: 'x' }),
      ).rejects.toThrow('unique violation');
    });
  });

  describe('update', () => {
    it('updates existing policy', async () => {
      const updated = { ...samplePolicy, version: '3.0' };
      mockSafeQuery.mockResolvedValueOnce({ rows: [samplePolicy], rowCount: 1 } as any);
      mockSafeQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 } as any);

      const result = await service.update(TENANT, POLICY_ID, { version: '3.0' });

      expect(result).toEqual(updated);
      const updateQuery = mockSafeQuery.mock.calls[1][0] as string;
      expect(updateQuery).toContain('UPDATE dos.policies SET');
      expect(updateQuery).toContain('updated_at = NOW()');
    });

    it('returns null for non-existent item', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.update(TENANT, 'nonexistent', { title: 'test' });

      expect(result).toBeNull();
    });

    it('returns existing when no fields to update', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [samplePolicy], rowCount: 1 } as any);

      const result = await service.update(TENANT, POLICY_ID, {});

      expect(result).toEqual(samplePolicy);
      expect(mockSafeQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('soft-deletes item', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const result = await service.remove(TENANT, POLICY_ID);

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
    it('restores soft-deleted policy and returns record', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [samplePolicy], rowCount: 1 } as any);

      const result = await service.restore(TENANT, POLICY_ID);

      expect(result).toEqual(samplePolicy);
      const restoreQuery = mockSafeQuery.mock.calls[0][0] as string;
      expect(restoreQuery).toContain('deleted_at = NULL');
      expect(restoreQuery).toContain('RETURNING');
    });

    it('returns null when policy not found', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.restore(TENANT, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    it('returns total and byStatus breakdown', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ total: 12 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ status: 'published', count: 8 }, { status: 'draft', count: 4 }], rowCount: 2 } as any);

      const result = await service.getStats(TENANT);

      expect(result.total).toBe(12);
      expect(result.byStatus).toEqual({ published: 8, draft: 4 });
    });

    it('returns zero stats on error', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('DB down'));

      const result = await service.getStats(TENANT);

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual({});
    });
  });
});
