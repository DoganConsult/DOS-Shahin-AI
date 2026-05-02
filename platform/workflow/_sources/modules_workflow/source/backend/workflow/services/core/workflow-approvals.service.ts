// ============================================
// AGRC-OS — Workflow Approvals Service (Core)
// Manages approval steps within workflow executions:
// create, resolve, escalate, query, precondition checks
// Requirements: Patch 7 §3, MP-02
// ============================================

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { NotFoundError, ValidationError, ConflictError } from '../../../../errors/index';
import type { GenericRow } from '../../ports/platform.port';
import type { ApprovalRecord } from '../../ports/lifecycle.port';

// ── Types ────────────────────────────────────────────────────────

/** Decision a resolver can submit for an approval step. */
export type ApprovalDecision = 'approved' | 'rejected';

/** Result of a precondition evaluation. */
export interface PreconditionResult {
  valid: boolean;
  missing: string[];
}

/** Compact approval queue entry for UI rendering. */
export interface ApprovalQueueEntry {
  approval_id: string;
  execution_id: string;
  step_id: string;
  approver_id: string;
  status: string;
  sla_deadline: string | null;
  created_at: string;
  workflow_name?: string;
}

/** Approval history entry with resolver metadata. */
export interface ApprovalHistoryEntry {
  approval_id: string;
  execution_id: string;
  step_id: string;
  approver_id: string;
  status: string;
  decision_comment: string | null;
  decided_at: string | null;
  escalated_to: string | null;
  created_at: string;
}

// ── Create Approval ──────────────────────────────────────────────

/**
 * Create an approval step record for a running workflow execution.
 * Inserts into workflow_approvals with SLA deadline and escalation chain.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param executionId - Workflow execution that owns this approval
 * @param approverId - User or role code of the intended approver
 * @param slaHours - Hours until the approval is considered overdue
 * @param escalationChain - Ordered list of fallback approver IDs
 * @returns The created approval record
 */
export async function createApprovalStep(
  tenantId: string,
  executionId: string,
  approverId: string,
  slaHours: number = 24,
  escalationChain: string[] = [],
): Promise<ApprovalRecord> {
  const schema = tenantSchema(tenantId);
  const approvalId = uuid();
  const deadline = new Date(Date.now() + slaHours * 3600_000);
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_approvals
      (approval_id, execution_id, step_id, approver_id, status, sla_deadline, escalation_chain, created_at)
     VALUES ($1, $2, NULL, $3, 'pending', $4, $5::jsonb, NOW())
     RETURNING *`,
    [approvalId, executionId, approverId, deadline, JSON.stringify(escalationChain)],
  );
  return result.rows[0] as any as ApprovalRecord;
}

// ── Resolve Approval ─────────────────────────────────────────────

/**
 * Record a decision (approve or reject) on a pending approval step.
 * Prevents double-resolution via status guard.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param approvalId - The approval record to resolve
 * @param decision - 'approved' or 'rejected'
 * @param notes - Optional comment from the resolver
 * @returns The updated approval record
 */
export async function resolveApproval(
  tenantId: string,
  approvalId: string,
  decision: ApprovalDecision,
  notes?: string,
): Promise<ApprovalRecord> {
  if (decision !== 'approved' && decision !== 'rejected') {
    throw new ValidationError([{ path: 'decision', message: 'Must be "approved" or "rejected"' }]);
  }

  const schema = tenantSchema(tenantId);

  // Guard: only pending approvals can be resolved
  const existing = await safeQuery(
    `SELECT status FROM "${schema}".workflow_approvals WHERE approval_id = $1`,
    [approvalId],
  );
  const current = getFirstRow(existing)!;
  if (!current) {
    throw new NotFoundError('workflow_approval', approvalId);
  }
  if (current.status !== 'pending' && current.status !== 'escalated') {
    throw new ConflictError(
      `Approval ${approvalId} is already ${current.status} — cannot resolve`,
    );
  }

  const result = await safeQuery(
    `UPDATE "${schema}".workflow_approvals
     SET status = $1, decision_comment = $2, decided_at = NOW()
     WHERE approval_id = $3
     RETURNING *`,
    [decision, notes || null, approvalId],
  );

  const row = getFirstRow(result)!;
  if (!row) {
    throw new NotFoundError('workflow_approval', approvalId);
  }

  // Log the decision to the process audit trail (non-fatal)
  await safeQuery(
    `INSERT INTO "${schema}".process_audit_trail
       (entity_type, entity_id, action, action_details, performed_by)
     VALUES ('workflow_approval', $1, $2, $3, $4)`,
    [
      approvalId,
      `approval_${decision}`,
      JSON.stringify({ decision, notes: notes || null }),
      current.approver_id || 'system',
    ],
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  return mapRowToApproval(row);
}

// ── Escalate Approval ────────────────────────────────────────────

/**
 * Escalate a pending approval to the next person in the escalation chain.
 * If no explicit target is provided, the next person in the chain is selected.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param approvalId - The approval to escalate
 * @param escalateTo - Explicit escalation target (overrides chain)
 * @returns The updated approval record
 */
export async function escalateApproval(
  tenantId: string,
  approvalId: string,
  escalateTo?: string,
): Promise<ApprovalRecord> {
  const schema = tenantSchema(tenantId);

  const existing = await safeQuery(
    `SELECT * FROM "${schema}".workflow_approvals WHERE approval_id = $1`,
    [approvalId],
  );
  const current = getFirstRow(existing)!;
  if (!current) {
    throw new NotFoundError('workflow_approval', approvalId);
  }
  if (current.status !== 'pending') {
    throw new ConflictError(`Cannot escalate approval in status "${current.status}"`);
  }

  // Determine escalation target
  const chain: string[] = Array.isArray(current.escalation_chain)
    ? current.escalation_chain
    : JSON.parse(current.escalation_chain || '[]');

  let target = escalateTo;
  if (!target && chain.length > 0) {
    // Pick the first chain entry that is not the current approver
    target = chain.find((c: string) => c !== current.approver_id) || chain[0];
  }
  if (!target) {
    throw new ValidationError([{ path: 'escalateTo', message: 'No escalation target available' }]);
  }

  const result = await safeQuery(
    `UPDATE "${schema}".workflow_approvals
     SET status = 'escalated',
         approver_id = $1,
         sla_deadline = NOW() + INTERVAL '24 hours'
     WHERE approval_id = $2
     RETURNING *`,
    [target, approvalId],
  );

  // Audit trail
  await safeQuery(
    `INSERT INTO "${schema}".process_audit_trail
       (entity_type, entity_id, action, action_details, performed_by)
     VALUES ('workflow_approval', $1, 'escalated', $2, 'system')`,
    [approvalId, JSON.stringify({ from: current.approver_id, to: target })],
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  return mapRowToApproval(getFirstRow(result)!);
}

// ── Query Functions ──────────────────────────────────────────────

/**
 * Get the approval queue for a given approver (pending items only).
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param approverId - The user/role to query approvals for
 * @returns List of pending approval entries
 */
export async function getApprovalQueue(
  tenantId: string,
  approverId: string,
): Promise<ApprovalQueueEntry[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT wa.*, wi.workflow_id
     FROM "${schema}".workflow_approvals wa
     LEFT JOIN "${schema}".workflow_instances wi ON wi.execution_id = wa.execution_id
     WHERE wa.approver_id = $1
       AND wa.status IN ('pending', 'escalated')
     ORDER BY wa.sla_deadline ASC NULLS LAST, wa.created_at ASC`,
    [approverId],
  );

  return result.rows.map((row: GenericRow) => ({
    approval_id: row.approval_id,
    execution_id: row.execution_id,
    step_id: row.step_id,
    approver_id: row.approver_id,
    status: row.status,
    sla_deadline: row.sla_deadline,
    created_at: row.created_at,
    workflow_name: row.workflow_name || undefined,
  }));
}

/**
 * Get approval history for a specific execution.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param executionId - The execution to get approval history for
 * @returns Ordered list of approval history entries
 */
export async function getApprovalHistory(
  tenantId: string,
  executionId: string,
): Promise<ApprovalHistoryEntry[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_approvals
     WHERE execution_id = $1
     ORDER BY created_at ASC`,
    [executionId],
  );

  return result.rows.map((row: GenericRow) => ({
    approval_id: row.approval_id,
    execution_id: row.execution_id,
    step_id: row.step_id,
    approver_id: row.approver_id,
    status: row.status,
    decision_comment: row.decision_comment,
    decided_at: row.decided_at,
    escalated_to: row.escalated_to || null,
    created_at: row.created_at,
  }));
}

/**
 * Check approval status by ID.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param approvalId - The approval to check
 * @returns The approval record or null if not found
 */
export async function checkApprovalStatus(
  tenantId: string,
  approvalId: string,
): Promise<ApprovalRecord | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_approvals WHERE approval_id = $1`,
    [approvalId],
  );

  const row = getFirstRow(result)!;
  return row ? mapRowToApproval(row) : null;
}

/**
 * Get all overdue approvals that have passed their SLA deadline.
 * Used by the escalation cron job.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @returns List of overdue approval records
 */
export async function getOverdueApprovals(
  tenantId: string,
): Promise<ApprovalRecord[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_approvals
     WHERE status = 'pending'
       AND sla_deadline IS NOT NULL
       AND sla_deadline < NOW()
     ORDER BY sla_deadline ASC`,
  );

  return result.rows.map((row: GenericRow) => mapRowToApproval(row));
}

// ── Precondition Check ───────────────────────────────────────────

/**
 * Check whether all preconditions for a workflow step are met.
 * Evaluates required approvals and optional evidence requirements.
 *
 * @param approvals - Array of approval objects with status field
 * @param evidencePresent - Whether required evidence has been provided
 * @param requiredApprovals - Minimum number of approved approvals needed
 * @param requiredEvidence - Whether evidence is mandatory
 * @returns Validation result with list of missing items
 */
export function checkPreconditions(
  approvals: Array<{ status: string }>,
  evidencePresent: boolean,
  requiredApprovals: number,
  requiredEvidence: boolean,
): PreconditionResult {
  const missing: string[] = [];

  const approvedCount = approvals.filter(a => a.status === 'approved').length;
  if (approvedCount < requiredApprovals) {
    missing.push(
      `Requires ${requiredApprovals} approval(s), only ${approvedCount} received`,
    );
  }

  if (requiredEvidence && !evidencePresent) {
    missing.push('Required evidence not provided');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

// ── Helpers ──────────────────────────────────────────────────────

/** Map a database row to a typed ApprovalRecord. */
function mapRowToApproval(row: GenericRow): ApprovalRecord {
  const chain = row.escalation_chain;
  const parsedChain: string[] = Array.isArray(chain)
    ? chain
    : (typeof chain === 'string' ? JSON.parse(chain || '[]') : []);

  return {
    approval_id: row.approval_id,

    execution_id: row.execution_id,
    step_id: row.step_id,
    approver_id: row.approver_id,
    status: row.status,
    sla_deadline: row.sla_deadline || null,
    escalation_chain: parsedChain,
    decision_comment: row.decision_comment || null,
    decided_at: row.decided_at || null,
    created_at: row.created_at,
  };
}
