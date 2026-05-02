/**
 * Action Completion Service
 * Handles completion readiness checks, evidence validation, and verification recording.
 * @owner Module:action
 */
import { safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { recordAudit } from '../ports/audit.port';
import { emitEvent } from '../ports/events.port';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompletionStatus {
  actionId: string;
  status: string;
  evidenceCount: number;
  submittedBy: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  completedAt: string | null;
  verificationRequired: boolean;
  verificationMethod: string | null;
  progressPercent: number;
}

export interface CompletionReadiness {
  ready: boolean;
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Completion status
// ---------------------------------------------------------------------------

/** Get the completion status for an action item including evidence count. */
export async function getCompletionStatus(
  tenantId: string,
  actionId: string,
): Promise<CompletionStatus> {
  const schema = tenantSchema(tenantId);

  const itemResult = await safeQuery(
    `SELECT action_id, status, completed_by, verified_by, verified_at,
            completed_at, verification_required, verification_method,
            progress_percentage
     FROM "${schema}".action_items
     WHERE action_id = $1 AND deleted_at IS NULL`,
    [actionId],
  );

  if (itemResult.rows.length === 0) {
    throw Object.assign(new Error('Action item not found'), { statusCode: 404 });
  }

  const row = itemResult.rows[0];

  const evidenceResult = await safeQuery(
    `SELECT COUNT(*)::int AS count
     FROM "${schema}".action_evidence
     WHERE action_id = $1`,
    [actionId],
  ).catch((_err: unknown) => {
    logger.warn('action_evidence table query failed, defaulting to 0', { actionId });
    return { rows: [{ count: 0 }] };
  });

  const evidenceCount: number = evidenceResult.rows[0]?.count ?? 0;

  return {
    actionId: row.action_id,
    status: row.status,
    evidenceCount,
    submittedBy: row.completed_by ?? null,
    verifiedBy: row.verified_by ?? null,
    verifiedAt: row.verified_at ?? null,
    completedAt: row.completed_at ?? null,
    verificationRequired: row.verification_required ?? false,
    verificationMethod: row.verification_method ?? null,
    progressPercent: Number(row.progress_percentage ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Readiness check
// ---------------------------------------------------------------------------

/** Validate whether an action item is ready for completion submission. */
export async function validateCompletionReadiness(
  tenantId: string,
  actionId: string,
): Promise<CompletionReadiness> {
  const schema = tenantSchema(tenantId);
  const reasons: string[] = [];

  const itemResult = await safeQuery(
    `SELECT status, assigned_to, verification_required
     FROM "${schema}".action_items
     WHERE action_id = $1 AND deleted_at IS NULL`,
    [actionId],
  );

  if (itemResult.rows.length === 0) {
    return { ready: false, reasons: ['Action item not found'] };
  }

  const row = itemResult.rows[0];

  if (row.status !== 'in_progress') {
    reasons.push(`Status must be 'in_progress' to submit completion, current status: '${row.status}'`);
  }

  if (!row.assigned_to) {
    reasons.push('Action item has no assigned user');
  }

  if (row.verification_required) {
    const evidenceResult = await safeQuery(
      `SELECT COUNT(*)::int AS count
       FROM "${schema}".action_evidence
       WHERE action_id = $1`,
      [actionId],
    ).catch((_err: unknown) => {
      logger.warn('action_evidence table query failed during readiness check', { actionId });
      return { rows: [{ count: 0 }] };
    });

    const evidenceCount: number = evidenceResult.rows[0]?.count ?? 0;
    if (evidenceCount === 0) {
      reasons.push('Verification is required but no evidence has been attached');
    }
  }

  const blockerResult = await safeQuery(
    `SELECT COUNT(*)::int AS count
     FROM "${schema}".action_blockers
     WHERE action_id = $1 AND resolved_at IS NULL`,
    [actionId],
  ).catch((_err: unknown) => {
    logger.warn('action_blockers table query failed, assuming no blockers', { actionId });
    return { rows: [{ count: 0 }] };
  });

  const unresolvedBlockers: number = blockerResult.rows[0]?.count ?? 0;
  if (unresolvedBlockers > 0) {
    reasons.push(`${unresolvedBlockers} unresolved blocker(s) remain`);
  }

  const ready = reasons.length === 0;
  logger.info('Completion readiness evaluated', { actionId, ready, reasonCount: reasons.length });
  return { ready, reasons };
}

// ---------------------------------------------------------------------------
// Verification recording
// ---------------------------------------------------------------------------

/** Record verification of a completed action item. */
export async function recordVerification(
  tenantId: string,
  actionId: string,
  verifiedBy: string,
): Promise<{ actionId: string; verifiedBy: string; verifiedAt: string }> {
  const schema = tenantSchema(tenantId);

  const itemResult = await safeQuery(
    `SELECT status, completed_by FROM "${schema}".action_items
     WHERE action_id = $1 AND deleted_at IS NULL`,
    [actionId],
  );

  if (itemResult.rows.length === 0) {
    throw Object.assign(new Error('Action item not found'), { statusCode: 404 });
  }

  const row = itemResult.rows[0];

  if (row.status !== 'completed') {
    throw Object.assign(
      new Error(`Cannot verify action in '${row.status}' status, must be 'completed'`),
      { statusCode: 400 },
    );
  }

  if (row.completed_by === verifiedBy) {
    throw Object.assign(
      new Error('Verifier must be different from the person who completed the item'),
      { statusCode: 400 },
    );
  }

  const updateResult = await safeQuery(
    `UPDATE "${schema}".action_items
     SET verified_by = $1, verified_at = NOW(), updated_at = NOW(), updated_by = $1
     WHERE action_id = $2
     RETURNING verified_at`,
    [verifiedBy, actionId],
  );

  const verifiedAt: string = updateResult.rows[0].verified_at;

  recordAudit({
    tenantId,
    userId: verifiedBy,
    module: 'action',
    action: 'update',
    entityType: 'action_item',
    entityId: actionId,
    beforeState: { verified_by: null },
    afterState: { verified_by: verifiedBy, verified_at: verifiedAt },
  }).catch(catchHandler(EC.EVENT_BUS));

  emitEvent({
    eventType: 'action.action_item.verified',
    tenantId,
    sourceService: 'action',
    severity: 'info',
    payload: { actionId, verifiedBy, verifiedAt },
  } as never).catch(catchHandler(EC.EVENT_BUS));

  logger.info('Action item verification recorded', { actionId, verifiedBy, verifiedAt });
  return { actionId, verifiedBy, verifiedAt };
}
