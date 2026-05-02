import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '@dos/module-sdk';

export interface PolicyLifecycleTransition {
  fromStatus: string;
  toStatus: string;
  event: string;
  requiresApproval: boolean;
  requiredPermission?: string;
}

export interface PolicyScheduleResult {
  policyId: string;
  scheduledStatus: string;
  scheduledAt: string;
}

export interface PolicyLifecycleManager {
  transition(tenantId: string, policyId: string, event: string, actorId: string): Promise<{ status: string; transitionedAt: string }>;
  scheduleReview(tenantId: string, policyId: string, reviewDate: string, actorId?: string): Promise<PolicyScheduleResult>;
  getAvailableTransitions(tenantId: string, policyId: string): Promise<PolicyLifecycleTransition[]>;
  bulkExpire(tenantId: string, olderThanDays?: number): Promise<{ expiredCount: number }>;
  getUpcomingReviews(tenantId: string, withinDays?: number): Promise<Array<{ policyId: string; title: string; reviewDate: string; ownerId: string | null }>>;
}

const ALLOWED_TRANSITIONS: PolicyLifecycleTransition[] = [
  { fromStatus: 'draft', toStatus: 'review', event: 'SUBMIT_FOR_REVIEW', requiresApproval: false },
  { fromStatus: 'review', toStatus: 'draft', event: 'RETURN_TO_DRAFT', requiresApproval: false, requiredPermission: 'policy:review' },
  { fromStatus: 'review', toStatus: 'approved', event: 'APPROVE', requiresApproval: true, requiredPermission: 'policy:approve' },
  { fromStatus: 'review', toStatus: 'rejected', event: 'REJECT', requiresApproval: false, requiredPermission: 'policy:review' },
  { fromStatus: 'rejected', toStatus: 'draft', event: 'REVISE', requiresApproval: false },
  { fromStatus: 'approved', toStatus: 'active', event: 'ACTIVATE', requiresApproval: false, requiredPermission: 'policy:publish' },
  { fromStatus: 'active', toStatus: 'review', event: 'SEND_FOR_REVIEW', requiresApproval: false },
  { fromStatus: 'active', toStatus: 'retired', event: 'RETIRE', requiresApproval: true, requiredPermission: 'policy:retire' },
  { fromStatus: 'retired', toStatus: 'archived', event: 'ARCHIVE', requiresApproval: false, requiredPermission: 'policy:archive' },
  { fromStatus: 'draft', toStatus: 'archived', event: 'ARCHIVE', requiresApproval: false },
];

async function transition(
  tenantId: string,
  policyId: string,
  event: string,
  actorId: string,
): Promise<{ status: string; transitionedAt: string }> {
  const schema = tenantSchema(tenantId);

  const current = await safeQuery(
    `SELECT id, status FROM "${schema}".policies WHERE id = $1 AND deleted_at IS NULL`,
    [policyId],
  );
  if (current.rows.length === 0) {
    throw Object.assign(new Error(`Policy ${policyId} not found`), { statusCode: 404 });
  }

  const currentStatus = current.rows[0]?.['status'] as string;
  const allowedTransition = ALLOWED_TRANSITIONS.find(
    (t) => t.fromStatus === currentStatus && t.event === event,
  );

  if (!allowedTransition) {
    throw Object.assign(
      new Error(`Invalid transition '${event}' from status '${currentStatus}'`),
      { statusCode: 422, code: 'INVALID_TRANSITION' },
    );
  }

  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE "${schema}".policies
     SET status = $1, updated_at = NOW(), updated_by = $2,
         last_transition_event = $3, last_transitioned_at = NOW()
     WHERE id = $4`,
    [allowedTransition.toStatus, actorId, event, policyId],
  );

  logger.info(
    { tenantId, policyId, fromStatus: currentStatus, toStatus: allowedTransition.toStatus, event, actorId },
    '[PolicyLifecycle] transition applied',
  );

  return { status: allowedTransition.toStatus, transitionedAt: now };
}

async function scheduleReview(
  tenantId: string,
  policyId: string,
  reviewDate: string,
  actorId?: string,
): Promise<PolicyScheduleResult> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".policies
     SET next_review_date = $1, updated_at = NOW(), updated_by = $2
     WHERE id = $3 AND deleted_at IS NULL`,
    [reviewDate, actorId ?? null, policyId],
  );

  logger.info({ tenantId, policyId, reviewDate }, '[PolicyLifecycle] review scheduled');
  return { policyId, scheduledStatus: 'review_scheduled', scheduledAt: reviewDate };
}

async function getAvailableTransitions(
  tenantId: string,
  policyId: string,
): Promise<PolicyLifecycleTransition[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT status FROM "${schema}".policies WHERE id = $1 AND deleted_at IS NULL`,
    [policyId],
  );
  if (result.rows.length === 0) return [];

  const currentStatus = result.rows[0]?.['status'] as string;
  return ALLOWED_TRANSITIONS.filter((t) => t.fromStatus === currentStatus);
}

async function bulkExpire(tenantId: string, olderThanDays = 365): Promise<{ expiredCount: number }> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `UPDATE "${schema}".policies
     SET status = 'retired', updated_at = NOW()
     WHERE status = 'active'
       AND deleted_at IS NULL
       AND (next_review_date IS NOT NULL AND next_review_date < NOW() - ($1 * INTERVAL '1 day'))
     RETURNING id`,
    [olderThanDays],
  );

  const expiredCount = result.rows.length;
  if (expiredCount > 0) {
    logger.info({ tenantId, expiredCount, olderThanDays }, '[PolicyLifecycle] bulk expire completed');
  }

  return { expiredCount };
}

async function getUpcomingReviews(
  tenantId: string,
  withinDays = 30,
): Promise<Array<{ policyId: string; title: string; reviewDate: string; ownerId: string | null }>> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT id AS policy_id, title, next_review_date AS review_date, owner_id
     FROM "${schema}".policies
     WHERE deleted_at IS NULL
       AND status = 'active'
       AND next_review_date IS NOT NULL
       AND next_review_date <= NOW() + ($1 * INTERVAL '1 day')
       AND next_review_date >= NOW()
     ORDER BY next_review_date ASC`,
    [withinDays],
  );

  return result.rows.map((r: Record<string, unknown>) => ({
    policyId: r['policy_id'] as string,
    title: r['title'] as string,
    reviewDate: String(r['review_date']),
    ownerId: (r['owner_id'] as string) ?? null,
  }));
}

export const PolicyLifecycleService: PolicyLifecycleManager = {
  transition,
  scheduleReview,
  getAvailableTransitions,
  bulkExpire,
  getUpcomingReviews,
};
