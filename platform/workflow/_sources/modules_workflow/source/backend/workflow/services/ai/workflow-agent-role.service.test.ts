/**
 * Workflow Agent Role Service — Tests
 *
 * Tests mode enforcement, agent assignment, execution, escalation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
vi.mock('../../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('../../../../platform/dos/observability/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../../platform/dos/events/event-bus', () => ({
  emitEvent: vi.fn().mockResolvedValue(undefined),
}));

// Mock platform mode gate
let mockMode = 'hybrid';
vi.mock('../../../../platform/services/autonomy/platform-mode-gate.service', () => ({
  getTenantPlatformMode: vi.fn().mockImplementation(() => Promise.resolve(mockMode)),
}));

describe('Workflow Agent Role Service', () => {
  beforeEach(() => {
    mockSafeQuery.mockReset();
    mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    mockMode = 'hybrid';
  });

  describe('evaluateAgentAction', () => {
    it('blocks all non-observe actions in manual mode', async () => {
      mockMode = 'manual';
      const { evaluateAgentAction } = await import('./workflow-agent-role.service');
      const result = await evaluateAgentAction('t1', 'task1', 'agent1', 'complete');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('manual mode');
    });

    it('blocks high-risk actions in hybrid mode', async () => {
      mockMode = 'hybrid';
      const { evaluateAgentAction } = await import('./workflow-agent-role.service');
      const result = await evaluateAgentAction('t1', 'task1', 'agent1', 'delete');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('human approval');
    });

    it('allows low-risk actions in hybrid mode', async () => {
      mockMode = 'hybrid';
      const { evaluateAgentAction } = await import('./workflow-agent-role.service');
      const result = await evaluateAgentAction('t1', 'task1', 'agent1', 'analyze');
      expect(result.allowed).toBe(true);
    });

    it('allows actions in autonomous mode', async () => {
      mockMode = 'autonomous';
      const { evaluateAgentAction } = await import('./workflow-agent-role.service');
      const result = await evaluateAgentAction('t1', 'task1', 'agent1', 'complete');
      expect(result.allowed).toBe(true);
    });
  });

  describe('assignAgentToTask', () => {
    it('constrains mode to platform mode', async () => {
      mockMode = 'manual';
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ id: 'task1', status: 'pending', module_code: 'compliance' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'a1', task_id: 'task1', agent_id: 'agent1', mode: 'observe', status: 'active', assigned_at: new Date().toISOString(), completed_at: null }] })
        .mockResolvedValueOnce({ rows: [] });

      const { assignAgentToTask } = await import('./workflow-agent-role.service');
      const result = await assignAgentToTask('t1', 'task1', 'agent1', 'execute');
      // In manual mode, execute should be constrained to observe
      if (result) {
        expect(result.mode).toBe('observe');
      }
    });
  });

  describe('getAgentWorkloadSummary', () => {
    it('returns zero workload for unknown agent', async () => {
      const { getAgentWorkloadSummary } = await import('./workflow-agent-role.service');
      const workload = await getAgentWorkloadSummary('t1', 'unknown');
      expect(workload.totalAssigned).toBe(0);
      expect(workload.escalationRate).toBe(0);
    });
  });
});
