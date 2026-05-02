/**
 * DNOC AI Operations — Agent Health Rollup.
 *
 * One row per (tenant_id, agent_id) for the requested window. Read-only.
 * The 12 canonical agent IDs come from public.agent_performance_log + recent
 * Langfuse trace metadata; no name/role overrides happen here.
 */

import type { QueryFn } from './unified-timeline.service';

export interface AgentHealthRow {
  tenantId: string;
  agentId: string;
  agentName: string | null;          // READ-only mirror of canonical name
  approvalBoundary: string | null;   // READ-only mirror
  runs: number;
  successRate: number;               // 0..1
  errorRate: number;                 // 0..1
  p50LatencyMs: number;
  p95LatencyMs: number;
  totalTokensIn: number;
  totalTokensOut: number;
  estimatedCostUsd: number;          // price = 3$/Mtok in, 15$/Mtok out (Sonnet 4 default)
  lastRunAt: string | null;
}

export interface AgentHealthOptions {
  tenantId?: string;
  windowHours?: number; // default 24
}

const PRICE_INPUT_PER_MTOK = parseFloat(process.env.AI_PRICE_INPUT_USD_PER_MTOK || '3');
const PRICE_OUTPUT_PER_MTOK = parseFloat(process.env.AI_PRICE_OUTPUT_USD_PER_MTOK || '15');

export async function getAgentHealth(
  query: QueryFn,
  langfuseQuery: QueryFn | null,
  opts: AgentHealthOptions = {},
): Promise<AgentHealthRow[]> {
  const windowHours = Math.max(1, Math.min(720, opts.windowHours ?? 24));
  const tenantClause = opts.tenantId ? `AND tenant_id = $2` : '';
  const tenantParam = opts.tenantId ? [opts.tenantId] : [];

  // Aggregate from public.agent_performance_log (canonical perf store).
  const perfRes = await query(
    `SELECT
       tenant_id, agent_id,
       COUNT(*)::int                                                    AS runs,
       COUNT(*) FILTER (WHERE NOT is_error)::float / NULLIF(COUNT(*),0) AS success_rate,
       COUNT(*) FILTER (WHERE is_error)::float     / NULLIF(COUNT(*),0) AS error_rate,
       (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms))::int  AS p50,
       (PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms))::int AS p95,
       COALESCE(SUM(tokens_in), 0)::int                                 AS tokens_in,
       COALESCE(SUM(tokens_out), 0)::int                                AS tokens_out,
       MAX(created_at)                                                  AS last_run_at
     FROM public.agent_performance_log
    WHERE created_at >= NOW() - ($1 || ' hours')::interval
      ${tenantClause}
    GROUP BY tenant_id, agent_id
    ORDER BY tenant_id, agent_id`,
    [windowHours, ...tenantParam],
  ).catch(() => ({ rows: [] as any[] }));

  // Pull canonical names + approvalBoundary from recent Langfuse traces
  // (READ-only — these were written by agent-tool-executor as a mirror
  // of agrc-agents.ts; we never modify them here).
  const namesByAgent = new Map<string, { agentName: string | null; approvalBoundary: string | null }>();
  if (langfuseQuery) {
    const lfRes = await langfuseQuery(
      `SELECT DISTINCT ON (metadata->>'agentId')
              metadata->>'agentId' AS agent_id,
              metadata->>'agentName' AS agent_name,
              metadata->>'approvalBoundary' AS boundary
         FROM traces
        WHERE created_at >= NOW() - INTERVAL '7 days'
          AND metadata ? 'agentId'
        ORDER BY metadata->>'agentId', created_at DESC`,
      [],
    ).catch(() => ({ rows: [] as any[] }));
    for (const r of lfRes.rows) {
      if (!r.agent_id) continue;
      namesByAgent.set(r.agent_id, {
        agentName: r.agent_name || null,
        approvalBoundary: r.boundary || null,
      });
    }
  }

  return perfRes.rows.map((r: any): AgentHealthRow => {
    const tin = Number(r.tokens_in || 0);
    const tout = Number(r.tokens_out || 0);
    const cost = (tin / 1e6) * PRICE_INPUT_PER_MTOK + (tout / 1e6) * PRICE_OUTPUT_PER_MTOK;
    const meta = namesByAgent.get(r.agent_id) || { agentName: null, approvalBoundary: null };
    return {
      tenantId: r.tenant_id,
      agentId: r.agent_id,
      agentName: meta.agentName,
      approvalBoundary: meta.approvalBoundary,
      runs: Number(r.runs || 0),
      successRate: Number(r.success_rate || 0),
      errorRate: Number(r.error_rate || 0),
      p50LatencyMs: Number(r.p50 || 0),
      p95LatencyMs: Number(r.p95 || 0),
      totalTokensIn: tin,
      totalTokensOut: tout,
      estimatedCostUsd: Number(cost.toFixed(4)),
      lastRunAt: r.last_run_at ? new Date(r.last_run_at).toISOString() : null,
    };
  });
}
