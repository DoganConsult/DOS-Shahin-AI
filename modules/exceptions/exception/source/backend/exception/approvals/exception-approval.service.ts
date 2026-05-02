import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { tryLifecycleTransition } from '../ports/platform.port';
import { emitEvent } from '../ports/events.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { ExceptionRepository } from '../repositories/exception.repository';

export interface ApprovalDecision {
  exceptionId: string;
  reviewerId: string;
  decision: 'approved' | 'rejected';
  comments: string;
}

export interface ApprovalRecord {
  approvalId: string;
  exceptionId: string;
  reviewerId: string;
  decision: string;
  comments: string;
  decidedAt: string;
}

function validateApprovalDecision(data: ApprovalDecision): void {
  const errors: string[] = [];
  if (!data.exceptionId?.trim()) errors.push('exceptionId is required');
  if (!data.reviewerId?.trim()) errors.push('reviewerId is required');
  if (!['approved', 'rejected'].includes(data.decision)) errors.push('decision must be approved or rejected');
  if (data.comments && data.comments.length > 5000) errors.push('comments must not exceed 5000 characters');
  if (errors.length > 0) throw Object.assign(new Error(`Invalid approval: ${errors.join(', ')}`), { statusCode: 400 });
}

export async function recordApprovalDecision(
  tenantId: string,
  data: ApprovalDecision,
): Promise<ApprovalRecord> {
  validateApprovalDecision(data);
  const schema = tenantSchema(tenantId);
  const repo = new ExceptionRepository(tenantId);

  const r = await withTransaction(tenantId, async (client) => {
    const row = await repo.findByIdForUpdate(data.exceptionId, client);
    if (!row) throw Object.assign(new Error('Exception not found'), { statusCode: 404 });

    const lifecycle = await tryLifecycleTransition(tenantId, {
      moduleCode: 'exception', entityId: data.exceptionId,
      fromStatus: row.status, toStatus: data.decision, actorUserId: data.reviewerId,
    });
    if (lifecycle.handled && lifecycle.denied) {
      throw Object.assign(new Error(`Transition denied: ${lifecycle.result?.reason}`), { statusCode: 403 });
    }

    const result = await safeQueryWithClient(
      `INSERT INTO "${schema}".exception_approvals
        (exception_id, reviewer_id, decision, comments, decided_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [data.exceptionId, data.reviewerId, data.decision, data.comments],
      client,
    );
    const inserted = getFirstRow(result)!;

    await repo.update(data.exceptionId, { status: data.decision }, client);

    return inserted;
  });

  await recordAudit({
    tenantId, userId: data.reviewerId, module: 'exception', action: 'approval_decision',
    entityType: 'exception', entityId: data.exceptionId,
    afterState: { decision: data.decision, comments: data.comments },

  }).catch(catchHandler(EC.EVENT_BUS));

  swallow(EC.EVENT_BUS, emitEvent(({
      tenantId, userId: data.reviewerId, module: 'exception',
      event: data.decision === 'approved' ? 'approved' : 'rejected',
      entityType: 'exception', entityId: data.exceptionId,
      data: { decision: data.decision },
    } as any)));

  return {
    approvalId: r.approval_id || r.id,
    exceptionId: r.exception_id,
    reviewerId: r.reviewer_id,
    decision: r.decision,
    comments: r.comments,
    decidedAt: r.decided_at?.toISOString?.() || r.decided_at,
  };
}

export async function getApprovalHistory(
  tenantId: string,
  exceptionId: string,
  page = 1,
  pageSize = 25,
): Promise<{ items: ApprovalRecord[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const safePage = Math.max(1, page);
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const offset = (safePage - 1) * safeSize;
  const [countResult, result] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".exception_approvals WHERE exception_id = $1`, [exceptionId]),
    safeQuery(`SELECT * FROM "${schema}".exception_approvals WHERE exception_id = $1 ORDER BY decided_at DESC LIMIT $2 OFFSET $3`, [exceptionId, safeSize, offset]),
  ]);
  const total = countResult.rows[0]?.total ?? 0;
  return {

    items: result.rows.map(( r: Record<string, unknown>) => ({
      approvalId: r.approval_id || r.id,
      exceptionId: r.exception_id,
      reviewerId: r.reviewer_id,
      decision: r.decision,
      comments: r.comments,

      decidedAt: r.decided_at?.toISOString?.() || r.decided_at,
    })),
    total,
  };
}
