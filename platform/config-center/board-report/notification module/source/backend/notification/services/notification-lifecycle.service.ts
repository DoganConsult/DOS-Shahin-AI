import { safeQuery, tenantSchema } from '../ports/database.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['sent'],
  sent: ['delivered', 'failed'],
  delivered: ['read', 'archived'],
  read: ['archived'],
  failed: ['pending', 'archived'],
  archived: [],
};

const TEMPLATE_TRANSITIONS: Record<string, string[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

export async function transitionStatus(
  tenantId: string, entityId: string, targetStatus: string, userId: string, entityType: 'notification' | 'template' | 'channel' = 'notification', _reason?: string,
): Promise<{ fromStatus: string; toStatus: string }> {
  const schema = tenantSchema(tenantId);
  const table = entityType === 'notification' ? 'notification_queue' : entityType === 'template' ? 'notification_templates' : 'notification_channels';
  const transitions = entityType === 'notification' ? ALLOWED_TRANSITIONS : TEMPLATE_TRANSITIONS;
  const current = await safeQuery(`SELECT status FROM "${schema}"."${table}" WHERE id = $1`, [entityId]);

  if (current.rows.length === 0) { const e: unknown = new Error(`Notification ${entityType} not found`); e.statusCode = 404; throw e; }
  const fromStatus: string = current.rows[0].status;
  const allowed = transitions[fromStatus] || [];

  if (!allowed.includes(targetStatus)) { const e: unknown = new Error(`Cannot transition from ${fromStatus} to ${targetStatus}`); e.statusCode = 400; throw e; }
    const { evaluateLifecycleTransition } = await import('../../../ports/auth.port.js').catch(() => ({ evaluateLifecycleTransition: async () => ({ allowed: true }) }));
  if (evaluateLifecycleTransition) {
    const lifecycleResult = await evaluateLifecycleTransition(tenantId, userId, {
      moduleCode: 'notification', entityType: 'notification', entityId: entityId,
      fromState: fromStatus, toState: targetStatus, permissionCode: 'notification.record.approve'
    });
    if (!lifecycleResult.allowed) { const e: unknown = new Error('Lifecycle auth denied'); (e as any).statusCode = 403; throw e; }
  }

await safeQuery(`UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`, [targetStatus, entityId]);
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'notification','transition',$3,$4,$5,$6)`,
    [tenantId, userId, entityType, entityId, JSON.stringify({ status: fromStatus }), JSON.stringify({ status: targetStatus })],
  ).catch(catchHandler(EC.EVENT_BUS));
    try {
    const { emitEvent } = await import('../../../ports/events.port.js').catch(() => ({ emitEvent: () => {} }));
    if (emitEvent) await emitEvent({ tenantId, userId: userId, module: 'notification', event: 'status_changed', entityType: 'notification', entityId: entityId, data: { fromStatus, targetStatus } });
  } catch {}
return { fromStatus, toStatus: targetStatus };
}

export async function bulkTransitionStatus(
  tenantId: string, entityIds: string[], targetStatus: string, userId: string,
): Promise<{ succeeded: string[]; failed: Array<{ id: string; error: string }> }> {
  const succeeded: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  for (const id of entityIds) {
    try { await transitionStatus(tenantId, id, targetStatus, userId); succeeded.push(id); }
    catch (e) { failed.push({ id, error: (e as Error).message }); }
  }
  return { succeeded, failed };
}

export async function getStatusHistory(tenantId: string, entityId: string): Promise<Array<{ fromStatus: string; toStatus: string; changedBy: string; changedAt: string }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'notification' AND action = 'transition' ORDER BY created_at ASC`,
      [entityId],
    );
    return result.rows;
  } catch { return []; }
}

export async function getFailedNotifications(tenantId: string): Promise<Array<{ id: string; status: string; createdAt: string }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT id, status, created_at AS "createdAt" FROM "${schema}".notification_queue WHERE status = 'failed' ORDER BY created_at DESC LIMIT 100`,
    );
    return result.rows;
  } catch { return []; }
}

export async function retryFailedNotifications(tenantId: string, userId: string): Promise<{ retried: number }> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `UPDATE "${schema}".notification_queue SET status = 'pending', updated_at = NOW() WHERE status = 'failed' RETURNING id`,
    );
    for (const row of result.rows) {
      await safeQuery(
        `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'notification','transition','notification',$3,$4,$5)`,
        [tenantId, userId, row.id, JSON.stringify({ status: 'failed' }), JSON.stringify({ status: 'pending' })],
      ).catch(catchHandler(EC.EVENT_BUS));
    }
    return { retried: result.rows.length };
  } catch { return { retried: 0 }; }
}

export async function getAvailableTransitions(currentState: string, entityType: 'notification' | 'template' | 'channel' = 'notification'): Promise<string[]> {
  const transitions = entityType === 'notification' ? ALLOWED_TRANSITIONS : TEMPLATE_TRANSITIONS;
  return transitions[currentState] ?? [];
}
