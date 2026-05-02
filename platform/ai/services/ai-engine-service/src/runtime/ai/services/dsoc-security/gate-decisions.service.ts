/**
 * DSOC AI Security — Gate Decisions.
 *
 * Reads dos.audit_trail rows where module='ai' and action LIKE 'agent.tool.%'
 * (the per-tool-call decisions written by services_ai-engine-service's
 * tool-gate.service.ts). Read-only.
 *
 * Each row's payload carries decidedBy ∈ {agent_tool_permissions, sod_policy,
 * approval_boundary, max_actions_per_cycle, permission_default_allow,
 * cost_cap}. We surface that as the dominant grouping for the SOC dashboard.
 */

export interface QueryFn {
  (text: string, params?: unknown[]): Promise<{ rows: any[] }>;
}

export interface GateDecisionRow {
  id: string;
  ts: string;
  tenantId: string;
  agentId: string | null;
  toolName: string | null;
  action: 'allowed' | 'denied' | 'budget.denied' | 'unknown';
  decidedBy: string | null;
  reason: string | null;
  enforcementMode: 'audit' | 'warn' | 'enforce' | null;
  requiresApproval: boolean;
  toolInput?: unknown;
}

export interface GateDecisionsOptions {
  tenantId?: string;
  agentId?: string;
  decision?: 'allowed' | 'denied';
  decidedBy?: string;
  windowHours?: number;
  limit?: number;
}

export async function getGateDecisions(
  query: QueryFn,
  opts: GateDecisionsOptions = {},
): Promise<GateDecisionRow[]> {
  const win = Math.max(1, Math.min(720, opts.windowHours ?? 24));
  const lim = Math.max(1, Math.min(2000, opts.limit ?? 200));
  const filters: string[] = [
    `module = 'ai'`,
    `created_at >= NOW() - ($1 || ' hours')::interval`,
    `(action LIKE 'agent.tool.%' OR action LIKE 'agent.budget.%')`,
  ];
  const params: unknown[] = [win];
  if (opts.tenantId) { params.push(opts.tenantId); filters.push(`tenant_id = $${params.length}`); }
  if (opts.agentId)  { params.push(`agent-${opts.agentId}`); filters.push(`actor_id = $${params.length}`); }
  if (opts.decision) {
    params.push(`agent.tool.${opts.decision}`);
    filters.push(`action = $${params.length}`);
  }
  if (opts.decidedBy) { params.push(opts.decidedBy); filters.push(`payload->>'decidedBy' = $${params.length}`); }
  params.push(lim);

  const res = await query(
    `SELECT entry_id, tenant_id, actor_id, action, entity_id, payload, created_at
       FROM dos.audit_trail
      WHERE ${filters.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length}`,
    params,
  ).catch(() => ({ rows: [] }));

  return res.rows.map((r: any): GateDecisionRow => {
    const payload = typeof r.payload === 'string' ? safeJSON(r.payload) : (r.payload || {});
    const action = r.action.endsWith('.allowed') ? 'allowed'
                 : r.action.endsWith('.denied')  ? 'denied'
                 : r.action.startsWith('agent.budget.') ? 'budget.denied'
                 : 'unknown';
    return {
      id: r.entry_id,
      ts: new Date(r.created_at).toISOString(),
      tenantId: r.tenant_id,
      agentId: extractAgentId(r.actor_id),
      toolName: payload?.toolName ?? null,
      action: action as any,
      decidedBy: payload?.decidedBy ?? null,
      reason: payload?.reason ?? null,
      enforcementMode: payload?.enforcementMode ?? null,
      requiresApproval: !!payload?.requiresApproval,
      toolInput: payload?.toolInput,
    };
  });
}

export async function getGateDecisionStats(
  query: QueryFn,
  opts: { tenantId?: string; windowHours?: number } = {},
): Promise<{ allowed: number; denied: number; byDecidedBy: Record<string, number> }> {
  const win = Math.max(1, Math.min(720, opts.windowHours ?? 1));
  const params: unknown[] = [win];
  let where = `module='ai' AND created_at >= NOW() - ($1 || ' hours')::interval AND action LIKE 'agent.tool.%'`;
  if (opts.tenantId) { params.push(opts.tenantId); where += ` AND tenant_id = $${params.length}`; }

  const aggRes = await query(
    `SELECT
       COUNT(*) FILTER (WHERE action = 'agent.tool.allowed')::int AS allowed,
       COUNT(*) FILTER (WHERE action = 'agent.tool.denied')::int  AS denied,
       payload->>'decidedBy' AS decided_by,
       COUNT(*)::int AS n
     FROM dos.audit_trail
    WHERE ${where}
    GROUP BY ROLLUP (payload->>'decidedBy')`,
    params,
  ).catch(() => ({ rows: [] }));

  let allowed = 0, denied = 0;
  const byDecidedBy: Record<string, number> = {};
  for (const r of aggRes.rows) {
    if (r.decided_by === null) {
      allowed = Number(r.allowed || 0);
      denied = Number(r.denied || 0);
    } else {
      byDecidedBy[r.decided_by] = Number(r.n || 0);
    }
  }
  return { allowed, denied, byDecidedBy };
}

function safeJSON(s: string): any {
  try { return JSON.parse(s); } catch { return {}; }
}

function extractAgentId(s: string | null): string | null {
  if (!s) return null;
  const m = /^agent-([A-Z]\d+)/.exec(s);
  return m ? m[1] : null;
}
