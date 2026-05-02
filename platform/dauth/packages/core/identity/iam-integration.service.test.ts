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

import { listIamConnections,getIamConnection,createIamConnection,updateIamConnectionStatus,listIamIdentities,linkIamIdentity,listIamAccessReviews,logIamSync } from './iam-integration.service';

describe('iam-integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('listIamConnections', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await listIamConnections('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await listIamConnections('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('getIamConnection', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await getIamConnection('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await getIamConnection('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('createIamConnection', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await createIamConnection('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await createIamConnection('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('updateIamConnectionStatus', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await updateIamConnectionStatus('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await updateIamConnectionStatus('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('listIamIdentities', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await listIamIdentities('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await listIamIdentities('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('linkIamIdentity', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await linkIamIdentity('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await linkIamIdentity('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('listIamAccessReviews', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await listIamAccessReviews('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await listIamAccessReviews('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('logIamSync', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await logIamSync('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await logIamSync('t-001' as never);
      expect(result).toBeDefined();
    });
  });

});
