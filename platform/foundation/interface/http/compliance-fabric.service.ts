/**
 * Foundation — Compliance Fabric service (G7).
 * Three sub-domains in one service for cohesion: policy acks, training, COI.
 *
 * Each sub-domain answers a hard auditor question:
 *   - "What % of users have current PDPL acknowledgment?"  → policy acks
 *   - "What is our training compliance %?"                 → training
 *   - "Who has declared a conflict of interest this year?" → COI
 */
import { withTenantClient } from '../../ports/database.port';
import { userMetrics } from '../../infrastructure/observability/metrics';

function track<T>(op: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => userMetrics.observeDb(op, Date.now() - start));
}

// ---------------------------------------------------------------------------
// POLICY ACKNOWLEDGMENTS
// ---------------------------------------------------------------------------

export interface PolicyAck {
  id: string;
  tenant_id: string;
  user_id: string;
  policy_id: string;
  policy_version: string;
  required: boolean;
  due_at: string | null;
  acknowledged_at: string | null;
  evidence_ref: string | null;
}

export async function listPolicyAcks(
  tenantId: string,
  filter: { userId?: string; policyId?: string; status?: 'pending' | 'completed' | 'overdue' } = {},
): Promise<PolicyAck[]> {
  const conds = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  if (filter.userId)   { params.push(filter.userId);   conds.push(`user_id = $${params.length}`); }
  if (filter.policyId) { params.push(filter.policyId); conds.push(`policy_id = $${params.length}`); }
  if (filter.status === 'pending')   conds.push(`acknowledged_at IS NULL AND (due_at IS NULL OR due_at >= NOW())`);
  if (filter.status === 'completed') conds.push(`acknowledged_at IS NOT NULL`);
  if (filter.status === 'overdue')   conds.push(`acknowledged_at IS NULL AND due_at < NOW()`);
  return track('foundation.policyAck.list', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.foundation_policy_acknowledgments
          WHERE ${conds.join(' AND ')}
          ORDER BY due_at ASC NULLS LAST
          LIMIT 1000`,
        params,
      );
      return r.rows as PolicyAck[];
    }),
  );
}

export async function assignPolicyAck(
  tenantId: string,
  input: { user_id: string; policy_id: string; policy_version: string; due_at?: string | null; required?: boolean },
): Promise<PolicyAck> {
  return track('foundation.policyAck.assign', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `INSERT INTO dos.foundation_policy_acknowledgments
           (tenant_id, user_id, policy_id, policy_version, required, due_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id, user_id, policy_id, policy_version) DO UPDATE SET
           required = EXCLUDED.required, due_at = EXCLUDED.due_at
         RETURNING *`,
        [tenantId, input.user_id, input.policy_id, input.policy_version,
         input.required ?? true, input.due_at ?? null],
      );
      return r.rows[0] as PolicyAck;
    }),
  );
}

export async function recordPolicyAck(
  tenantId: string,
  ackId: string,
  meta: { evidence_ref?: string; ip_address?: string; user_agent?: string },
): Promise<PolicyAck | null> {
  return track('foundation.policyAck.record', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.foundation_policy_acknowledgments
            SET acknowledged_at = NOW(),
                evidence_ref = COALESCE($3, evidence_ref),
                ip_address   = COALESCE($4::inet, ip_address),
                user_agent   = COALESCE($5, user_agent)
          WHERE id = $1 AND tenant_id = $2 AND acknowledged_at IS NULL
          RETURNING *`,
        [ackId, tenantId, meta.evidence_ref ?? null, meta.ip_address ?? null, meta.user_agent ?? null],
      );
      return (r.rows[0] as PolicyAck) ?? null;
    }),
  );
}

export async function getPolicyAckCoverage(tenantId: string): Promise<{ policy_id: string; total: number; acked: number; coverage_pct: number; overdue: number }[]> {
  return track('foundation.policyAck.coverage', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT policy_id,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE acknowledged_at IS NOT NULL)::int AS acked,
                COUNT(*) FILTER (WHERE acknowledged_at IS NULL AND due_at < NOW())::int AS overdue
           FROM dos.foundation_policy_acknowledgments
          WHERE tenant_id = $1
          GROUP BY policy_id
          ORDER BY policy_id`,
        [tenantId],
      );
      return r.rows.map((row: any) => ({
        ...row,
        coverage_pct: row.total > 0 ? Math.round((row.acked / row.total) * 100) : 0,
      }));
    }),
  );
}

// ---------------------------------------------------------------------------
// TRAINING
// ---------------------------------------------------------------------------

export interface TrainingCourse {
  course_code: string;
  tenant_id: string | null;
  name_en: string;
  name_ar: string | null;
  category: string | null;
  duration_minutes: number | null;
  is_mandatory: boolean;
  renewal_months: number | null;
  is_active: boolean;
}

export interface TrainingAssignment {
  id: string;
  tenant_id: string;
  user_id: string;
  course_code: string;
  assigned_at: string;
  due_at: string | null;
  completed_at: string | null;
  score: number | null;
  status: 'assigned' | 'in_progress' | 'completed' | 'failed' | 'overdue' | 'exempted';
}

export async function listTrainingCourses(tenantId: string): Promise<TrainingCourse[]> {
  return track('foundation.training.courses', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT DISTINCT ON (course_code) *
           FROM dos.foundation_training_courses
          WHERE is_active = true AND (tenant_id IS NULL OR tenant_id = $1)
          ORDER BY course_code, tenant_id NULLS LAST`,
        [tenantId],
      );
      return r.rows as TrainingCourse[];
    }),
  );
}

export async function assignTraining(
  tenantId: string,
  input: { user_id: string; course_code: string; due_at?: string | null; reason?: string; pass_threshold?: number },
  actorId: string,
): Promise<TrainingAssignment> {
  return track('foundation.training.assign', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `INSERT INTO dos.foundation_training_assignments
           (tenant_id, user_id, course_code, assigned_by, due_at, reason_assigned, pass_threshold)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [tenantId, input.user_id, input.course_code, actorId,
         input.due_at ?? null, input.reason ?? null, input.pass_threshold ?? 70],
      );
      return r.rows[0] as TrainingAssignment;
    }),
  );
}

export async function listTrainingAssignments(
  tenantId: string,
  filter: { userId?: string; status?: string; courseCode?: string } = {},
): Promise<TrainingAssignment[]> {
  const conds = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  if (filter.userId)     { params.push(filter.userId);     conds.push(`user_id = $${params.length}`); }
  if (filter.status)     { params.push(filter.status);     conds.push(`status = $${params.length}`); }
  if (filter.courseCode) { params.push(filter.courseCode); conds.push(`course_code = $${params.length}`); }
  return track('foundation.training.list', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.foundation_training_assignments
          WHERE ${conds.join(' AND ')}
          ORDER BY due_at ASC NULLS LAST LIMIT 1000`,
        params,
      );
      return r.rows as TrainingAssignment[];
    }),
  );
}

export async function completeTraining(
  tenantId: string,
  id: string,
  input: { score?: number; evidence_ref?: string },
  actorId: string,
): Promise<TrainingAssignment | null> {
  return track('foundation.training.complete', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.foundation_training_assignments
            SET completed_at = NOW(),
                score = COALESCE($3, score),
                evidence_ref = COALESCE($4, evidence_ref),
                status = CASE
                  WHEN COALESCE($3, score, 0) < pass_threshold AND pass_threshold IS NOT NULL THEN 'failed'
                  ELSE 'completed'
                END
          WHERE id = $1 AND tenant_id = $2 AND completed_at IS NULL
          RETURNING *`,
        [id, tenantId, input.score ?? null, input.evidence_ref ?? null],
      );
      return (r.rows[0] as TrainingAssignment) ?? null;
    }),
  );
}

export async function getTrainingComplianceMetrics(tenantId: string) {
  return track('foundation.training.metrics', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT course_code,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
                COUNT(*) FILTER (WHERE status = 'overdue' OR (status = 'assigned' AND due_at < NOW()))::int AS overdue,
                AVG(score) FILTER (WHERE status = 'completed') AS avg_score
           FROM dos.foundation_training_assignments
          WHERE tenant_id = $1
          GROUP BY course_code
          ORDER BY course_code`,
        [tenantId],
      );
      return r.rows.map((row: any) => ({
        ...row,
        compliance_pct: row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0,
      }));
    }),
  );
}

// ---------------------------------------------------------------------------
// COI DECLARATIONS
// ---------------------------------------------------------------------------

export interface CoiDeclaration {
  id: string;
  tenant_id: string;
  user_id: string;
  declaration_period: string;
  has_conflicts: boolean;
  disclosures: any[];
  declared_at: string;
  reviewed_at: string | null;
  review_decision: string | null;
}

export async function submitCoiDeclaration(
  tenantId: string,
  input: { user_id: string; declaration_period: string; has_conflicts: boolean; disclosures?: any[]; evidence_ref?: string },
): Promise<CoiDeclaration> {
  return track('foundation.coi.submit', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `INSERT INTO dos.foundation_coi_declarations
           (tenant_id, user_id, declaration_period, has_conflicts, disclosures, evidence_ref)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)
         ON CONFLICT (tenant_id, user_id, declaration_period) DO UPDATE SET
           has_conflicts = EXCLUDED.has_conflicts,
           disclosures   = EXCLUDED.disclosures,
           evidence_ref  = EXCLUDED.evidence_ref,
           declared_at   = NOW()
         RETURNING *`,
        [tenantId, input.user_id, input.declaration_period, input.has_conflicts,
         JSON.stringify(input.disclosures ?? []), input.evidence_ref ?? null],
      );
      return r.rows[0] as CoiDeclaration;
    }),
  );
}

export async function listCoiDeclarations(
  tenantId: string,
  filter: { period?: string; userId?: string; pendingReview?: boolean } = {},
): Promise<CoiDeclaration[]> {
  const conds = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  if (filter.period) { params.push(filter.period); conds.push(`declaration_period = $${params.length}`); }
  if (filter.userId) { params.push(filter.userId); conds.push(`user_id = $${params.length}`); }
  if (filter.pendingReview) conds.push(`has_conflicts = true AND reviewed_at IS NULL`);
  return track('foundation.coi.list', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.foundation_coi_declarations
          WHERE ${conds.join(' AND ')}
          ORDER BY declared_at DESC LIMIT 500`,
        params,
      );
      return r.rows as CoiDeclaration[];
    }),
  );
}

export async function reviewCoiDeclaration(
  tenantId: string,
  id: string,
  input: { decision: 'cleared' | 'mitigation_required' | 'blocked'; note?: string },
  actorId: string,
): Promise<CoiDeclaration | null> {
  return track('foundation.coi.review', () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.foundation_coi_declarations
            SET reviewed_at = NOW(),
                reviewed_by = $4,
                review_decision = $3,
                review_note = $5
          WHERE id = $1 AND tenant_id = $2 AND reviewed_at IS NULL
          RETURNING *`,
        [id, tenantId, input.decision, actorId, input.note ?? null],
      );
      return (r.rows[0] as CoiDeclaration) ?? null;
    }),
  );
}
