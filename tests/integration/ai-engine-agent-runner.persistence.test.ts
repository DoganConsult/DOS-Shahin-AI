import { describe, expect, it, vi, beforeEach } from 'vitest';

const sqlCalls: Array<{ sql: string; params: any[] }> = [];
const published: any[] = [];
const runAgentWithToolsMock = vi.fn(async () => ({
  totalToolCalls: 2,
  toolResults: [{ isError: false }, { isError: true }],
  finalText: 'ok',
}));

vi.mock('@dos/module-sdk', () => ({
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}), { virtual: true });

vi.mock('@dos/platform-core/resilience/resilient-catch', () => ({
  swallow: (_ec: any, fn: any) => fn,
  EC: { EVENT_BUS: 'event_bus' },
}), { virtual: true });

vi.mock('../../services/ai-engine-service/src/runtime/ai/ports/events.port', () => ({
  eventBus: { publish: (evt: any) => { published.push(evt); } },
}));

vi.mock('../../services/ai-engine-service/src/runtime/ai/ports/logger.port', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../services/ai-engine-service/src/runtime/ai/ports/ai.port', () => ({
  loadAgentDef: () => ({ id: 'A07', name: 'A07' }),
}));

vi.mock('../../services/ai-engine-service/src/runtime/ai/services/agents/core/ai-agent-config.service', () => ({
  canAgentExecute: async () => ({ allowed: true }),
}));

vi.mock('../../services/ai-engine-service/src/runtime/ai/services/orchestration/agent-context-builders.service', () => ({
  isAgentModuleActive: async () => ({ active: true, reason: null }),
  CONTEXT_BUILDERS: {},
  loadGovernanceContext: async () => ({}),
  loadAgentPlaybooks: async () => ([]),
}));

vi.mock('../../services/ai-engine-service/src/runtime/ai/services/agents/agent-cooperation.service.js', () => ({
  getPendingHandoffs: async () => ([]),
}));

vi.mock('../../services/ai-engine-service/src/runtime/ai/services/agents/core/agent-tool-executor.service', () => ({
  runAgentWithTools: runAgentWithToolsMock,
}));

vi.mock('../../services/ai-engine-service/src/runtime/ai/ports/database.port', () => ({
  tenantSchema: (tenantId: string) => `tenant_${tenantId}`,
  safeQuery: async (sql: string, params?: any[]) => {
    sqlCalls.push({ sql, params: params || [] });
    if (sql.includes('INSERT INTO "tenant_T1".ai_agent_executions')) {
      return { rows: [{ execution_id: 'exec-1' }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  },
}));

describe('agent-runner persistence + events', () => {
  beforeEach(() => {
    sqlCalls.length = 0;
    published.length = 0;
    runAgentWithToolsMock.mockReset();
    runAgentWithToolsMock.mockResolvedValue({
      totalToolCalls: 2,
      toolResults: [{ isError: false }, { isError: true }],
      finalText: 'ok',
    });
  });

  it('persists completion and publishes ai.agent.completed', async () => {
    const { runAgent } = await import('../../services/ai-engine-service/src/runtime/ai/services/agents/core/agent-runner.service');
    const res = await runAgent('T1', 'A07', { query: 'x' });
    expect(res.summary).toBe('ok');
    expect(sqlCalls.some((c) => c.sql.includes('INSERT INTO "tenant_T1".ai_agent_executions'))).toBe(true);
    expect(sqlCalls.some((c) => c.sql.includes('UPDATE "tenant_T1".ai_agent_executions') && c.sql.includes("status = 'completed'"))).toBe(true);
    expect(published.some((e) => e?.eventType === 'ai.agent.completed' && e?.tenantId === 'T1')).toBe(true);
  });

  it('persists failure and publishes ai.agent.failed', async () => {
    runAgentWithToolsMock.mockRejectedValueOnce(new Error('boom'));
    const { runAgent } = await import('../../services/ai-engine-service/src/runtime/ai/services/agents/core/agent-runner.service');
    const res = await runAgent('T1', 'A07', { query: 'x' });
    expect(res.summary).toContain('Failed to execute agent A07');
    expect(sqlCalls.some((c) => c.sql.includes('UPDATE "tenant_T1".ai_agent_executions') && c.sql.includes("status = 'failed'"))).toBe(true);
    expect(published.some((e) => e?.eventType === 'ai.agent.failed' && e?.tenantId === 'T1')).toBe(true);
  });
});
