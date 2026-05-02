"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPolicyAcks = listPolicyAcks;
exports.assignPolicyAck = assignPolicyAck;
exports.recordPolicyAck = recordPolicyAck;
exports.getPolicyAckCoverage = getPolicyAckCoverage;
exports.listTrainingCourses = listTrainingCourses;
exports.assignTraining = assignTraining;
exports.listTrainingAssignments = listTrainingAssignments;
exports.completeTraining = completeTraining;
exports.getTrainingComplianceMetrics = getTrainingComplianceMetrics;
exports.submitCoiDeclaration = submitCoiDeclaration;
exports.listCoiDeclarations = listCoiDeclarations;
exports.reviewCoiDeclaration = reviewCoiDeclaration;
/**
 * Foundation — Compliance Fabric service (G7).
 * Three sub-domains in one service for cohesion: policy acks, training, COI.
 *
 * Each sub-domain answers a hard auditor question:
 *   - "What % of users have current PDPL acknowledgment?"  → policy acks
 *   - "What is our training compliance %?"                 → training
 *   - "Who has declared a conflict of interest this year?" → COI
 */
const database_port_1 = require("../../ports/database.port");
const metrics_1 = require("../../infrastructure/observability/metrics");
function track(op, fn) {
    const start = Date.now();
    return fn().finally(() => metrics_1.userMetrics.observeDb(op, Date.now() - start));
}
async function listPolicyAcks(tenantId, filter = {}) {
    const conds = ['tenant_id = $1'];
    const params = [tenantId];
    if (filter.userId) {
        params.push(filter.userId);
        conds.push(`user_id = $${params.length}`);
    }
    if (filter.policyId) {
        params.push(filter.policyId);
        conds.push(`policy_id = $${params.length}`);
    }
    if (filter.status === 'pending')
        conds.push(`acknowledged_at IS NULL AND (due_at IS NULL OR due_at >= NOW())`);
    if (filter.status === 'completed')
        conds.push(`acknowledged_at IS NOT NULL`);
    if (filter.status === 'overdue')
        conds.push(`acknowledged_at IS NULL AND due_at < NOW()`);
    return track('foundation.policyAck.list', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT * FROM dos.foundation_policy_acknowledgments
          WHERE ${conds.join(' AND ')}
          ORDER BY due_at ASC NULLS LAST
          LIMIT 1000`, params);
        return r.rows;
    }));
}
async function assignPolicyAck(tenantId, input) {
    return track('foundation.policyAck.assign', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`INSERT INTO dos.foundation_policy_acknowledgments
           (tenant_id, user_id, policy_id, policy_version, required, due_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id, user_id, policy_id, policy_version) DO UPDATE SET
           required = EXCLUDED.required, due_at = EXCLUDED.due_at
         RETURNING *`, [tenantId, input.user_id, input.policy_id, input.policy_version,
            input.required ?? true, input.due_at ?? null]);
        return r.rows[0];
    }));
}
async function recordPolicyAck(tenantId, ackId, meta) {
    return track('foundation.policyAck.record', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.foundation_policy_acknowledgments
            SET acknowledged_at = NOW(),
                evidence_ref = COALESCE($3, evidence_ref),
                ip_address   = COALESCE($4::inet, ip_address),
                user_agent   = COALESCE($5, user_agent)
          WHERE id = $1 AND tenant_id = $2 AND acknowledged_at IS NULL
          RETURNING *`, [ackId, tenantId, meta.evidence_ref ?? null, meta.ip_address ?? null, meta.user_agent ?? null]);
        return r.rows[0] ?? null;
    }));
}
async function getPolicyAckCoverage(tenantId) {
    return track('foundation.policyAck.coverage', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT policy_id,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE acknowledged_at IS NOT NULL)::int AS acked,
                COUNT(*) FILTER (WHERE acknowledged_at IS NULL AND due_at < NOW())::int AS overdue
           FROM dos.foundation_policy_acknowledgments
          WHERE tenant_id = $1
          GROUP BY policy_id
          ORDER BY policy_id`, [tenantId]);
        return r.rows.map((row) => ({
            ...row,
            coverage_pct: row.total > 0 ? Math.round((row.acked / row.total) * 100) : 0,
        }));
    }));
}
async function listTrainingCourses(tenantId) {
    return track('foundation.training.courses', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT DISTINCT ON (course_code) *
           FROM dos.foundation_training_courses
          WHERE is_active = true AND (tenant_id IS NULL OR tenant_id = $1)
          ORDER BY course_code, tenant_id NULLS LAST`, [tenantId]);
        return r.rows;
    }));
}
async function assignTraining(tenantId, input, actorId) {
    return track('foundation.training.assign', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`INSERT INTO dos.foundation_training_assignments
           (tenant_id, user_id, course_code, assigned_by, due_at, reason_assigned, pass_threshold)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`, [tenantId, input.user_id, input.course_code, actorId,
            input.due_at ?? null, input.reason ?? null, input.pass_threshold ?? 70]);
        return r.rows[0];
    }));
}
async function listTrainingAssignments(tenantId, filter = {}) {
    const conds = ['tenant_id = $1'];
    const params = [tenantId];
    if (filter.userId) {
        params.push(filter.userId);
        conds.push(`user_id = $${params.length}`);
    }
    if (filter.status) {
        params.push(filter.status);
        conds.push(`status = $${params.length}`);
    }
    if (filter.courseCode) {
        params.push(filter.courseCode);
        conds.push(`course_code = $${params.length}`);
    }
    return track('foundation.training.list', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT * FROM dos.foundation_training_assignments
          WHERE ${conds.join(' AND ')}
          ORDER BY due_at ASC NULLS LAST LIMIT 1000`, params);
        return r.rows;
    }));
}
async function completeTraining(tenantId, id, input, actorId) {
    return track('foundation.training.complete', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.foundation_training_assignments
            SET completed_at = NOW(),
                score = COALESCE($3, score),
                evidence_ref = COALESCE($4, evidence_ref),
                status = CASE
                  WHEN COALESCE($3, score, 0) < pass_threshold AND pass_threshold IS NOT NULL THEN 'failed'
                  ELSE 'completed'
                END
          WHERE id = $1 AND tenant_id = $2 AND completed_at IS NULL
          RETURNING *`, [id, tenantId, input.score ?? null, input.evidence_ref ?? null]);
        return r.rows[0] ?? null;
    }));
}
async function getTrainingComplianceMetrics(tenantId) {
    return track('foundation.training.metrics', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT course_code,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
                COUNT(*) FILTER (WHERE status = 'overdue' OR (status = 'assigned' AND due_at < NOW()))::int AS overdue,
                AVG(score) FILTER (WHERE status = 'completed') AS avg_score
           FROM dos.foundation_training_assignments
          WHERE tenant_id = $1
          GROUP BY course_code
          ORDER BY course_code`, [tenantId]);
        return r.rows.map((row) => ({
            ...row,
            compliance_pct: row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0,
        }));
    }));
}
async function submitCoiDeclaration(tenantId, input) {
    return track('foundation.coi.submit', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`INSERT INTO dos.foundation_coi_declarations
           (tenant_id, user_id, declaration_period, has_conflicts, disclosures, evidence_ref)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)
         ON CONFLICT (tenant_id, user_id, declaration_period) DO UPDATE SET
           has_conflicts = EXCLUDED.has_conflicts,
           disclosures   = EXCLUDED.disclosures,
           evidence_ref  = EXCLUDED.evidence_ref,
           declared_at   = NOW()
         RETURNING *`, [tenantId, input.user_id, input.declaration_period, input.has_conflicts,
            JSON.stringify(input.disclosures ?? []), input.evidence_ref ?? null]);
        return r.rows[0];
    }));
}
async function listCoiDeclarations(tenantId, filter = {}) {
    const conds = ['tenant_id = $1'];
    const params = [tenantId];
    if (filter.period) {
        params.push(filter.period);
        conds.push(`declaration_period = $${params.length}`);
    }
    if (filter.userId) {
        params.push(filter.userId);
        conds.push(`user_id = $${params.length}`);
    }
    if (filter.pendingReview)
        conds.push(`has_conflicts = true AND reviewed_at IS NULL`);
    return track('foundation.coi.list', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT * FROM dos.foundation_coi_declarations
          WHERE ${conds.join(' AND ')}
          ORDER BY declared_at DESC LIMIT 500`, params);
        return r.rows;
    }));
}
async function reviewCoiDeclaration(tenantId, id, input, actorId) {
    return track('foundation.coi.review', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.foundation_coi_declarations
            SET reviewed_at = NOW(),
                reviewed_by = $4,
                review_decision = $3,
                review_note = $5
          WHERE id = $1 AND tenant_id = $2 AND reviewed_at IS NULL
          RETURNING *`, [id, tenantId, input.decision, actorId, input.note ?? null]);
        return r.rows[0] ?? null;
    }));
}
//# sourceMappingURL=compliance-fabric.service.js.map