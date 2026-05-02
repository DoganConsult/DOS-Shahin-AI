import { safeQuery, tenantSchema } from '../ports/database.port';
import { logger as _logger } from '../ports/logger.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import {
  RISK_TRANSITIONS, RISK_TREATMENT_TRANSITIONS, RISK_ASSESSMENT_TRANSITIONS,
  RISK_KRI_TRANSITIONS,
} from '../workflows/risk-lifecycle';
import { NotFoundError } from '../../../errors/index';
import { evaluateLifecycleTransition } from '../ports/auth.port';
import { emitEvent } from '../ports/events.port';

const ENTITY_TABLE_MAP: Record<string, string> = {
  risk: 'risks',
  assessment: 'risk_assessments',
  treatment: 'risk_treatment_reviews',
  kri: 'risk_kris',
};

const ENTITY_TRANSITION_MAP: Record<string, Record<string, string[]>> = {
  risk: RISK_TRANSITIONS as Record<string, string[]>,
  assessment: RISK_ASSESSMENT_TRANSITIONS as Record<string, string[]>,
  treatment: RISK_TREATMENT_TRANSITIONS as Record<string, string[]>,
  kri: RISK_KRI_TRANSITIONS as Record<string, string[]>,
};

const _APPROVAL_TRANSITIONS = new Set(['treatment_planned->approved', 'in_review->approved', 'under_review->assessed']);

export async function transitionStatus(
  tenantId: string, entityId: string, targetStatus: string, userId: string,
  entityType: 'risk' | 'assessment' | 'treatment' | 'kri' = 'risk', reason?: string,
): Promise<{ fromStatus: string; toStatus: string }> {
  const schema = tenantSchema(tenantId);
  const table = ENTITY_TABLE_MAP[entityType] || 'risks';
  const transitions = ENTITY_TRANSITION_MAP[entityType] || RISK_TRANSITIONS;
  const current = await safeQuery(`SELECT status, owner_id, created_by FROM "${schema}"."${table}" WHERE id = $1`, [entityId]);
  if (current.rows.length === 0) throw new NotFoundError(`risk ${entityType}`, entityId);
  const fromStatus: string = current.rows[0].status;
  const ownerId: string | null = current.rows[0].owner_id ?? current.rows[0].created_by ?? null;
  const allowed: string[] = transitions[fromStatus] || [];
  if (!allowed.includes(targetStatus)) {
    const err = new Error(`Cannot transition ${entityType} from '${fromStatus}' to '${targetStatus}'. Allowed: [${allowed.join(', ')}]`);
    (err as any).statusCode = 400;
    throw err;
  }
  
  // DAuth lifecycle transition validation
  const lcResult = await evaluateLifecycleTransition(tenantId, userId, {
    moduleCode: 'risk',
    entityType,
    entityId,
    fromState: fromStatus,
    toState: targetStatus,
    permissionCode: `risk.${entityType}.transition`,
    userRoles: [], // Will be populated by middleware
    ownerId: ownerId || undefined
  });
  
  if (!lcResult.allowed) {
    const err = new Error(`Transition denied: ${lcResult.reason}`);
    (err as any).statusCode = 403;
    throw err;
  }

  await safeQuery(`UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW(), updated_by = $3 WHERE id = $2`, [targetStatus, entityId, userId]);
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'risk','transition',$3,$4,$5,$6)`,
    [tenantId, userId, entityType, entityId, JSON.stringify({ status: fromStatus, reason }), JSON.stringify({ status: targetStatus })],
  ).catch(catchHandler(EC.EVENT_BUS));
  try {
    await emitEvent({ tenantId, userId, module: 'risk', event: 'status_changed', entityType, entityId, data: { fromStatus, targetStatus } });
  } catch {}
return { fromStatus, toStatus: targetStatus };
}

export async function bulkTransitionStatus(
  tenantId: string, entityIds: string[], targetStatus: string, userId: string,
  entityType: 'risk' | 'assessment' | 'treatment' | 'kri' = 'risk',
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
      `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'risk' AND action = 'transition' ORDER BY created_at ASC`,
      [entityId],
    );
    return result.rows;
  } catch { return []; }
}

export async function getLifecycleState(tenantId: string, entityId: string): Promise<{ entityId: string; status: string; slaHours: number; remainingHours: number; breached: boolean } | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(`SELECT id, status, created_at FROM "${schema}".risks WHERE id = $1`, [entityId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const slaHours = 168;
    const elapsed = (Date.now() - new Date(row.created_at).getTime()) / 3600000;
    const remaining = Math.max(0, slaHours - elapsed);
    return { entityId, status: row.status, slaHours, remainingHours: Math.round(remaining * 10) / 10, breached: remaining <= 0 };
  } catch { return null; }
}

export async function getAvailableTransitions(currentState: string, entityType: 'risk' | 'assessment' | 'treatment' | 'kri' = 'risk'): Promise<string[]> {
  const transitions = ENTITY_TRANSITION_MAP[entityType] || RISK_TRANSITIONS;
  return transitions[currentState] ?? [];
}

export async function getHighRisks(tenantId: string): Promise<Array<{ id: string; status: string; updatedAt: string }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".risks WHERE status = 'critical' ORDER BY updated_at ASC LIMIT 100`,
    );
    return result.rows;
  } catch { return []; }
}

export async function getOverdueAssessments(tenantId: string): Promise<Array<{ id: string; status: string; updatedAt: string }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".risk_assessments WHERE status = 'overdue' ORDER BY updated_at ASC LIMIT 100`,
    );
    return result.rows;
  } catch { return []; }
}
