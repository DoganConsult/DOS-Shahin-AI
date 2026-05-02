import { describe, expect, it, vi, beforeEach } from 'vitest';

const published: any[] = [];
const runAgentCalls: Array<{ tenantId: string; agentId: string }> = [];
const safeQueryCalls: Array<string> = [];

vi.mock('@dos/platform-core/resilience/resilient-catch', () => ({
  catchHandler: () => (err: any) => err,
  EC: { EVENT_BUS: 'event_bus' },
}), { virtual: true });

vi.mock('@dos/db', () => ({
  getFirstRow: (r: any) => (r?.rows?.[0] ?? null),
}), { virtual: true });

vi.mock('../../services/ai-engine-service/src/runtime/ai/ports/platform.port', () => ({
  SYSTEM_TENANT: 'system',
  SYSTEM_JOB_ACTOR: 'system',
}), { virtual: true });

vi.mock('../../services/ai-engine-service/src/runtime/ai/ports/events.port', () => ({
  eventBus: { publish: (evt: any) => { published.push(evt); } },
}));

vi.mock('../../services/ai-engine-service/src/runtime/ai/ports/logger.port', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../services/ai-engine-service/src/runtime/ai/services/agents/core/agent-runner.service', () => ({
  runAgent: async (tenantId: string, agentId: string) => {
    runAgentCalls.push({ tenantId, agentId });
    return { agentId, tenantId, actionsProposed: 0, actionsExecuted: 0, summary: 'ok', durationMs: 1 };
  },
}));

vi.mock('../../services/ai-engine-service/src/runtime/ai/ports/database.port', () => {
  const safeQuery = vi.fn(async (sql: string, params?: any[]) => {
    safeQueryCalls.push(sql);
    if (sql.includes('SELECT * FROM "') && sql.includes('.event_trigger_binding') && sql.includes('WHERE tenant_id = $1')) {
      const tenantId = String(params?.[0] ?? '');
      const eventType = String(params?.[1] ?? '');
      if (eventType !== 'onboarding.answers.saved') return { rows: [], rowCount: 0 };
      return {
        rows: [
          {
            binding_id: `${tenantId}-b1`,
            tenant_id: tenantId,
            event_type: eventType,
            target_agent_id: 'A07',
            action_type: 'run_agent',
            condition_json: { answerType: { $in: ['risk'] } },
            enabled: true,
            cooldown_seconds: 0,
            last_triggered_at: null,
          },
          {
            binding_id: `${tenantId}-b2`,
            tenant_id: tenantId,
            event_type: eventType,
            target_agent_id: 'A02',
            action_type: 'run_agent',
            condition_json: { answerType: { $in: ['iam'] } },
            enabled: true,
            cooldown_seconds: 0,
            last_triggered_at: null,
          },
        ],
        rowCount: 2,
      };
    }
    return { rows: [], rowCount: 0 };
  });
  return {
    safeQuery,
    tenantSchema: (tenantId: string) => `tenant_${tenantId}`,
  };
});

describe('ai-event-trigger onboarding flow', () => {
  beforeEach(() => {
    published.length = 0;
    runAgentCalls.length = 0;
    safeQueryCalls.length = 0;
  });

  it('routes onboarding.answers.saved to the correct agent by answerType (single-tenant)', async () => {
    const { processEventTriggers } = await import('../../services/ai-engine-service/src/runtime/ai/services/workflow/ai-event-trigger.service');
    const triggered = await processEventTriggers('T1', 'onboarding.answers.saved', { answerType: 'risk' });
    expect(triggered).toBe(1);
    expect(runAgentCalls).toEqual([{ tenantId: 'T1', agentId: 'A07' }]);
    expect(published.some((e) => e?.eventType === 'ai.trigger.fired' && e?.tenantId === 'T1')).toBe(true);
  });

  it('seeds bindings idempotently per tenant', async () => {
    const { processEventTriggers } = await import('../../services/ai-engine-service/src/runtime/ai/services/workflow/ai-event-trigger.service');
    await processEventTriggers('T3', 'onboarding.answers.saved', { answerType: 'risk' });
    const insertsAfterFirst = safeQueryCalls.filter((s) => s.includes('INSERT INTO') && s.includes('event_trigger_binding')).length;
    expect(insertsAfterFirst).toBeGreaterThan(0);

    safeQueryCalls.length = 0;
    await processEventTriggers('T3', 'onboarding.answers.saved', { answerType: 'risk' });
    const insertsAfterSecond = safeQueryCalls.filter((s) => s.includes('INSERT INTO') && s.includes('event_trigger_binding')).length;
    expect(insertsAfterSecond).toBe(0);
  });

  it('enforces tenant isolation across trigger processing (multi-tenant)', async () => {
    const { processEventTriggers } = await import('../../services/ai-engine-service/src/runtime/ai/services/workflow/ai-event-trigger.service');
    await processEventTriggers('T1', 'onboarding.answers.saved', { answerType: 'risk' });
    await processEventTriggers('T2', 'onboarding.answers.saved', { answerType: 'iam' });
    expect(runAgentCalls).toEqual([
      { tenantId: 'T1', agentId: 'A07' },
      { tenantId: 'T2', agentId: 'A02' },
    ]);
  });
});
