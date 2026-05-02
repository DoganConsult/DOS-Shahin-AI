import { safeQuery } from '@dos/db';
import { publish } from '../../events';
import { v4 as uuid } from 'uuid';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface ReleaseApproval {
  approvalId: string;
  releaseId: string;
  approvalRole: string;
  requiredBy: string;
  approvedBy: string | null;
  status: ApprovalStatus;
  comments: string | null;
  requestedAt: string;
  resolvedAt: string | null;
}

export async function requestApproval(input: {
  releaseId: string;
  approvalRole: string;
  requiredBy: string;
}): Promise<ReleaseApproval> {
  const approvalId = uuid();
  const now = new Date().toISOString();
  await safeQuery(
    `INSERT INTO public.dos_release_approvals (
      approval_id, release_id, approval_role, required_by,
      approved_by, status, comments, requested_at, resolved_at
    ) VALUES ($1,$2,$3,$4,NULL,'pending',NULL,$5,NULL)`,
    [approvalId, input.releaseId, input.approvalRole, input.requiredBy, now],
  );
  await publish('delivery.approval.requested', 'platform', {
    approvalId,
    releaseId: input.releaseId,
    approvalRole: input.approvalRole,
  }, {});
  return getApproval(approvalId) as Promise<ReleaseApproval>;
}

export async function approveRelease(
  approvalId: string,
  approvedBy: string,
  comments?: string,
): Promise<ReleaseApproval | null> {
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_release_approvals
     SET status = 'approved', approved_by = $1, comments = $2, resolved_at = $3
     WHERE approval_id = $4`,
    [approvedBy, comments ?? null, now, approvalId],
  );
  const approval = await getApproval(approvalId);
  if (approval) {
    await publish('delivery.approval.granted', 'platform', {
      approvalId,
      releaseId: approval.releaseId,
      approvedBy,
    }, {});
  }
  return approval;
}

export async function rejectApproval(
  approvalId: string,
  rejectedBy: string,
  comments: string,
): Promise<ReleaseApproval | null> {
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_release_approvals
     SET status = 'rejected', approved_by = $1, comments = $2, resolved_at = $3
     WHERE approval_id = $4`,
    [rejectedBy, comments, now, approvalId],
  );
  const approval = await getApproval(approvalId);
  if (approval) {
    await publish('delivery.approval.rejected', 'platform', {
      approvalId,
      releaseId: approval.releaseId,
      rejectedBy,
      comments,
    }, {});
  }
  return approval;
}

export async function withdrawApproval(approvalId: string): Promise<void> {
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_release_approvals SET status = 'withdrawn', resolved_at = $1 WHERE approval_id = $2`,
    [now, approvalId],
  );
}

export async function getApproval(approvalId: string): Promise<ReleaseApproval | null> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_release_approvals WHERE approval_id = $1 LIMIT 1`,
    [approvalId],
  );
  if (!result.rows[0]) return null;
  return mapApprovalRow(result.rows[0]);
}

export async function listApprovalsByRelease(releaseId: string): Promise<ReleaseApproval[]> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_release_approvals WHERE release_id = $1 ORDER BY requested_at`,
    [releaseId],
  );
  return result.rows.map(mapApprovalRow);
}

export async function listPendingApprovals(releaseId: string): Promise<ReleaseApproval[]> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_release_approvals WHERE release_id = $1 AND status = 'pending' ORDER BY requested_at`,
    [releaseId],
  );
  return result.rows.map(mapApprovalRow);
}

export async function isFullyApproved(releaseId: string): Promise<boolean> {
  const approvals = await listApprovalsByRelease(releaseId);
  if (approvals.length === 0) return false;
  return approvals.every((a) => a.status === 'approved');
}

export async function hasRejection(releaseId: string): Promise<boolean> {
  const approvals = await listApprovalsByRelease(releaseId);
  return approvals.some((a) => a.status === 'rejected');
}

function mapApprovalRow(row: Record<string, any>): ReleaseApproval {
  return {
    approvalId: row.approval_id as string,
    releaseId: row.release_id as string,
    approvalRole: row.approval_role as string,
    requiredBy: row.required_by as string,
    approvedBy: (row.approved_by as string) ?? null,
    status: row.status as ApprovalStatus,
    comments: (row.comments as string) ?? null,
    requestedAt: row.requested_at as string,
    resolvedAt: (row.resolved_at as string) ?? null,
  };
}
