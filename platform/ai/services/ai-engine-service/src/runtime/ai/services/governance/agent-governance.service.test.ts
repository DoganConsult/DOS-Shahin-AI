import { describe, it, expect, vi, beforeEach } from 'vitest';

// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  withTransaction: vi.fn().mockImplementation(async (cb: any) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  query: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn((id: string) => `tenant_${id}`)
}));

vi.mock('../../ports/events.port', () => ({
  eventBus: { publish: vi.fn(), subscribe: vi.fn() },
  emitEvent: vi.fn().mockResolvedValue({}),
}));

import { safeQuery } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import {
  checkToolPermission,
  createHITLGate,
  resolveHITLGate,
  expireOverdueGates,
  getAgentAuditTrail,
} from './agent-governance.service';

describe('Agent Governance Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkToolPermission', () => {
    it('should grant access if specific allow permission exists', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ permission_id: '1', level: 'allow', conditions: null }],
      } as any);

      const res = await checkToolPermission('t1', 'a1', 'read_data', 'read');
      expect(res.allowed).toBe(true);
      expect(res.requiresApproval).toBe(false);
      expect(safeQuery).toHaveBeenCalled(); // Fetch perm
      expect(safeQuery).toHaveBeenCalledTimes(2); // Fetch perm + write audit log
    });

    it('should deny access if time restriction condition fails', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{
          permission_id: '1',
          level: 'allow',
          conditions: JSON.stringify({ allowedHours: { start: 1, end: 2 } }),
        }],
      } as any);

      // We assume current UTC hour is rarely perfectly 1-2 UTC unless we mock it, 
      // but let's mock the date or just assume it fails if we mock Date
      const origDate = global.Date;
      const mockDate = new Date('2023-01-01T12:00:00Z'); // Hour 12
      global.Date = class extends Date {
        constructor() { super(); return mockDate; }
      } as any;

      const res = await checkToolPermission('t1', 'a1', 'read_data', 'read');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('restricted outside hours 1:00-2:00 UTC');
      
      global.Date = origDate;
    });

    it('should fall back to default deny if no permissions found', async () => {
      (safeQuery as any).mockResolvedValue({ rows: [] } as any); // Returns [] for both specific and wildcard

      const res = await checkToolPermission('t1', 'a1', 'test_tool', 'execute');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('No permission found');
    });
  });

  describe('HITL Gates', () => {
    it('should create a pending gate', async () => {
      (safeQuery as any).mockResolvedValue({ rows: [] } as any); // for audit layer

      const gate = await createHITLGate('t1', {
        agentId: 'a1',
        toolName: 'destructive_tool',
        action: 'execute',
      });

      expect(gate.status).toBe('pending');
      expect(gate.toolName).toBe('destructive_tool');
      expect(safeQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "tenant_t1".hitl_gates'),
        expect.any(Array)
      );
      expect(eventBus.publish).toHaveBeenCalledWith('gate.blocked', expect.any(Object));
    });

    it('should resolve gate with approval and fire event', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ gate_id: 'g1', status: 'pending', expires_at: new Date('2099-01-01Z').toISOString() }]
      } as any); // Exists
      (safeQuery as any).mockResolvedValueOnce({ rows: [] } as any); // Update
      (safeQuery as any).mockResolvedValueOnce({ rows: [] } as any); // Audit Log
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ gate_id: 'g1', status: 'approved' }]
      } as any); // Fetch updated

      const gate = await resolveHITLGate('t1', 'g1', 'approved', 'admin_user');
      expect(gate?.status).toBe('approved');
      expect(eventBus.publish).toHaveBeenCalledWith('gate.allowed', expect.objectContaining({ decision: 'approved' }));
    });

    it('should fail to resolve expired gate', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ gate_id: 'g1', status: 'pending', expires_at: new Date('2000-01-01Z').toISOString() }]
      } as any); // Exists but expired

      await expect(resolveHITLGate('t1', 'g1', 'approved', 'u1'))
        .rejects.toThrow('has expired');
    });

    it('should expire overdue gates', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [
          { gate_id: 'g1', agent_id: 'a1', tool_name: 't1', action: 'a' }
        ]
      } as any); // The UPDATE ... RETURNING query

      const count = await expireOverdueGates('t1');
      expect(count).toBe(1);
      expect(eventBus.publish).toHaveBeenCalledWith('gate.blocked', expect.objectContaining({ type: 'hitl_gate_expired' }));
    });
  });

  describe('Audit Trail', () => {
    it('should combine and sort audit entries', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ entry_id: '1', entry_type: 'perm', created_at: '2023-01-01T00:00:00Z' }]
      } as any);
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ gate_id: 'g1', decision: 'approved', created_at: '2023-01-02T00:00:00Z' }]
      } as any);
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ entry_id: 'c1', step_name: 'think', outcome: 'ok', created_at: '2023-01-03T00:00:00Z' }]
      } as any);

      const trail = await getAgentAuditTrail('t1', 'a1');
      expect(trail.length).toBe(3);
      expect(trail[0].entryId).toBe('c1'); // Newest first
      expect(trail[2].entryId).toBe('1');
    });
  });
});
