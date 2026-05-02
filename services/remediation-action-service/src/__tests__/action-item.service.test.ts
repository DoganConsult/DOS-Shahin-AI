import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@dos/db', () => ({
  safeQuery: vi.fn(),
  // Sibling exports the service layer resolves at module-load time.
  // Without these the whole test file's imports fail.
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

vi.mock('../events/publisher', () => ({
  setServiceBus: vi.fn(),
  publishDomainEvent: vi.fn().mockResolvedValue(undefined),
  publishRemediationCreated: vi.fn().mockResolvedValue(undefined),
  publishRemediationCompleted: vi.fn().mockResolvedValue(undefined),
  publishActionCreated: vi.fn().mockResolvedValue(undefined),
  publishActionCompleted: vi.fn().mockResolvedValue(undefined),
  publishActionOverdue: vi.fn().mockResolvedValue(undefined),
}));

import { safeQuery } from '@dos/db';
import * as svc from '../domain/action-item.service';

const mockQuery = safeQuery as ReturnType<typeof vi.fn>;
const TENANT = 'tenant-001';

describe('action-item.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('returns paginated results', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: 2 }] })
        .mockResolvedValueOnce({ rows: [{ id: '1' }, { id: '2' }] });
      const result = await svc.list(TENANT);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(mockQuery).toHaveBeenCalled();
    });

    it('applies status filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: '1' }] });
      const result = await svc.list(TENANT, { status: 'active' });
      expect(result.data).toBeDefined();
    });

    it('applies search filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: 0 }] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await svc.list(TENANT, { search: 'test' });
      expect(result.data).toEqual([]);
    });

    it('handles pagination boundaries', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: 100 }] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await svc.list(TENANT, { page: 5, pageSize: 10 });
      expect(result.page).toBe(5);
      expect(result.pageSize).toBe(10);
    });

    it('propagates database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));
      await expect(svc.list(TENANT)).rejects.toThrow('DB connection lost');
    });
  });

  describe('getById', () => {
    it('returns record when found', async () => {
      const record = { id: 'r1', tenant_id: TENANT, title: 'Test' };
      mockQuery.mockResolvedValueOnce({ rows: [record] });
      const result = await svc.getById(TENANT, 'r1');
      expect(result).toEqual(record);
    });

    it('returns null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await svc.getById(TENANT, 'nonexistent');
      expect(result).toBeNull();
    });

    it('propagates database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('timeout'));
      await expect(svc.getById(TENANT, 'r1')).rejects.toThrow('timeout');
    });
  });

  describe('create', () => {
    it('inserts and returns new record', async () => {
      const created = { id: 'new-1', tenant_id: TENANT };
      mockQuery.mockResolvedValueOnce({ rows: [created] });
      const result = await svc.create(TENANT, { title: 'test-title', priority: 'test-priority' } as any);
      expect(result).toEqual(created);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array),
      );
    });

    it('propagates database errors on insert', async () => {
      mockQuery.mockRejectedValueOnce(new Error('unique violation'));
      await expect(svc.create(TENANT, { title: 'x', priority: 'x' } as any)).rejects.toThrow('unique violation');
    });
  });

  describe('update', () => {
    it('updates existing record', async () => {
      const existing = { id: 'r1', tenant_id: TENANT, title: 'Old' };
      const updated = { ...existing, title: 'New' };
      mockQuery
        .mockResolvedValueOnce({ rows: [existing] })
        .mockResolvedValueOnce({ rows: [updated] });
      const result = await svc.update(TENANT, 'r1', { title: 'New' } as any);
      expect(result).toEqual(updated);
    });

    it('returns null for non-existent record', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await svc.update(TENANT, 'missing', { title: 'New' } as any);
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('deletes existing record', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
      const result = await svc.remove(TENANT, 'r1');
      expect(result).toBe(true);
    });

    it('returns false for non-existent record', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });
      const result = await svc.remove(TENANT, 'missing');
      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('returns aggregated stats', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: 5 }] })
        .mockResolvedValueOnce({ rows: [{ status: 'open', count: 3 }, { status: 'closed', count: 2 }] });
      const result = await svc.getStats(TENANT);
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('byStatus');
    });
  });
});
