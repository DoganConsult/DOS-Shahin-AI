import { safeQuery, tenantSchema } from '../ports/database.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

const INSTALLATION_TRANSITIONS: Record<string, string[]> = {
  available: ['installing'],
  installing: ['installed', 'failed'],
  installed: ['updating', 'uninstalling', 'archived'],
  updating: ['installed', 'failed'],
  uninstalling: ['uninstalled', 'failed'],
  uninstalled: ['installing', 'archived'],
  failed: ['installing', 'archived'],
  archived: [],
};

const RECORD_TRANSITIONS: Record<string, string[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

export async function transitionStatus(
  tenantId: string, entityId: string, targetStatus: string, userId: string, entityType: 'installation' | 'record' = 'installation', _reason?: string,
): Promise<{ fromStatus: string; toStatus: string }> {
  const schema = tenantSchema(tenantId);
  const table = entityType === 'installation' ? 'pack_installations' : 'pack_registry';
  const transitions = entityType === 'installation' ? INSTALLATION_TRANSITIONS : RECORD_TRANSITIONS;
  const current = await safeQuery(`SELECT status FROM "${schema}"."${table}" WHERE id = $1`, [entityId]);

  if (current.rows.length === 0) { const e: unknown = new Error(`Pack ${entityType} not found`); e.statusCode = 404; throw e; }
  const fromStatus: string = current.rows[0].status;
  const allowed = transitions[fromStatus] || [];

  if (!allowed.includes(targetStatus)) { const e: unknown = new Error(`Cannot transition from ${fromStatus} to ${targetStatus}`); e.statusCode = 400; throw e; }
    const { evaluateLifecycleTransition } = await import('../../../ports/auth.port.js').catch(() => ({ evaluateLifecycleTransition: async () => ({ allowed: true }) }));
  if (evaluateLifecycleTransition) {
    const lifecycleResult = await evaluateLifecycleTransition(tenantId, userId, {
      moduleCode: 'packs', entityType: 'packs', entityId: entityId,
      fromState: fromStatus, toState: targetStatus, permissionCode: 'packs.record.approve'
    });
    if (!lifecycleResult.allowed) { const e: unknown = new Error('Lifecycle auth denied'); (e as any).statusCode = 403; throw e; }
  }

await safeQuery(`UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`, [targetStatus, entityId]);
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, actor_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'packs','transition',$3,$4,$5,$6)`,
    [tenantId, userId, entityType, entityId, JSON.stringify({ status: fromStatus }), JSON.stringify({ status: targetStatus })],
  ).catch(catchHandler(EC.EVENT_BUS));
    try {
    const { emitEvent } = await import('../../../ports/events.port.js').catch(() => ({ emitEvent: () => {} }));
    if (emitEvent) await emitEvent({ tenantId, userId: userId, module: 'packs', event: 'status_changed', entityType: 'packs', entityId: entityId, data: { fromStatus, targetStatus } });
  } catch {}
return { fromStatus, toStatus: targetStatus };
}

export async function bulkTransitionStatus(
  tenantId: string, entityIds: string[], targetStatus: string, userId: string, entityType: 'installation' | 'record' = 'installation',
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
      `SELECT before_state AS "fromStatus", after_state AS "toStatus", actor_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'packs' AND action = 'transition' ORDER BY created_at ASC`,
      [entityId],
    );
    return result.rows;
  } catch { return []; }
}

export async function getFailedInstallations(tenantId: string): Promise<Array<{ id: string; status: string; createdAt: string }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT id, status, created_at AS "createdAt" FROM "${schema}".pack_installations WHERE status = 'failed' AND tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [tenantId],
    );
    return result.rows;
  } catch { return []; }
}

export async function getLifecycleState(tenantId: string, entityId: string): Promise<{ entityId: string; status: string; slaHours: number; remainingHours: number; breached: boolean } | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(`SELECT id, status, created_at FROM "${schema}".pack_installations WHERE id = $1 AND tenant_id = $2`, [entityId, tenantId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const slaHours = 72;
    const elapsed = (Date.now() - new Date(row.created_at).getTime()) / 3600000;
    const remaining = Math.max(0, slaHours - elapsed);
    return { entityId, status: row.status, slaHours, remainingHours: Math.round(remaining * 10) / 10, breached: remaining <= 0 };
  } catch { return null; }
}

export async function getAvailableTransitions(currentState: string, entityType: 'installation' | 'record' = 'installation'): Promise<string[]> {
  const transitions = entityType === 'installation' ? INSTALLATION_TRANSITIONS : RECORD_TRANSITIONS;
  return transitions[currentState] ?? [];
}
