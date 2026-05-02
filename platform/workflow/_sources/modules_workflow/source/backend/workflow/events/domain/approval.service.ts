import { randomUUID } from 'crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface ApprovalRequest {
  approval_id: string;
  tenant_id: string;
  workflow_instance_id: string;
  subject: string | null;
  status: string;
  requested_by: string;
  approvers: string[];
  approved_by: string | null;
  rejected_by: string | null;
  escalated_by: string | null;
  escalated_to: string | null;
  comment: string | null;
  reject_reason: string | null;
  escalation_reason: string | null;
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface RequestApprovalInput {
  tenantId: string;
  workflowInstanceId: string;
  requestedBy: string;
  approvers: string[];
  subject?: string;
  context?: Record<string, unknown>;
}

export interface ListApprovalsInput {
  tenantId: string;
  limit: number;
  offset: number;
  status?: string;
  workflowInstanceId?: string;
}

export async function getApproval(approvalId: string, tenantId: string): Promise<ApprovalRequest | null> {
  try {
    const result = await safeQuery(
      `SELECT approval_id, tenant_id, workflow_instance_id, subject, status,
              requested_by, approvers, approved_by, rejected_by, escalated_by, escalated_to,
              comment, reject_reason, escalation_reason, context, created_at, updated_at, resolved_at
       FROM dos.workflow_approvals
       WHERE approval_id = $1 AND tenant_id = $2`,
      [approvalId, tenantId],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as ApprovalRequest;
  } catch (err) {
    logger.error('[Workflow] Failed to fetch approval', { approvalId, tenantId, error: toErrorMessage(err) });
    return null;
  }
}

export async function requestApproval(input: RequestApprovalInput): Promise<ApprovalRequest> {
  const approvalId = randomUUID();
  const context = input.context ? JSON.stringify(input.context) : '{}';
  const approvers = JSON.stringify(input.approvers);

  try {
    await safeQuery(
      `INSERT INTO dos.workflow_approvals
         (approval_id, tenant_id, workflow_instance_id, subject, status, requested_by, approvers, context, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, NOW(), NOW())`,
      [approvalId, input.tenantId, input.workflowInstanceId, input.subject || null, input.requestedBy, approvers, context],
    );

    logger.info('[Workflow] Approval requested', { approvalId, tenantId: input.tenantId, workflowInstanceId: input.workflowInstanceId });

    const approval = await getApproval(approvalId, input.tenantId);
    if (!approval) throw new Error('Failed to retrieve created approval request');
    return approval;
  } catch (err) {
    logger.error('[Workflow] Failed to request approval', { tenantId: input.tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function listApprovals(input: ListApprovalsInput): Promise<{ data: ApprovalRequest[]; total: number }> {
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [input.tenantId];
  let idx = 2;

  if (input.status) {
    conditions.push(`status = $${idx}`);
    params.push(input.status);
    idx++;
  }
  if (input.workflowInstanceId) {
    conditions.push(`workflow_instance_id = $${idx}`);
    params.push(input.workflowInstanceId);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(input.limit, 200);
  const offset = input.offset;

  try {
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.workflow_approvals ${where}`,
      params,
    );
    const total = (countResult.rows[0] as { total: number })?.total || 0;

    const dataResult = await safeQuery(
      `SELECT approval_id, tenant_id, workflow_instance_id, subject, status,
              requested_by, approvers, approved_by, rejected_by, escalated_by, escalated_to,
              comment, reject_reason, escalation_reason, context, created_at, updated_at, resolved_at
       FROM dos.workflow_approvals ${where}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as ApprovalRequest[], total };
  } catch (err) {
    logger.error('[Workflow] Failed to list approvals', { tenantId: input.tenantId, error: toErrorMessage(err) });
    return { data: [], total: 0 };
  }
}

export async function approveRequest(
  approvalId: string,
  tenantId: string,
  approverId: string,
  comment?: string,
): Promise<ApprovalRequest | null> {
  try {
    const approval = await getApproval(approvalId, tenantId);
    if (!approval) return null;

    await safeQuery(
      `UPDATE dos.workflow_approvals
       SET status = 'approved', approved_by = $1, comment = $2, resolved_at = NOW(), updated_at = NOW()
       WHERE approval_id = $3 AND tenant_id = $4`,
      [approverId, comment || null, approvalId, tenantId],
    );

    logger.info('[Workflow] Approval approved', { approvalId, tenantId, approverId });
    return getApproval(approvalId, tenantId);
  } catch (err) {
    logger.error('[Workflow] Failed to approve request', { approvalId, tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function rejectRequest(
  approvalId: string,
  tenantId: string,
  rejectedBy: string,
  reason?: string,
): Promise<ApprovalRequest | null> {
  try {
    const approval = await getApproval(approvalId, tenantId);
    if (!approval) return null;

    await safeQuery(
      `UPDATE dos.workflow_approvals
       SET status = 'rejected', rejected_by = $1, reject_reason = $2, resolved_at = NOW(), updated_at = NOW()
       WHERE approval_id = $3 AND tenant_id = $4`,
      [rejectedBy, reason || null, approvalId, tenantId],
    );

    logger.info('[Workflow] Approval rejected', { approvalId, tenantId, rejectedBy });
    return getApproval(approvalId, tenantId);
  } catch (err) {
    logger.error('[Workflow] Failed to reject request', { approvalId, tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function escalateRequest(
  approvalId: string,
  tenantId: string,
  escalatedBy: string,
  escalateTo: string,
  reason?: string,
): Promise<ApprovalRequest | null> {
  try {
    const approval = await getApproval(approvalId, tenantId);
    if (!approval) return null;

    await safeQuery(
      `UPDATE dos.workflow_approvals
       SET status = 'escalated', escalated_by = $1, escalated_to = $2, escalation_reason = $3, updated_at = NOW()
       WHERE approval_id = $4 AND tenant_id = $5`,
      [escalatedBy, escalateTo, reason || null, approvalId, tenantId],
    );

    logger.info('[Workflow] Approval escalated', { approvalId, tenantId, escalatedBy, escalateTo });
    return getApproval(approvalId, tenantId);
  } catch (err) {
    logger.error('[Workflow] Failed to escalate request', { approvalId, tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export const ApprovalService = {
  getApproval,
  requestApproval,
  listApprovals,
  approveRequest,
  rejectRequest,
  escalateRequest,
};
