import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

import { getActor, registerActor, type Actor } from './actor-registry';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [] });
});

describe('DAuth ActorRegistry', () => {
  describe('getActor', () => {
    it('returns null when actor not found', async () => {
      expect(await getActor('t1', 'a-missing')).toBeNull();
    });

    it('returns mapped actor when found', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{
        actor_id: 'a-001', actor_type: 'human', user_id: 'u-001',
        display_name: 'Alice', tenant_id: 't1', is_active: true,
      }] });
      const actor = await getActor('t1', 'a-001');
      expect(actor).toEqual({
        actorId: 'a-001', type: 'human', userId: 'u-001',
        displayName: 'Alice', tenantId: 't1', isActive: true,
      });
    });

    it('queries correct schema', async () => {
      await getActor('t1', 'a-001');
      const [sql] = mockSafeQuery.mock.calls[0];
      expect(sql).toContain('"tenant_t1".actor_registry');
    });
  });

  describe('registerActor', () => {
    it('inserts actor and returns with isActive=true', async () => {
      const input: Omit<Actor, 'isActive'> = {
        actorId: 'a-new', type: 'agent', userId: 'u-001',
        displayName: 'Bot', tenantId: 't1',
      };
      const result = await registerActor('t1', input);
      expect(result.isActive).toBe(true);
      expect(result.actorId).toBe('a-new');
      const [sql] = mockSafeQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO');
      expect(sql).toContain('ON CONFLICT');
    });
  });
});
