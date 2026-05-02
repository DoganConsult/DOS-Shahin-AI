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

import { listRoleProfiles,getRoleProfileById,createRoleProfile,assignProfile,getUserProfileAssignments,listRoleFunctions,getRoleFunctionMappings,getRoleFunctionScopeMap } from './role-profiles.service';

describe('role-profiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('listRoleProfiles', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await listRoleProfiles('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await listRoleProfiles('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('getRoleProfileById', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await getRoleProfileById('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await getRoleProfileById('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('createRoleProfile', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await createRoleProfile('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await createRoleProfile('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('assignProfile', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await assignProfile('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await assignProfile('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('getUserProfileAssignments', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await getUserProfileAssignments('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await getUserProfileAssignments('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('listRoleFunctions', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await listRoleFunctions('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await listRoleFunctions('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('getRoleFunctionMappings', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await getRoleFunctionMappings('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await getRoleFunctionMappings('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('getRoleFunctionScopeMap', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await getRoleFunctionScopeMap('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await getRoleFunctionScopeMap('t-001' as never);
      expect(result).toBeDefined();
    });
  });

});
