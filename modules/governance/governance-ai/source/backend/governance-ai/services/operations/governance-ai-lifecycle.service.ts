import { safeQuery, tenantSchema } from '../../ports/database.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

export async function transitionStatus(
  tenantId: string, entityId: string, targetStatus: string, userId: string,
  entityType: 'signal' | 'pipeline_run' | 'narrative' = 'signal', _reason?: string,
): Promise<{ fromStatus: string; toStatus: string }> {
  const schema = tenantSchema(tenantId);
  const table = 'governance_ai_signals';
  const current = await safeQuery(`SELECT status FROM "${schema}"."${table}" WHERE id = $1`, [entityId]);

  if (current.rows.length === 0) { const e: unknown = new Error(`governance-ai ${entityType} not found`); e.statusCode = 404; throw e; }
  const fromStatus: string = current.rows[0].status;
  const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];

  if (!allowed.includes(targetStatus)) { const e: unknown = new Error(`Cannot transition from ${fromStatus} to ${targetStatus}`); e.statusCode = 400; throw e; }
  await safeQuery(`UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`, [targetStatus, entityId]);
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'governance-ai','transition',$3,$4,$5,$6)`,
    [tenantId, userId, entityType, entityId, JSON.stringify({ status: fromStatus }), JSON.stringify({ status: targetStatus })],
  ).catch(catchHandler(EC.EVENT_BUS));
  return { fromStatus, toStatus: targetStatus };
}

export async function bulkTransitionStatus(
  tenantId: string, entityIds: string[], targetStatus: string, userId: string,
  entityType: 'signal' | 'pipeline_run' | 'narrative' = 'signal',
): Promise<{ succeeded: string[]; failed: Array<{ id: string; error: string }> }> {
  const succeeded: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  for (const id of entityIds) {
    try { await transitionStatus(tenantId, id, targetStatus, userId, entityType); succeeded.push(id); }
    catch (e) { failed.push({ id, error: (e as Error).message }); }
  }
  return { succeeded, failed };
}

export async function getStatusHistory(tenantId: string, entityId: string): Promise<Array<{ fromStatus: string; toStatus: string; changedBy: string; changedAt: string }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'governance-ai' AND action = 'transition' ORDER BY created_at ASC`,
      [entityId],
    );
    return result.rows;
  } catch { return []; }
}

export async function getLifecycleState(tenantId: string, entityId: string): Promise<{ entityId: string; status: string; slaHours: number; remainingHours: number; breached: boolean } | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(`SELECT id, status, created_at FROM "${schema}".governance_ai_signals WHERE id = $1`, [entityId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const slaHours = 72;
    const elapsed = (Date.now() - new Date(row.created_at).getTime()) / 3600000;
    const remaining = Math.max(0, slaHours - elapsed);
    return { entityId, status: row.status, slaHours, remainingHours: Math.round(remaining * 10) / 10, breached: remaining <= 0 };
  } catch { return null; }
}

export async function getAvailableTransitions(currentState: string): Promise<string[]> {
  return ALLOWED_TRANSITIONS[currentState] ?? [];
}

export async function getStaleSignals(tenantId: string): Promise<Array<{ id: string; status: string; updatedAt: string }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".governance_ai_signals WHERE status = 'stale' ORDER BY updated_at ASC LIMIT 100`,
    );
    return result.rows;
  } catch { return []; }
}

export async function getPendingEscalations(tenantId: string): Promise<Array<{ id: string; status: string; updatedAt: string }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".governance_ai_escalations WHERE status = 'pending' ORDER BY updated_at ASC LIMIT 100`,
    );
    return result.rows;
  } catch { return []; }
}
