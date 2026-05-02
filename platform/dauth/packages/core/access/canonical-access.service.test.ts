import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
const mockQuery = vi.fn();
vi.mock('@dos/db', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('@dos/platform-core/events', () => ({
  publish: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@dos/platform-core/resilience', () => ({
  catchHandler: () => () => {},
  EC: { EVENT_BUS: 'EVENT_BUS', DB_CLEANUP: 'DB_CLEANUP' },
}));

import { invalidateSnapshotCache,clearSnapshotCache,getCachedBootstrapData,resolveAccessSnapshot } from './canonical-access.service';

describe('canonical-access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('invalidateSnapshotCache', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await invalidateSnapshotCache('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await invalidateSnapshotCache('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('clearSnapshotCache', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await clearSnapshotCache('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await clearSnapshotCache('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('getCachedBootstrapData', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await getCachedBootstrapData('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await getCachedBootstrapData('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('resolveAccessSnapshot', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await resolveAccessSnapshot('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await resolveAccessSnapshot('t-001' as never);
      expect(result).toBeDefined();
    });
  });

});
