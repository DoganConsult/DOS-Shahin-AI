import { safeQuery, tenantSchema, emptyResult } from '../../ports/database.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { swallowDefault, EC } from '@dos/platform-core/resilience/resilient-catch';

export interface AiDiagnosticsSnapshot {
  timestamp: string;
  tenantId: string;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  runDiagnostics: {
    activeRuns: number;
    failedRuns24h: number;
    errorRate: number;
    avgLatencyMs: number;
    stuckRuns: number;
  };
  toolDiagnostics: {
    totalToolCalls24h: number;
    blockedToolCalls: number;
    failedToolCalls: number;
    topFailingTools: Array<{ toolName: string; failureCount: number }>;
  };
  modelDiagnostics: {
    activeProvider: string | null;
    providerErrors24h: number;
    fallbackCount24h: number;
    avgTokensPerRun: number;
    costEstimate24h: number;
  };
  queueDiagnostics: {
    pendingApprovals: number;
    pendingHandoffs: number;
    escalations: number;
  };
  memoryDiagnostics: {
    totalMemoryEntries: number;
    staleEntries: number;
    totalTokensUsed: number;
  };
  gatewayDiagnostics: {
    circuitBreakerOpen: number;
    rateLimitHits: number;
    quotaUtilization: number;
  };
}

export interface FailedRunAnalysis {
  runId: string;
  agentId: string;
  failureReason: string | null;
  errorContext: string | null;
  durationMs: number | null;
  failedAt: string;
  retriable: boolean;
}

export interface BlockedToolInvocation {
  toolName: string;
  agentId: string;
  blockReason: string;
  blockedAt: string;
  dAuthDecision: string | null;
}

export async function getAiDiagnosticsSnapshot(tenantId: string): Promise<AiDiagnosticsSnapshot> {
  const schema = tenantSchema(tenantId);

  const [runRes, failedRes, stuckRes, approvalRes, handoffRes, memRes, circuitRes, costRes] =
    await Promise.all([
      swallowDefault(
        EC.FALLBACK_QUERY,
        emptyResult([{ active: 0, failed24h: 0, avg_latency: 0, error_rate: 0 }]),
        safeQuery(`
          SELECT
            COUNT(*) FILTER (WHERE status = 'running')::int AS active,
            COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours')::int AS failed24h,
            COALESCE(AVG(duration_ms), 0)::int AS avg_latency,
            COALESCE(
              COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours')::float /
              NULLIF(COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'), 0), 0
            ) AS error_rate
          FROM "${schema}".agent_runs
        `),
        { tenantId, operation: 'diagnostics agent_runs' },
      ),
      swallowDefault(
        EC.FALLBACK_QUERY,
        emptyResult([{ stuck: 0 }]),
        safeQuery(`
          SELECT COUNT(*)::int AS stuck
          FROM "${schema}".agent_runs
          WHERE status = 'running' AND created_at < NOW() - INTERVAL '2 hours'
        `),
        { tenantId, operation: 'diagnostics stuck runs' },
      ),
      swallowDefault(
        EC.FALLBACK_QUERY,
        emptyResult([{ total: 0, blocked: 0, failed: 0 }]),
        safeQuery(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'blocked')::int AS blocked,
            COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
          FROM "${schema}".agent_step_logs
          WHERE created_at > NOW() - INTERVAL '24 hours'
            AND step_type = 'tool_call'
        `),
        { tenantId, operation: 'diagnostics tool calls' },
      ),
      swallowDefault(
        EC.FALLBACK_QUERY,
        emptyResult([{ pending: 0 }]),
        safeQuery(
          `SELECT COUNT(*)::int AS pending FROM "${schema}".agent_approvals WHERE status = 'pending'`,
        ),
        { tenantId, operation: 'diagnostics approvals' },
      ),
      swallowDefault(
        EC.FALLBACK_QUERY,
        emptyResult([{ pending: 0 }]),
        safeQuery(
          `SELECT COUNT(*)::int AS pending FROM "${schema}".agent_handoffs WHERE status = 'pending'`,
        ),
        { tenantId, operation: 'diagnostics handoffs' },
      ),
      swallowDefault(
        EC.FALLBACK_QUERY,
        emptyResult([{ total: 0, stale: 0, tokens: 0 }]),
        safeQuery(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE accessed_at < NOW() - INTERVAL '30 days' OR accessed_at IS NULL)::int AS stale,
            COALESCE(SUM(token_count), 0)::int AS tokens
          FROM "${schema}".agent_memories
          WHERE deleted_at IS NULL
        `),
        { tenantId, operation: 'diagnostics memory' },
      ),
      swallowDefault(
        EC.FALLBACK_QUERY,
        emptyResult([{ circuit_open: 0 }]),
        safeQuery(
          `SELECT COUNT(*)::int AS circuit_open FROM "${schema}".agent_circuit_breaker WHERE state = 'open'`,
        ),
        { tenantId, operation: 'diagnostics circuit breaker' },
      ),
      swallowDefault(
        EC.FALLBACK_QUERY,
        emptyResult([{ total_tokens: 0, budget: 1000000 }]),
        safeQuery(`
          SELECT
            COALESCE(SUM(tokens_used), 0)::int AS total_tokens,
            1000000 AS budget
          FROM "${schema}".agent_runs
          WHERE created_at > NOW() - INTERVAL '24 hours'
        `),
        { tenantId, operation: 'diagnostics cost' },
      ),
    ]);

  const run = runRes.rows[0] || {};
  const stuck = failedRes.rows[0] || {};
  const tool = stuckRes.rows[0] || {};
  const approvals = approvalRes.rows[0] || {};
  const handoffs = handoffRes.rows[0] || {};
  const mem = memRes.rows[0] || {};
  const circuit = circuitRes.rows[0] || {};
  const cost = costRes.rows[0] || {};

  const errorRate = Math.round((Number(run.error_rate) || 0) * 100) / 100;
  const quotaUtil = Math.round(

    ((Number(cost.total_tokens) || 0) / Math.max(Number(cost.budget) / 30, 1)) * 100,
  );

  const overall: AiDiagnosticsSnapshot['overall'] =

    Number(stuck.stuck) > 5 || errorRate > 0.3 || Number(circuit.circuit_open) > 3
      ? 'unhealthy'

      : Number(stuck.stuck) > 0 || errorRate > 0.1
        ? 'degraded'
        : 'healthy';

  return {
    timestamp: new Date().toISOString(),
    tenantId,
    overall,
    runDiagnostics: {

      activeRuns: Number(run.active) || 0,

      failedRuns24h: Number(run.failed24h) || 0,
      errorRate,

      avgLatencyMs: Number(run.avg_latency) || 0,

      stuckRuns: Number(stuck.stuck) || 0,
    },
    toolDiagnostics: {

      totalToolCalls24h: Number(tool.total) || 0,

      blockedToolCalls: Number(tool.blocked) || 0,

      failedToolCalls: Number(tool.failed) || 0,
      topFailingTools: [],
    },
    modelDiagnostics: {
      activeProvider: null,
      providerErrors24h: 0,
      fallbackCount24h: 0,
      avgTokensPerRun:

        Number(run.active) > 0

          ? Math.round((Number(cost.total_tokens) || 0) / Math.max(Number(run.active), 1))
          : 0,
      costEstimate24h: 0,
    },
    queueDiagnostics: {

      pendingApprovals: Number(approvals.pending) || 0,

      pendingHandoffs: Number(handoffs.pending) || 0,
      escalations: 0,
    },
    memoryDiagnostics: {

      totalMemoryEntries: Number(mem.total) || 0,

      staleEntries: Number(mem.stale) || 0,

      totalTokensUsed: Number(mem.tokens) || 0,
    },
    gatewayDiagnostics: {

      circuitBreakerOpen: Number(circuit.circuit_open) || 0,
      rateLimitHits: 0,
      quotaUtilization: quotaUtil,
    },
  };
}

export async function getFailedRunAnalysis(
  tenantId: string,
  limit = 50,
): Promise<FailedRunAnalysis[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
        run_id, agent_id, error_message, error_context, duration_ms, updated_at
       FROM "${schema}".agent_runs
       WHERE status = 'failed'
         AND created_at > NOW() - INTERVAL '72 hours'
       ORDER BY updated_at DESC
       LIMIT $1`,
      [limit],
    );
    return result.rows.map((r: Record<string, unknown>) => ({
      runId: String(r.run_id),
      agentId: String(r.agent_id),
      failureReason: r.error_message ? String(r.error_message) : null,
      errorContext: r.error_context ? String(r.error_context) : null,
      durationMs: r.duration_ms != null ? Number(r.duration_ms) : null,
      failedAt: r.updated_at ? new Date((r as any).updated_at).toISOString() : new Date().toISOString(),
      retriable: true,
    }));
  } catch (_err) {
    return [];
  }
}

export async function getBlockedToolInvocations(
  tenantId: string,
  limit = 50,
): Promise<BlockedToolInvocation[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
        tool_name, agent_id, block_reason, created_at, dauth_decision
       FROM "${schema}".agent_step_logs
       WHERE status = 'blocked'
         AND step_type = 'tool_call'
         AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );
    return result.rows.map((r: Record<string, unknown>) => ({
      toolName: String(r.tool_name || ''),
      agentId: String(r.agent_id || ''),
      blockReason: String(r.block_reason || 'unknown'),
      blockedAt: r.created_at ? new Date((r as any).created_at).toISOString() : new Date().toISOString(),
      dAuthDecision: r.dauth_decision ? String(r.dauth_decision) : null,
    }));
  } catch (_err) {
    return [];
  }
}

export async function getQueueThroughputDiagnostics(
  tenantId: string,
): Promise<{ windowHours: number; runsCompleted: number; runsFailed: number; throughputPerHour: number }> {
  const schema = tenantSchema(tenantId);
  const windowHours = 24;
  try {
    const result = await safeQuery(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
       FROM "${schema}".agent_runs
       WHERE created_at > NOW() - INTERVAL '${windowHours} hours'`,
    );
    const row = result.rows[0] || {};
    const completed = Number(row.completed) || 0;
    const failed = Number(row.failed) || 0;
    return {
      windowHours,
      runsCompleted: completed,
      runsFailed: failed,
      throughputPerHour: Math.round((completed + failed) / windowHours),
    };
  } catch (_err) {
    return { windowHours, runsCompleted: 0, runsFailed: 0, throughputPerHour: 0 };
  }
}
