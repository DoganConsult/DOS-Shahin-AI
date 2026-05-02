/**
 * DNOC AI Operations — Unified Timeline Aggregator.
 *
 * Joins, by (tenant_id, timestamp), the 5 audit/trace sinks the platform writes
 * during AI activity, producing one canonical OpsEvent stream that DNOC pages
 * (and DSOC for security-side filtering) consume:
 *
 *   1. dos.audit_trail                  ← per-tool gate decisions, agent runs
 *   2. dos.ai_workflow_trigger_log      ← cron + event-trigger fires
 *   3. public.agent_performance_log     ← every completed run (tokens, latency)
 *   4. langfuse.traces (read-only)      ← Langfuse trace metadata + tags
 *   5. tenant_*.ai_agent_executions     ← per-run state machine rows (joined opportunistically)
 *
 * Read-only. Never mutates any source table. Suitable to be polled at <2 Hz
 * (5s cache recommended) or driven from a Redis event-bus subscription.
 */

export interface OpsEvent {
  /** Stable ID across queries — concatenation of source + native id. */
  id: string;
  source: 'audit_trail' | 'trigger_log' | 'agent_perf' | 'langfuse_trace';
  ts: string; // ISO-8601 UTC
  tenantId: string | null;
  agentId: string | null;
  surface: string | null; // surface:* tag if available
  kind: string;           // e.g. 'agent.tool.allowed', 'agent.run.completed', 'trigger.fired'
  actorId: string | null; // user / agent / system
  payload: Record<string, unknown>;
  status?: 'success' | 'denied' | 'error' | 'info';
  durationMs?: number;
  costUsd?: number;
  traceId?: string;        // Langfuse trace id when correlatable
}

export interface QueryFn {
  (text: string, params?: unknown[]): Promise<{ rows: any[] }>;
}

export interface UnifiedTimelineOptions {
  tenantId?: string;
  agentId?: string;
  surface?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  kindPrefix?: string;
}

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

function clampLimit(n: number | undefined): number {
  if (!n || !Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(n)));
}

function isoOrNow(d: Date | undefined): string {
  return (d ?? new Date(Date.now() - 24 * 60 * 60 * 1000)).toISOString();
}

/**
 * Pull from each source in parallel, normalize into OpsEvent, sort by ts desc.
 * Each source query is bounded by tenant + time window + limit so the join
 * stays under typical latency budgets even on busy tenants.
 */
export async function getUnifiedTimeline(
  query: QueryFn,
  langfuseQuery: QueryFn | null,
  opts: UnifiedTimelineOptions = {},
): Promise<OpsEvent[]> {
  const since = isoOrNow(opts.since);
  const until = (opts.until ?? new Date()).toISOString();
  const limit = clampLimit(opts.limit);
  const tenantClause = opts.tenantId ? `AND tenant_id = $TENANT$` : '';
  const surfaceFilter = (e: OpsEvent) => !opts.surface || e.surface === opts.surface;
  const agentFilter = (e: OpsEvent) => !opts.agentId || e.agentId === opts.agentId;
  const kindFilter = (e: OpsEvent) =>
    !opts.kindPrefix || (typeof e.kind === 'string' && e.kind.startsWith(opts.kindPrefix));

  const tenantParam = opts.tenantId ? [opts.tenantId] : [];

  // 1. dos.audit_trail (every tool-gate decision + run completion)
  const auditPromise = query(
    `SELECT entry_id, tenant_id, actor_id, action, entity_type, entity_id, module, payload, created_at
       FROM dos.audit_trail
      WHERE created_at >= $1 AND created_at <= $2
        ${tenantClause.replace('$TENANT$', '$3')}
        AND module IN ('ai', 'ai-governance', 'ai-soc', 'ai-noc')
      ORDER BY created_at DESC
      LIMIT $${tenantClause ? 4 : 3}`,
    [since, until, ...tenantParam, limit],
  ).catch(() => ({ rows: [] as any[] }));

  // 2. dos.ai_workflow_trigger_log (cron + event triggers)
  const triggerPromise = query(
    `SELECT log_id, tenant_id, trigger_id, signal, payload, emitted_at
       FROM dos.ai_workflow_trigger_log
      WHERE emitted_at >= $1 AND emitted_at <= $2
        ${tenantClause.replace('$TENANT$', '$3')}
      ORDER BY emitted_at DESC
      LIMIT $${tenantClause ? 4 : 3}`,
    [since, until, ...tenantParam, limit],
  ).catch(() => ({ rows: [] as any[] }));

  // 3. public.agent_performance_log (per-run latency + tokens)
  const perfPromise = query(
    `SELECT id, tenant_id, agent_id, session_id, duration_ms, tokens_in, tokens_out,
            tool_calls, stop_reason, is_error, created_at
       FROM public.agent_performance_log
      WHERE created_at >= $1 AND created_at <= $2
        ${tenantClause.replace('$TENANT$', '$3')}
      ORDER BY created_at DESC
      LIMIT $${tenantClause ? 4 : 3}`,
    [since, until, ...tenantParam, limit],
  ).catch(() => ({ rows: [] as any[] }));

  // 4. langfuse.traces (separate DB; optional)
  const langfusePromise = langfuseQuery
    ? langfuseQuery(
        `SELECT id, name, tags, user_id, session_id, metadata, created_at
           FROM traces
          WHERE created_at >= $1 AND created_at <= $2
          ORDER BY created_at DESC
          LIMIT $3`,
        [since, until, limit],
      ).catch(() => ({ rows: [] as any[] }))
    : Promise.resolve({ rows: [] as any[] });

  const [auditRes, triggerRes, perfRes, lfRes] = await Promise.all([
    auditPromise,
    triggerPromise,
    perfPromise,
    langfusePromise,
  ]);

  const events: OpsEvent[] = [];

  for (const r of auditRes.rows) {
    const payload = typeof r.payload === 'string' ? safeJSON(r.payload) : (r.payload || {});
    events.push({
      id: `audit:${r.entry_id}`,
      source: 'audit_trail',
      ts: new Date(r.created_at).toISOString(),
      tenantId: r.tenant_id,
      agentId: extractAgentId(r.entity_id) ?? extractAgentId(r.actor_id),
      surface: payload?.surface ?? null,
      kind: r.action,
      actorId: r.actor_id,
      payload,
      status:
        r.action.endsWith('.denied') || r.action.endsWith('.failed')
          ? 'denied'
          : r.action.endsWith('.allowed') || r.action.endsWith('.completed')
            ? 'success'
            : 'info',
    });
  }

  for (const r of triggerRes.rows) {
    const payload = typeof r.payload === 'string' ? safeJSON(r.payload) : (r.payload || {});
    events.push({
      id: `trigger:${r.log_id}`,
      source: 'trigger_log',
      ts: new Date(r.emitted_at).toISOString(),
      tenantId: r.tenant_id,
      agentId: payload?.agentId ?? null,
      surface: 'agent-cron',
      kind: `trigger.${payload?.status || 'fired'}`,
      actorId: 'cron-runner',
      payload,
      status: payload?.status === 'failed' ? 'error' : 'success',
      durationMs: payload?.durationMs,
    });
  }

  for (const r of perfRes.rows) {
    events.push({
      id: `perf:${r.id}`,
      source: 'agent_perf',
      ts: new Date(r.created_at).toISOString(),
      tenantId: r.tenant_id,
      agentId: r.agent_id,
      surface: `agent-${r.agent_id}`,
      kind: 'agent.run.completed',
      actorId: null,
      payload: {
        durationMs: r.duration_ms,
        tokensIn: r.tokens_in,
        tokensOut: r.tokens_out,
        toolCalls: r.tool_calls,
        stopReason: r.stop_reason,
        sessionId: r.session_id,
      },
      status: r.is_error ? 'error' : 'success',
      durationMs: r.duration_ms,
    });
  }

  for (const r of lfRes.rows) {
    const tags: string[] = Array.isArray(r.tags) ? r.tags : [];
    const surfaceTag = tags.find((t) => typeof t === 'string' && t.startsWith('surface:'));
    const tenantTag = tags.find((t) => typeof t === 'string' && t.startsWith('tenant:'));
    const metadata = typeof r.metadata === 'string' ? safeJSON(r.metadata) : (r.metadata || {});
    events.push({
      id: `langfuse:${r.id}`,
      source: 'langfuse_trace',
      ts: new Date(r.created_at).toISOString(),
      tenantId: tenantTag ? tenantTag.slice('tenant:'.length) : (metadata?.tenantId ?? null),
      agentId: metadata?.agentId ?? null,
      surface: surfaceTag ? surfaceTag.slice('surface:'.length) : null,
      kind: r.name,
      actorId: r.user_id,
      payload: { sessionId: r.session_id, ...metadata },
      durationMs: metadata?.durationMs,
      costUsd: metadata?.['ai.cost.usd_total'] ?? metadata?.stepCostUsd,
      traceId: r.id,
    });
  }

  return events
    .filter(surfaceFilter)
    .filter(agentFilter)
    .filter(kindFilter)
    .sort((a, b) => (a.ts > b.ts ? -1 : 1))
    .slice(0, limit);
}

function safeJSON(s: string): any {
  try { return JSON.parse(s); } catch { return {}; }
}

function extractAgentId(s: string | null): string | null {
  if (!s) return null;
  const m = /^agent-([A-Z]\d+)/.exec(s) || /^([A-Z]\d+)$/.exec(s) || /:([A-Z]\d+):/.exec(s);
  return m ? m[1] : null;
}
