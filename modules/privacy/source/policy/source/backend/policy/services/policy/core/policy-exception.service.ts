/**
 * Policy Exception Service
 *
 * Manages policy exception requests through their full lifecycle:
 * create, approve, reject, renew, close, and expiry monitoring.
 *
 * All exceptions are tenant-scoped and emit GRC events for
 * automation rule evaluation.
 */

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { emitEvent } from '../../../ports/events.port';
import { getFirstRow } from '@dos/db';
import { v4 as uuid } from 'uuid';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CreateExceptionData {
  policyId: string;
  policyClauseScope?: string;
  reason: string;
  businessJustification?: string;
  compensatingControls?: string;
  riskAssessment?: string;
  requestedBy: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ExceptionFilters {
  status?: string;
  policyId?: string;
  expiringBefore?: string;
}

export interface ApproveExceptionData {
  comment?: string;
  conditions?: string;
  expiryDate: string;
}

export interface RejectExceptionData {
  reason: string;
  comment?: string;
}

export interface RenewExceptionData {
  newExpiryDate: string;
  comment?: string;
}

// ── Functions ────────────────────────────────────────────────────────────────

/**
 * Create a new policy exception request.
 * Inserts into policy_exception_requests and emits a GRC event.
 */
export async function createExceptionRequest(
  tenantId: string,
  data: CreateExceptionData,
): Promise<Record<string, unknown>> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.policy_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

/**
 * List policy exception requests with optional filters.
 */
export async function listExceptions(
  tenantId: string,
  filters?: ExceptionFilters,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['1 = 1'];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.status) {
    conditions.push(`per.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters?.policyId) {
    conditions.push(`per.policy_id = $${idx++}`);
    params.push(filters.policyId);
  }
  if (filters?.expiringBefore) {
    conditions.push(`per.expiry_date <= $${idx++}`);
    params.push(filters.expiringBefore);
  }

  const res = await safeQuery(
    `SELECT per.*,
            gp.title AS policy_title
     FROM "${schema}".policy_exception_requests per
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = per.policy_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY per.created_at DESC`,
    params,
  );

  return res.rows;
}

/**
 * Get a single policy exception by ID.
 */
export async function getException(
  tenantId: string,
  exceptionId: string,
): Promise<Record<string, unknown> | null> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `SELECT per.*,
            gp.title AS policy_title
     FROM "${schema}".policy_exception_requests per
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = per.policy_id
     WHERE per.exception_id = $1`,
    [exceptionId],
  );

  return getFirstRow(res);
}

/**
 * Approve a policy exception request.
 * Updates the request status to 'approved', sets the expiry date,
 * and records the approval in policy_exception_approvals.
 */
export async function approveException(
  tenantId: string,
  exceptionId: string,
  userId: string,
  data: ApproveExceptionData,
): Promise<Record<string, unknown> | null> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `UPDATE "${schema}".policy_exception_requests
     SET status = 'approved',
         expiry_date = $2,
         approved_by = $3,
         approved_at = NOW(),
         updated_at = NOW()
     WHERE exception_id = $1 AND status = 'pending'
     RETURNING *`,
    [exceptionId, data.expiryDate, userId],
  );

  const row = getFirstRow(res)!;
  if (!row) return null;

  // Record the approval decision
  await safeQuery(
    `INSERT INTO "${schema}".policy_exception_approvals
     (approval_id, exception_id, decision, approver_user_id, comment, conditions, decided_at)
     VALUES ($1, $2, 'approved', $3, $4, $5, NOW())`,
    [uuid(), exceptionId, userId, data.comment ?? null, data.conditions ?? null],
  );

  await emitEvent(({
      tenantId,
      userId,
      module: 'policies',
      event: 'approved',
      entityType: 'policy_exception',
      entityId: exceptionId,
      data: { expiryDate: data.expiryDate },
    } as any));

  return row;
}

/**
 * Reject a policy exception request.
 * Updates the request status to 'rejected' and records the rejection.
 */
export async function rejectException(
  tenantId: string,
  exceptionId: string,
  userId: string,
  data: RejectExceptionData,
): Promise<Record<string, unknown> | null> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `UPDATE "${schema}".policy_exception_requests
     SET status = 'rejected',
         rejected_by = $2,
         rejected_at = NOW(),
         updated_at = NOW()
     WHERE exception_id = $1 AND status = 'pending'
     RETURNING *`,
    [exceptionId, userId],
  );

  const row = getFirstRow(res)!;
  if (!row) return null;

  await safeQuery(
    `INSERT INTO "${schema}".policy_exception_approvals
     (approval_id, exception_id, decision, approver_user_id, comment, reason, decided_at)
     VALUES ($1, $2, 'rejected', $3, $4, $5, NOW())`,
    [uuid(), exceptionId, userId, data.comment ?? null, data.reason],
  );

  await emitEvent(({
      tenantId,
      userId,
      module: 'policies',
      event: 'rejected',
      entityType: 'policy_exception',
      entityId: exceptionId,
      data: { reason: data.reason },
    } as any));

  return row;
}

/**
 * Renew an approved exception with a new expiry date.
 * Sets status to 'renewed' and records the renewal decision.
 */
export async function renewException(
  tenantId: string,
  exceptionId: string,
  userId: string,
  data: RenewExceptionData,
): Promise<Record<string, unknown> | null> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `UPDATE "${schema}".policy_exception_requests
     SET status = 'renewed',
         expiry_date = $2,
         updated_at = NOW()
     WHERE exception_id = $1 AND status IN ('approved', 'renewed')
     RETURNING *`,
    [exceptionId, data.newExpiryDate],
  );

  const row = getFirstRow(res)!;
  if (!row) return null;

  await safeQuery(
    `INSERT INTO "${schema}".policy_exception_approvals
     (approval_id, exception_id, decision, approver_user_id, comment, decided_at)
     VALUES ($1, $2, 'renew', $3, $4, NOW())`,
    [uuid(), exceptionId, userId, data.comment ?? null],
  );

  await emitEvent(({
      tenantId,
      userId,
      module: 'policies',
      event: 'updated',
      entityType: 'policy_exception',
      entityId: exceptionId,
      data: { action: 'renewed', newExpiryDate: data.newExpiryDate },
    } as any));

  return row;
}

/**
 * Close an exception manually.
 * Sets status to 'closed' with closing metadata.
 */
export async function closeException(
  tenantId: string,
  exceptionId: string,
  userId: string,
  comment?: string,
): Promise<Record<string, unknown> | null> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `UPDATE "${schema}".policy_exception_requests
     SET status = 'closed',
         closed_by = $2,
         closed_at = NOW(),
         close_comment = $3,
         updated_at = NOW()
     WHERE exception_id = $1 AND status NOT IN ('closed', 'rejected')
     RETURNING *`,
    [exceptionId, userId, comment ?? null],
  );

  const row = getFirstRow(res)!;
  if (!row) return null;

  await emitEvent(({
      tenantId,
      userId,
      module: 'policies',
      event: 'status_changed',
      entityType: 'policy_exception',
      entityId: exceptionId,
      data: { newStatus: 'closed' },
    } as any));

  return row;
}

/**
 * Get approved exceptions expiring within the specified number of days.
 * Used by scheduled jobs to trigger renewal reminders.
 */
export async function getExpiringExceptions(
  tenantId: string,
  daysAhead: number,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `SELECT per.*,
            gp.title AS policy_title
     FROM "${schema}".policy_exception_requests per
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = per.policy_id
     WHERE per.status IN ('approved', 'renewed')
       AND per.expiry_date <= NOW() + ($1::int * INTERVAL '1 day')
       AND per.expiry_date > NOW()
     ORDER BY per.expiry_date ASC`,
    [daysAhead],
  );

  return res.rows;
}
