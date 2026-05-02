import { safeQuery, tenantSchema } from '../ports/database.port';

export interface PolicyLifecycleState {
  policyId: string;
  status: string;
  nextReviewDate: string | null;
  reviewFrequency: string | null;
  isOverdue: boolean;
  overdueDays: number;
}

export async function getPolicyLifecycleState(tenantId: string, policyId: string): Promise<PolicyLifecycleState | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT policy_id, status, next_review_date, review_frequency,
            CASE WHEN next_review_date < NOW() THEN TRUE ELSE FALSE END AS is_overdue,
            GREATEST(0, EXTRACT(DAY FROM NOW() - next_review_date)::int) AS overdue_days
     FROM "${schema}".policies WHERE policy_id = $1 AND deleted_at IS NULL`,
    [policyId],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    policyId: row.policy_id,
    status: row.status,
    nextReviewDate: row.next_review_date,
    reviewFrequency: row.review_frequency,
    isOverdue: row.is_overdue,
    overdueDays: row.overdue_days || 0,
  };
}

export async function getOverduePolicies(tenantId: string): Promise<PolicyLifecycleState[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT policy_id, status, next_review_date, review_frequency,
            TRUE AS is_overdue,
            EXTRACT(DAY FROM NOW() - next_review_date)::int AS overdue_days
     FROM "${schema}".policies
     WHERE deleted_at IS NULL AND next_review_date < NOW()
     ORDER BY overdue_days DESC`,
  );

  return result.rows.map((row: Record<string, unknown>) => ({
    policyId: row.policy_id,
    status: row.status,
    nextReviewDate: row.next_review_date,
    reviewFrequency: row.review_frequency,
    isOverdue: true,
    overdueDays: row.overdue_days || 0,
  }));
}

export async function getAvailableTransitions(tenantId: string, moduleCode: string, currentState: string): Promise<Array<{ toState: string; requiresApproval: boolean; requiredPermission: string | null }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT to_status, sod_check, required_permission_code
     FROM "${schema}".module_lifecycle_transitions
     WHERE module_code = $1 AND from_status = $2
     ORDER BY to_status`,
    [moduleCode, currentState],
  );

  return result.rows.map(( r: Record<string, unknown>) => ({
    toState: r.to_status,
    requiresApproval: r.sod_check === true,
    requiredPermission: r.required_permission_code || null,
  }));
}
