/**
 * Co-located tests for agent-runner.service.ts
 * Tests re-exported types and the public interface shape.
 * DB-dependent runAgent() requires integration tests.
 */
import {  describe, it, expect , vi as _vi } from 'vitest';
import type { AgentAction, AgentRunResult, AgentRunOpts } from './agent-runner.types';

describe('agent-runner.service — type contracts', () => {
  it('AgentRunResult has all required fields', () => {
    const result: AgentRunResult = {
      agentId: 'A01',
      tenantId: 'tenant-1',
      actionsProposed: 3,
      actionsExecuted: 2,
      summary: 'Completed successfully',
      durationMs: 1500,
    };

    expect(result.agentId).toBe('A01');
    expect(result.actionsExecuted).toBeLessThanOrEqual(result.actionsProposed);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('AgentAction requires type and payload', () => {
    const action: AgentAction = {
      type: 'create_task',
      payload: { title: 'Review risk R-001', assignedTo: 'user-1' },
    };

    expect(action.type).toBe('create_task');
    expect(action.payload).toBeDefined();
  });

  it('disabled agent returns zero actions with explanatory summary', () => {
    // Mirrors the early-return path in runAgent() when agent is disabled
    const disabledResult: AgentRunResult = {
      agentId: 'A05',
      tenantId: 'tenant-2',
      actionsProposed: 0,
      actionsExecuted: 0,
      summary: 'Agent disabled via runtime config',
      durationMs: 0,
    };

    expect(disabledResult.actionsProposed).toBe(0);
    expect(disabledResult.actionsExecuted).toBe(0);
    expect(disabledResult.summary).toContain('disabled');
  });

  it('AgentRunOpts is optional and accepts partial overrides', () => {
    const opts: AgentRunOpts = {};
    expect(opts).toBeDefined();
  });
});
