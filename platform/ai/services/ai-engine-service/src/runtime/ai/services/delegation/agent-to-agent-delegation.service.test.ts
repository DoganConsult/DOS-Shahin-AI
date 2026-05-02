import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [{ delegation_id: 'mock-123' }] }),
  tenantSchema: vi.fn().mockReturnValue('test_tenant'),
  recordAudit: vi.fn().mockResolvedValue({}),
  runAgentWithTools: vi.fn(),
  publishEvent: vi.fn().mockResolvedValue({})
}));

vi.mock('../../ports/database.port', () => ({
  safeQuery: mocks.safeQuery,
  tenantSchema: mocks.tenantSchema
}));

vi.mock('../../ports/events.port', () => ({
  emitEvent: mocks.publishEvent
}));

vi.mock('../../../../../../../modules/audit/dist/audit/services/audit/core/audit-trail.service', () => ({
  recordAudit: mocks.recordAudit
}));

vi.doMock('../agents/core/agent-tool-executor.service', () => ({
  runAgentWithTools: mocks.runAgentWithTools
}));

import * as delegationService from './agent-to-agent-delegation.service';

describe('Agent Delegation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Happy path delegation: executes orchestrator and updates DB', async () => {
    mocks.runAgentWithTools.mockResolvedValueOnce({ finalText: 'Task done', discoveries: [{ fact: 'true' }] });

    const result = await delegationService.delegateToAgent('tenant-1', 'A01', 'A07', {
      taskType: 'test', taskDescription: 'Do it', context: {}, priority: 'medium', expectedOutcome: 'Success'
    });

    expect(mocks.safeQuery.mock.calls.length).toBeGreaterThanOrEqual(2); // DDL + INSERT + UPDATE
    expect(mocks.publishEvent).toHaveBeenCalledTimes(3); // Started, Audit, Executed
    
    // Assert Start payload
    expect(mocks.publishEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      event: 'ai.delegation.action_started',
      tenantId: 'tenant-1',
      entityId: result.delegationId
    }));

    // Assert Audit event (replaces direct recordAudit import)
    expect(mocks.publishEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      event: 'audit.recorded',
      tenantId: 'tenant-1',
    }));
    
    // Assert Complete payload
    expect(mocks.publishEvent).toHaveBeenNthCalledWith(3, expect.objectContaining({
      event: 'ai.delegation.action_executed',
      tenantId: 'tenant-1',
      entityId: result.delegationId,
      data: expect.objectContaining({ status: 'completed' })
    }));
    
    expect(result.status).toBe('completed');
    expect(typeof result.executionResult).toBe('object');
    expect(result.executionResult.raw_text).toContain('Task done');
  });

  it('2. Failure path: execution throws error', async () => {
    mocks.runAgentWithTools.mockRejectedValueOnce(new Error('Simulated failure'));

    const result = await delegationService.delegateToAgent('tenant-1', 'A01', 'A07', {
      taskType: 'test', taskDescription: '', context: {}, priority: 'high', expectedOutcome: ''
    });

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('Simulated failure');
    // Ensure DB is updated to failed
    expect(mocks.safeQuery).toHaveBeenLastCalledWith(
      expect.stringContaining('UPDATE'),
      expect.arrayContaining(['failed', expect.anything(), expect.stringContaining('Simulated failure'), expect.anything()])
    );
    
    // ensure failure is reflected in event
    expect(mocks.publishEvent).toHaveBeenLastCalledWith(expect.objectContaining({
      event: 'ai.delegation.action_executed',
      data: expect.objectContaining({ status: 'failed' })
    }));
  });
  
  it('3. Timeout path: orchestrator hangs and abort signal fires', async () => {
    vi.useFakeTimers();
    // Mock runAgentWithTools to hang but respect the abort signal
    mocks.runAgentWithTools.mockImplementationOnce((_t: any, _a: any, _c: any, _m: any, opts: any) => {
      return new Promise((_, reject) => {
        const signal = opts?.signal as AbortSignal | undefined;
        if (signal) {
          signal.addEventListener('abort', () => reject(new Error('DELEGATION_TIMEOUT: aborted')));
        }
        // Also set a fallback timeout that would resolve way later
        setTimeout(() => reject(new Error('should not reach')), 200000);
      });
    });

    const promise = delegationService.delegateToAgent('tenant-1', 'A01', 'A07', {
      taskType: 'test', taskDescription: 'Hang', context: {}, priority: 'high', expectedOutcome: ''
    });

    // Advance timers past the 120s abort timeout
    await vi.advanceTimersByTimeAsync(125000);

    const result = await promise;

    expect(result.status).toBe('timed_out');
    expect(result.errorMessage).toContain('DELEGATION_TIMEOUT');
    vi.useRealTimers();
  });

  it('4. Guardrail path: logs blocked delegation properly', async () => {
    await delegationService.logBlockedDelegation('tenant-1', 'A01', 'A07', 'max_depth_exceeded');
    
    expect(mocks.safeQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT'),
      expect.arrayContaining([expect.anything(), 'tenant-1', 'A01', 'A07', expect.stringContaining('max_depth_exceeded')])
    );
  });
});
