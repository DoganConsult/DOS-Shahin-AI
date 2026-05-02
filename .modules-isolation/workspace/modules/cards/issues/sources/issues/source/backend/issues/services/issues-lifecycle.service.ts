/**
 * Issues Lifecycle Service
 * Manages issue state transitions, SLA tracking, and escalation.
 * @owner Module:issues
 */
import { safeQuery, tenantSchema } from '../ports/database.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  open: ['triaged', 'cancelled'],
  triaged: ['in_progress', 'cancelled'],
  in_progress: ['resolved', 'cancelled'],
  resolved: ['closed', 'in_progress'],
  closed: [],
  cancelled: [],
};

/** Transition an issue to a new status with validation. */
export async function transitionStatus(
  tenantId: string, issueId: string, targetStatus: string, userId: string, reason?: string,
): Promise<{ fromStatus: string; toStatus: string }> {
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(`SELECT status FROM "${schema}".issues WHERE id = $1 AND deleted_at IS NULL`, [issueId]);

  if (current.rows.length === 0) { const e: unknown = new Error('Issue not found'); e.statusCode = 404; throw e; }
  const fromStatus: string = current.rows[0].status;
  const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];

  if (!allowed.includes(targetStatus)) { const e: unknown = new Error(`Cannot transition from ${fromStatus} to ${targetStatus}`); e.statusCode = 400; throw e; }
    const { evaluateLifecycleTransition } = await import('../../../ports/auth.port.js').catch(() => ({ evaluateLifecycleTransition: async () => ({ allowed: true }) }));
  if (evaluateLifecycleTransition) {
    const lifecycleResult = await evaluateLifecycleTransition(tenantId, userId, {
      moduleCode: 'issues', entityType: 'issues', entityId: issueId,
      fromState: fromStatus, toState: targetStatus, permissionCode: 'issues.record.approve'
    });
    if (!lifecycleResult.allowed) { const e: unknown = new Error('Lifecycle auth denied'); (e as any).statusCode = 403; throw e; }
  }

await safeQuery(`UPDATE "${schema}".issues SET status = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3`, [targetStatus, userId, issueId]);
  await safeQuery(`INSERT INTO "${schema}".issue_status_history (issue_id, from_status, to_status, changed_by, reason, changed_at) VALUES ($1,$2,$3,$4,$5,NOW())`,
    [issueId, fromStatus, targetStatus, userId, reason ?? null]).catch(catchHandler(EC.EVENT_BUS));
    try {
    const { emitEvent } = await import('../../../ports/events.port.js').catch(() => ({ emitEvent: () => {} }));
    if (emitEvent) await emitEvent({ tenantId, userId: userId, module: 'issues', event: 'status_changed', entityType: 'issues', entityId: issueId, data: { fromStatus, targetStatus } });
  } catch {}
return { fromStatus, toStatus: targetStatus };
}

/** Get SLA information for an issue — remaining hours before breach. */
export async function getIssueSla(tenantId: string, issueId: string): Promise<{ issueId: string; slaHours: number; remainingHours: number; breached: boolean }> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT i.id, i.priority, i.created_at, i.status,
              COALESCE(s.resolution_hours, 72) AS sla_hours
       FROM "${schema}".issues i
       LEFT JOIN "${schema}".sla_configs s ON s.entity_type = 'issue' AND s.priority = i.priority
       WHERE i.id = $1`, [issueId]);
    if (result.rows.length === 0) return { issueId, slaHours: 72, remainingHours: 0, breached: true };
    const row = result.rows[0];
    const slaHours = parseInt(row.sla_hours, 10) || 72;
    const elapsed = (Date.now() - new Date(row.created_at).getTime()) / 3600000;
    const remaining = Math.max(0, slaHours - elapsed);
    return { issueId, slaHours, remainingHours: Math.round(remaining * 10) / 10, breached: remaining <= 0 };
  } catch { return { issueId, slaHours: 72, remainingHours: 0, breached: false }; }
}

/** Get the full lifecycle history of an issue. */
export async function getLifecycleHistory(tenantId: string, issueId: string): Promise<Array<{ fromStatus: string; toStatus: string; changedBy: string; reason: string | null; changedAt: string }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(`SELECT from_status AS "fromStatus", to_status AS "toStatus", changed_by AS "changedBy", reason, changed_at AS "changedAt" FROM "${schema}".issue_status_history WHERE issue_id = $1 ORDER BY changed_at ASC`, [issueId]);
    return result.rows;
  } catch { return []; }
}

/** Run SLA escalation — find overdue open/in_progress issues and escalate. */
export async function runSlaEscalationJob(tenantId: string): Promise<{ escalated: number }> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `UPDATE "${schema}".issues SET priority = 'critical', escalated_at = NOW()
       WHERE status IN ('open','triaged','in_progress') AND priority != 'critical'
       AND created_at < NOW() - INTERVAL '72 hours' AND escalated_at IS NULL AND deleted_at IS NULL
       RETURNING id`, []);
    return { escalated: result.rows.length };
  } catch { return { escalated: 0 }; }
}
