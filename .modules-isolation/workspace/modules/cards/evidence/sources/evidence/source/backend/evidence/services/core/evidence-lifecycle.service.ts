// ============================================
// Evidence Lifecycle Service
// Law 1: Single source of truth — reads from EVIDENCE_LIFECYCLE_DEFINITIONS.
// Law 5: Uses the platform generic EntityStateMachine.
// Law 9: Only lifecycle concern — no foundation helpers.
// ============================================

import { EntityStateMachine } from '../../ports/lifecycle.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { EVIDENCE_LIFECYCLE_DEFINITIONS } from '../../data/evidence-security';
import type { EvidenceStatus } from '../../types/evidence.types';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export type { EvidenceStatus };

// ── Evidence FSM — built from registered lifecycle definitions ───────
// Law 1: transitions defined once in evidence-security.ts, consumed here.
// Law 5: parameterized by entity/module/state model via platform FSM.

type EvidenceState = typeof EVIDENCE_LIFECYCLE_DEFINITIONS.states[number];

export const EVIDENCE_STATE_MACHINE = new EntityStateMachine<EvidenceState>({
  entityType: EVIDENCE_LIFECYCLE_DEFINITIONS.entityType,
  transitions: EVIDENCE_LIFECYCLE_DEFINITIONS.transitions as unknown as Record<EvidenceState, EvidenceState[]>,
});

/**
 * Transition an evidence item's status using the platform FSM.
 * Records the transition in status_history for audit.
 */
export async function transitionStatus(
  tenantId: string,
  evidenceId: string,
  targetStatus: EvidenceStatus,
  userId: string,
  reason?: string,
): Promise<{ fromStatus: string; toStatus: string; evidenceId: string }> {
  const schema = tenantSchema(tenantId);

  // Fetch current status
  const current = await safeQuery(
    `SELECT status FROM "${schema}".evidence_evidences WHERE evidence_id = $1 AND deleted_at IS NULL`,
    [evidenceId],
  );
  if (current.rows.length === 0) {
    const err: unknown = new Error(`Evidence ${evidenceId} not found`);

    err.statusCode = 404;
    throw err;
  }

  const fromStatus: string = current.rows[0].status;

  // Delegate to platform FSM — throws InvalidTransitionError on bad transition
  await EVIDENCE_STATE_MACHINE.transition(tenantId, evidenceId, fromStatus as any, targetStatus as any, {
    actor: userId,
    reason,
  });

  // DAuth lifecycle authorization — FSM confirms valid transition, DAuth confirms user is authorized
  const { evaluateLifecycleTransition } = await import('@dos/module-auth');
  const authResult = await evaluateLifecycleTransition(tenantId, userId, {
    moduleCode: 'evidence', entityType: 'evidence', entityId: evidenceId,
    fromState: fromStatus, toState: targetStatus,
    permissionCode: 'evidence.record.approve',
    userRoles: [],
  });
  if (!authResult.allowed) {
    const err: unknown = new Error(`Transition denied: ${authResult.reason}`);

    err.statusCode = 403;
    throw err;
  }

  // Apply the DB update
  await safeQuery(
    `UPDATE "${schema}".evidence_evidences SET status = $1, updated_at = NOW(), updated_by = $2 WHERE evidence_id = $3`,
    [targetStatus, userId, evidenceId],
  );

  // Record in status history
  await safeQuery(
    `INSERT INTO "${schema}".evidence_status_history (evidence_id, from_status, to_status, changed_by, reason, changed_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [evidenceId, fromStatus, targetStatus, userId, reason ?? null],
  ).catch(catchHandler(EC.FALLBACK_QUERY, {
    operation: 'record evidence status history',
    tenantId,

    evidenceId,
  }));

  return { fromStatus, toStatus: targetStatus, evidenceId };
}

/**
 * Get the full status transition history for an evidence item.
 */
export async function getStatusHistory(
  tenantId: string,
  evidenceId: string,
): Promise<Array<{ fromStatus: string; toStatus: string; changedBy: string; reason: string | null; changedAt: string }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT from_status AS "fromStatus", to_status AS "toStatus", changed_by AS "changedBy", reason, changed_at AS "changedAt"
       FROM "${schema}".evidence_status_history
       WHERE evidence_id = $1
       ORDER BY changed_at ASC`,
      [evidenceId],
    );
    return result.rows;
  } catch {
    return [];
  }
}
/** Resolve foundation ownership data for an evidence item. */
export async function resolveFoundationOwnership(
  tenantId: string, evidenceId: string,
): Promise<{ ownerId: string | null; departmentId: string | null; businessUnitId: string | null }> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT owner_id, department_id, business_unit_id FROM "${schema}".evidence_evidences WHERE evidence_id = $1`, [evidenceId]);
    const row = result.rows[0];
    return row ? { ownerId: row.owner_id, departmentId: row.department_id, businessUnitId: row.business_unit_id } : { ownerId: null, departmentId: null, businessUnitId: null };
  } catch { return { ownerId: null, departmentId: null, businessUnitId: null }; }
}
