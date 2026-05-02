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

import { checkAgentSodDelegation } from './agent-sod-delegation.service';

describe('agent-sod-delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('checkAgentSodDelegation', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await checkAgentSodDelegation({
        tenantId: 't-001',
        agentId: 'agent-1',
        principalId: 'user-1',
        actionType: 'suggest',
      });
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await checkAgentSodDelegation({
        tenantId: 't-001',
        agentId: 'agent-1',
        principalId: 'user-1',
        actionType: 'approve',
        entityType: 'organization',
        entityId: 'org-1',
        requiredPermissions: ['foundation.org.approve'],
      });
      expect(result).toBeDefined();
    });

    it('blocks approval when prior delegated non-approval action exists for same entity', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ action_id: 'a-1' }], rowCount: 1 });
      const result = await checkAgentSodDelegation({
        tenantId: 't-001',
        agentId: 'agent-1',
        principalId: 'user-1',
        actionType: 'approve',
        entityType: 'organization',
        entityId: 'org-1',
        requiredPermissions: ['foundation.org.approve'],
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('delegated_self_approval_prevented');
    });
  });

});
