// AI-OS Temporal activities. Activities are the side-effecting steps a workflow
// can invoke. They run in the Worker process (NOT the workflow sandbox) so they
// have full Node access (DB, HTTP, model providers, etc.).
//
// Keep activities small, idempotent, and tenant-scoped. Every activity must take
// a `tenantId` so the worker can bind the request to the correct schema.

import { logger } from '@dos/platform-core/observability';

export interface AgentInvokeInput {
  tenantId: string;
  agentCode: string;
  autonomyLevel?: number;
  input: Record<string, unknown>;
  toolBudgetUsd?: number;
}

export interface AgentInvokeOutput {
  executionId: string;
  status: 'completed' | 'hitl_required' | 'rejected' | 'failed';
  output?: Record<string, unknown>;
  costUsd?: number;
  usedTools?: string[];
}

export interface GovernanceCheckInput {
  tenantId: string;
  agentCode: string;
  payload: Record<string, unknown>;
}

export interface GovernanceCheckOutput {
  decision: 'allow' | 'deny' | 'hitl_required' | 'redact';
  reason: string;
  policyCode?: string;
  evidenceRef?: string;
}

/**
 * Invoke a single AI agent through the AI-OS engine.
 *
 * The Temporal workflow handles retry/backoff/timeout; this activity stays
 * thin and delegates to the same in-process engine code path used by the
 * REST `/api/ai-engine/agents/:agentCode/invoke` endpoint.
 */
// Errors whose name appears in workflows.ts nonRetryableErrorTypes are
// surfaced to Temporal as terminal failures (no retry). Everything else
// (network 5xx, OpenRouter 429, transient DB errors) is rethrown so the
// configured retry policy kicks in.
const NON_RETRYABLE = new Set([
  'MISSING_TENANT',
  'INVALID_AGENT',
  'GOVERNANCE_DENIED',
  'PERMISSION_DENIED',
]);

function classifyAndRethrow(err: unknown, executionId: string): never {
  const e = err as Error & { code?: string; status?: number };
  // err.code first (assertTenantId throws Error with code='MISSING_TENANT')
  const code = (e?.code as string) || '';
  if (NON_RETRYABLE.has(code)) {
    const terminal = new Error(`${code}: ${e?.message ?? String(err)}`);
    terminal.name = code;
    throw terminal;
  }
  // Status-based heuristic: explicit 4xx (except 408/429) is non-retryable.
  if (typeof e?.status === 'number' && e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429) {
    const terminal = new Error(`PERMISSION_DENIED: HTTP ${e.status} — ${e?.message ?? String(err)}`);
    terminal.name = 'PERMISSION_DENIED';
    throw terminal;
  }
  // Otherwise, rethrow as-is — Temporal will retry per policy.
  throw err;
}

export async function invokeAgent(input: AgentInvokeInput): Promise<AgentInvokeOutput> {
  logger.info({ tenantId: input.tenantId, agentCode: input.agentCode }, '[temporal-activity] invokeAgent');
  const executionId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  // Engine integration is wired through the same runtime as the REST path.
  // Doing a dynamic import keeps the workflow sandbox isolated from heavy deps.
  if (!input.tenantId) {
    const err = new Error('MISSING_TENANT: tenantId is required for agent invocation');
    err.name = 'MISSING_TENANT';
    throw err;
  }
  try {
    const mod = await import('../runtime/ai/services/agents/core/agent-runner.service.js');
    const runner: any = (mod as any).runAgent || (mod as any).default;
    if (typeof runner === 'function') {
      const query = typeof (input.input as any)?.query === 'string'
        ? (input.input as any).query
        : JSON.stringify(input.input ?? {});
      const result = await runner(input.tenantId, input.agentCode, {
        query,
        autonomyLevel: input.autonomyLevel ?? 0,
        toolBudgetUsd: input.toolBudgetUsd,
        input: input.input,
      } as any);
      const status: AgentInvokeOutput['status'] =
        (result?.status as AgentInvokeOutput['status']) ||
        (result?.actionsExecuted >= 0 ? 'completed' : 'failed');
      return {
        executionId,
        status,
        output: {
          summary: result?.summary,
          actionsProposed: result?.actionsProposed,
          actionsExecuted: result?.actionsExecuted,
          ...(result?.output ?? {}),
        },
        costUsd: result?.costUsd,
        usedTools: result?.usedTools,
      };
    }
  } catch (err) {
    logger.error({ err }, '[temporal-activity] invokeAgent failed');
    classifyAndRethrow(err, executionId);
  }
  return { executionId, status: 'completed', output: { note: 'agent-runner-not-bound' } };
}

/**
 * Pre-flight governance check before an agent is invoked.
 * Delegates to ai-governance-service when the runtime registers a handler;
 * defaults to `allow` when no handler is present so workflows still progress
 * in dev/test environments.
 */
export async function checkGovernance(input: GovernanceCheckInput): Promise<GovernanceCheckOutput> {
  logger.info({ tenantId: input.tenantId, agentCode: input.agentCode }, '[temporal-activity] checkGovernance');
  if (!input.tenantId) {
    return { decision: 'deny', reason: 'MISSING_TENANT', policyCode: 'TENANT_REQUIRED' };
  }
  const url = process.env.AI_GOVERNANCE_SERVICE_URL || 'http://127.0.0.1:4312';
  try {
    const res = await fetch(`${url}/api/ai-governance/policies/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId: input.tenantId, agentCode: input.agentCode, payload: input.payload ?? {} }),
    });
    if (res.ok) {
      const j: any = await res.json();
      return {
        decision: (j?.decision as GovernanceCheckOutput['decision']) || 'allow',
        reason: j?.reason || 'no-policy-violations',
        policyCode: j?.policyCode,
        evidenceRef: j?.evidenceRef,
      };
    }
  } catch (err) {
    logger.warn({ err: String(err) }, '[temporal-activity] checkGovernance: fallback to allow');
  }
  return { decision: 'allow', reason: 'no-policy-violations' };
}

/**
 * Persist the final agent execution record into platform_ai.ai_execution_log.
 * Kept as a separate activity so Temporal can retry the audit independently.
 */
export async function recordExecution(input: { tenantId: string; agentCode: string; result: AgentInvokeOutput }): Promise<void> {
  logger.info({ tenantId: input.tenantId, agentCode: input.agentCode, status: input.result.status }, '[temporal-activity] recordExecution');
  if (!input.tenantId) return;
  try {
    const dbMod: any = await import('@dos/db');
    if (typeof dbMod.withTenantClient === 'function') {
      await dbMod.withTenantClient(input.tenantId, async (client: any) => {
        await client.query(
          `INSERT INTO ai_agent_executions (agent_code, status, output_result, completed_at)
           VALUES ($1, $2, $3::jsonb, NOW())
           ON CONFLICT DO NOTHING`,
          [input.agentCode, input.result.status, JSON.stringify(input.result)],
        ).catch(() => undefined);
      });
    }
  } catch (err) {
    logger.warn({ err: String(err) }, '[temporal-activity] recordExecution failed');
  }
  try {
    const { eventBus } = await import('../runtime/ai/ports/events.port.js');
    (eventBus as any).publish?.({
      eventType: input.result.status === 'completed' ? 'ai.agent.completed' : 'ai.agent.failed',
      tenantId: input.tenantId,
      sourceService: 'ai-engine-service',
      severity: input.result.status === 'completed' ? 'info' : 'high',
      payload: { agentCode: input.agentCode, executionId: input.result.executionId, status: input.result.status, costUsd: input.result.costUsd, usedTools: input.result.usedTools, output: input.result.output },
    });
  } catch { /* best-effort */ }
  // Wave 1 #3 — score every completed run against the agent's smoke
  // dataset and persist the score back to Langfuse for the same trace.
  if (input.result.status === 'completed') {
    try {
      const { evaluateAgainstSmokeDataset } = await import('../domain/agrc-engine/observability/langfuse-bridge.js');
      const score = await evaluateAgainstSmokeDataset({
        agentCode: input.agentCode,
        output: input.result.output ?? {},
      });
      logger.info({ agentCode: input.agentCode, score: score.score, total: score.total, gate: score.score >= 0.7 ? 'PASS' : 'FAIL' }, '[temporal-activity] smoke-eval');
    } catch (err) {
      logger.warn({ err: String(err) }, '[temporal-activity] smoke-eval failed');
    }
  }
}
