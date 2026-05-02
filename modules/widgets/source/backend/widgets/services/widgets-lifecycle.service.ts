import { safeQuery, tenantSchema } from '../ports/database.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

const RECORD_TRANSITIONS: Record<string, string[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

const WIDGET_TRANSITIONS: Record<string, string[]> = {
  draft: ['configured'],
  configured: ['active', 'draft'],
  active: ['disabled', 'archived'],
  disabled: ['active', 'archived'],
  archived: [],
};

const DATA_SOURCE_TRANSITIONS: Record<string, string[]> = {
  connected: ['active'],
  active: ['stale', 'disconnected'],
  stale: ['active', 'disconnected'],
  disconnected: ['connected'],
};

export async function transitionStatus(
  tenantId: string, entityId: string, targetStatus: string, userId: string,
  lifecycleType: 'record' | 'widget' | 'data_source' = 'widget', _reason?: string,
): Promise<{ fromStatus: string; toStatus: string }> {
  const schema = tenantSchema(tenantId);
  const transitions = lifecycleType === 'widget' ? WIDGET_TRANSITIONS : lifecycleType === 'data_source' ? DATA_SOURCE_TRANSITIONS : RECORD_TRANSITIONS;
  const table = 'widgets_registry';
  const current = await safeQuery(`SELECT status FROM "${schema}"."${table}" WHERE id = $1`, [entityId]);

  if (current.rows.length === 0) { const e: unknown = new Error(`Widget ${lifecycleType} not found`); e.statusCode = 404; throw e; }
  const fromStatus: string = current.rows[0].status;
  const allowed = transitions[fromStatus] || [];

  if (!allowed.includes(targetStatus)) { const e: unknown = new Error(`Cannot transition from ${fromStatus} to ${targetStatus}`); e.statusCode = 400; throw e; }
    const { evaluateLifecycleTransition } = await import('../../../ports/auth.port.js').catch(() => ({ evaluateLifecycleTransition: async () => ({ allowed: true }) }));
  if (evaluateLifecycleTransition) {
    const lifecycleResult = await evaluateLifecycleTransition(tenantId, userId, {
      moduleCode: 'widgets', entityType: 'widgets', entityId: entityId,
      fromState: fromStatus, toState: targetStatus, permissionCode: 'widgets.record.approve'
    });
    if (!lifecycleResult.allowed) { const e: unknown = new Error('Lifecycle auth denied'); (e as any).statusCode = 403; throw e; }
  }

await safeQuery(`UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`, [targetStatus, entityId]);
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'widgets','transition',$3,$4,$5,$6)`,
    [tenantId, userId, lifecycleType, entityId, JSON.stringify({ status: fromStatus }), JSON.stringify({ status: targetStatus })],
  ).catch(catchHandler(EC.EVENT_BUS));
    try {
    const { emitEvent } = await import('../../../ports/events.port.js').catch(() => ({ emitEvent: () => {} }));
    if (emitEvent) await emitEvent({ tenantId, userId: userId, module: 'widgets', event: 'status_changed', entityType: 'widgets', entityId: entityId, data: { fromStatus, targetStatus } });
  } catch {}
return { fromStatus, toStatus: targetStatus };
}

export async function bulkTransitionStatus(
  tenantId: string, entityIds: string[], targetStatus: string, userId: string,
  lifecycleType: 'record' | 'widget' | 'data_source' = 'widget',
): Promise<{ succeeded: string[]; failed: Array<{ id: string; error: string }> }> {
  const succeeded: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  for (const id of entityIds) {
    try { await transitionStatus(tenantId, id, targetStatus, userId, lifecycleType); succeeded.push(id); }
    catch (e) { failed.push({ id, error: (e as Error).message }); }
  }
  return { succeeded, failed };
}

export async function getStatusHistory(tenantId: string, entityId: string): Promise<Array<{ fromStatus: string; toStatus: string; changedBy: string; changedAt: string }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'widgets' AND action = 'transition' ORDER BY created_at ASC`,
      [entityId],
    );
    return result.rows;
  } catch { return []; }
}

export async function getStaleDataSources(tenantId: string): Promise<Array<{ id: string; status: string; updatedAt: string }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".widgets_registry WHERE status = 'stale' ORDER BY updated_at ASC LIMIT 100`,
    );
    return result.rows;
  } catch { return []; }
}

export async function getDisabledWidgets(tenantId: string): Promise<Array<{ id: string; status: string; updatedAt: string }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".widgets_registry WHERE status = 'disabled' ORDER BY updated_at ASC LIMIT 100`,
    );
    return result.rows;
  } catch { return []; }
}

export async function getAvailableTransitions(currentState: string, lifecycleType: 'record' | 'widget' | 'data_source' = 'widget'): Promise<string[]> {
  const transitions = lifecycleType === 'widget' ? WIDGET_TRANSITIONS : lifecycleType === 'data_source' ? DATA_SOURCE_TRANSITIONS : RECORD_TRANSITIONS;
  return transitions[currentState] ?? [];
}
