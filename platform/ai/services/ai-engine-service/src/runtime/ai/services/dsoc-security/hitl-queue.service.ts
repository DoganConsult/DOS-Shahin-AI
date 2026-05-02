/**
 * DSOC AI Security — HITL Approval Queue Aggregator.
 *
 * Cross-tenant view of pending human-in-the-loop approvals. Reads from each
 * tenant's `copilot_proposed_actions` table (the canonical HITL queue
 * established by services_ai-engine-service's proposed-action.service.ts).
 *
 * Read-only. Approvals/rejections continue to flow through the engine's
 * existing /api/copilot/actions/:id/{approve,reject} routes.
 */

export interface QueryFn {
  (text: string, params?: unknown[]): Promise<{ rows: any[] }>;
}

export interface HITLQueueItem {
  actionId: string;
  tenantId: string;
  schemaName: string;
  agentId: string | null;
  proposalType: string | null;
  priority: string | null;
  status: string;
  autoExecuteAt: string | null;
  autoExecuteEnabled: boolean;
  rejectionReason: string | null;
  escalationTarget: string | null;
  createdAt: string;
}

const KNOWN_TENANT_SCHEMAS = [
  'tenant_dogan',
  'tenant_douhan_consult',
  'tenant_a765b0362188',
  'tenant_a7f7b3f6f0df',
  'tenant_f2a45bc25f31',
];

/**
 * Pulls pending HITL rows from each tenant schema and unions. Caller can
 * filter by tenantId to scope to one. Limit is per-tenant (so a 100 limit
 * with 5 tenants yields up to 500 rows).
 */
export async function getHITLQueue(
  query: QueryFn,
  opts: { tenantId?: string; limit?: number } = {},
): Promise<HITLQueueItem[]> {
  const limit = Math.max(1, Math.min(500, opts.limit ?? 100));
  const targetSchemas = opts.tenantId ? [`tenant_${opts.tenantId}`] : KNOWN_TENANT_SCHEMAS;

  const allItems: HITLQueueItem[] = [];
  for (const schema of targetSchemas) {
    const res = await query(
      `SELECT
         action_id, $1::text AS schema_name,
         action_type, priority, status, auto_execute_at, auto_execute_enabled,
         rejection_reason, escalation_target, created_at,
         payload->>'agentId' AS agent_id
       FROM "${schema}".copilot_proposed_actions
      WHERE status IN ('pending','escalated')
      ORDER BY created_at DESC
      LIMIT $2`,
      [schema, limit],
    ).catch(() => ({ rows: [] }));

    for (const r of res.rows) {
      allItems.push({
        actionId: r.action_id,
        tenantId: schema.replace(/^tenant_/, ''),
        schemaName: r.schema_name,
        agentId: r.agent_id || null,
        proposalType: r.action_type || null,
        priority: r.priority || null,
        status: r.status || 'pending',
        autoExecuteAt: r.auto_execute_at ? new Date(r.auto_execute_at).toISOString() : null,
        autoExecuteEnabled: !!r.auto_execute_enabled,
        rejectionReason: r.rejection_reason || null,
        escalationTarget: r.escalation_target || null,
        createdAt: new Date(r.created_at).toISOString(),
      });
    }
  }

  return allItems.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

export async function getHITLBacklogSummary(
  query: QueryFn,
): Promise<{ tenantId: string; pending: number; escalated: number; oldestPendingAge: number }[]> {
  const out: { tenantId: string; pending: number; escalated: number; oldestPendingAge: number }[] = [];
  for (const schema of KNOWN_TENANT_SCHEMAS) {
    const r = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status='pending')::int   AS pending,
         COUNT(*) FILTER (WHERE status='escalated')::int AS escalated,
         EXTRACT(EPOCH FROM (NOW() - MIN(created_at) FILTER (WHERE status='pending')))::int AS oldest_age
       FROM "${schema}".copilot_proposed_actions
      WHERE status IN ('pending','escalated')`,
      [],
    ).catch(() => ({ rows: [{ pending: 0, escalated: 0, oldest_age: 0 }] }));
    const row = r.rows[0] || { pending: 0, escalated: 0, oldest_age: 0 };
    out.push({
      tenantId: schema.replace(/^tenant_/, ''),
      pending: Number(row.pending || 0),
      escalated: Number(row.escalated || 0),
      oldestPendingAge: Number(row.oldest_age || 0),
    });
  }
  return out;
}
