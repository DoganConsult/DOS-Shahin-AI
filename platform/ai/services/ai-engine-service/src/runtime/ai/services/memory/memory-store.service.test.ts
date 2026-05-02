import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../config/database', () => ({
  safeQuery: vi.fn(),
  tenantSchema: vi.fn((id: string) => `tenant_${id}`),
}));
import { safeQuery } from '../../ports/database.port';

// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  query: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test')
}));
import { storeMemory, retrieveMemories, searchMemories, purgeExpiredMemories } from './memory-store.service';


// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  query: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test')
}));
describe('Memory Store Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Initialization', () => {
    it('should purge expired memories properly', async () => {
      (safeQuery as any).mockResolvedValue({ rows: [] } as any);
      await purgeExpiredMemories('tenant_1');
      expect(safeQuery).toHaveBeenCalled();
    });
  });

  describe('Memory Operations', () => {
    it('should safely store memory without errors', async () => {
      (safeQuery as any).mockResolvedValue({ rows: [] } as any);
      
      const res = await storeMemory({
        tenantId: 'tenant_1',
        agentId: 'A01',
        memoryType: 'agent' as any,
        content: 'preference data',
        importanceScore: 1
      });
      
      expect(safeQuery).toHaveBeenCalled();
      expect(res).toBe(null); // Because mock returns 0 rows safely
    });

    it('should retrieve memories for an agent', async () => {
      (safeQuery as any).mockResolvedValue({
        rows: [{
          memory_id: '123',
          agent_code: 'A01',
          tenant_id: 't1',
          scope: 'agent',
          key: 'pref',
          value: JSON.stringify({ ok: true }),
          importance: 5,
          token_count: 5,
          created_at: new Date().toISOString()
        }]
      } as any);

      const memories = await retrieveMemories({ tenantId: 't1', query: 'test' });
      expect(memories.length).toBe(1);
    });

    it('should safely handle search operations', async () => {
      (safeQuery as any).mockResolvedValue({ rows: [] } as any);
      
      const results = await searchMemories('tenant_1', { agentId: 'A01' });
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
