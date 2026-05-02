// ============================================
// Evidence Query — Read operations
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

/**
 * Build WHERE clause fragments for foundation-level filters (department, business_unit, location).
 */
function buildFoundationFilters(
  filters: Record<string, string | undefined>,
  alias: string,
): { where: string; values: unknown[] } {
  const clauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (filters.department_id) {
    clauses.push(`${alias}.department_id = $${idx++}`);
    values.push(filters.department_id);
  }
  if (filters.business_unit_id) {
    clauses.push(`${alias}.business_unit_id = $${idx++}`);
    values.push(filters.business_unit_id);
  }
  if (filters.location_id) {
    clauses.push(`${alias}.location_id = $${idx++}`);
    values.push(filters.location_id);
  }

  return {
    where: clauses.length > 0 ? ' AND ' + clauses.join(' AND ') : '',
    values,
  };
}

// === Get Evidence for Control ===

export async function getEvidenceForControl(tenantId: string, controlId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".evidence WHERE control_id = $1 ORDER BY chain_position ASC`,
    [controlId]
  );
  return result.rows;
}

// === Get All Evidence ===

export async function getAllEvidence(
  tenantId: string,
  scopeUser?: { userId: string },
  filters?: Record<string, string | undefined>,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);

  const { where: foundationWhere, values: foundationVals } = buildFoundationFilters(filters || {}, 'e');

  // §19: No role-priority full-access shortcuts.
  // Row-level scoping: if a user is provided, filter to records they own/submitted/created.
  // DAuth middleware has already verified the actor has evidence.item.read permission;
  // org-level scope expansion is resolved by DAuth's scope context, not by role names.
  if (scopeUser) {
    const paramIdx = foundationVals.length + 1;
    const params = [...foundationVals, scopeUser.userId];

    const result = await safeQuery(
      `SELECT e.* FROM "${schema}".evidence e
       WHERE (e.owner_user_id = $${paramIdx} OR e.submitted_by = $${paramIdx} OR e.created_by = $${paramIdx})
         AND e.deleted_at IS NULL${foundationWhere}
       ORDER BY e.chain_position ASC`,
      params
    );
    return result.rows;
  }

  const result = await safeQuery(
    `SELECT e.* FROM "${schema}".evidence e
     WHERE e.deleted_at IS NULL${foundationWhere}
     ORDER BY e.chain_position ASC`,
    foundationVals
  );
  return result.rows;
}

// === Evidence Overview Stats ===

export async function getOverviewStats(tenantId: string, filters?: Record<string, string | undefined>): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const { where: fw, values: fv } = buildFoundationFilters(filters || {}, 'e');

  const [totalR, expiringR, expiredR, pendingReviewsR, overdueRequestsR, taskStatsR, statusBreakdownR, riskLinkedR, frameworkBreakdownR] = await Promise.all([
    safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".evidence e WHERE e.deleted_at IS NULL${fw}`, fv),
    safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".evidence e WHERE e.expiry_date IS NOT NULL AND e.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND e.expiry_date >= CURRENT_DATE AND e.deleted_at IS NULL${fw}`, fv),
    safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".evidence e WHERE e.expiry_date IS NOT NULL AND e.expiry_date < CURRENT_DATE AND e.deleted_at IS NULL${fw}`, fv),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: '0' }]), safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".evidence_reviews WHERE outcome IS NULL AND deleted_at IS NULL`), { tenantId: tenantId, operation: 'query evidence' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: '0' }]), safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".evidence_requests WHERE due_date < NOW() AND status NOT IN ('approved','cancelled','rejected')`), { tenantId: tenantId, operation: 'query evidence' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT status, COUNT(*) AS cnt FROM "${schema}".evidence_tasks GROUP BY status`), { tenantId: tenantId, operation: 'query evidence_reviews' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT COALESCE(e.status, 'submitted') AS status, COUNT(*) AS cnt FROM "${schema}".evidence e WHERE e.deleted_at IS NULL${fw} GROUP BY COALESCE(e.status, 'submitted')`, fv), { tenantId: tenantId, operation: 'query evidence_requests' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: '0' }]), safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".evidence e WHERE e.risk_id IS NOT NULL AND e.deleted_at IS NULL${fw}`, fv), { tenantId: tenantId, operation: 'query evidence_tasks' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT e.framework_code, COUNT(*) AS cnt FROM "${schema}".evidence e WHERE e.framework_code IS NOT NULL AND e.deleted_at IS NULL${fw} GROUP BY e.framework_code ORDER BY cnt DESC`, fv), { tenantId: tenantId, operation: 'query evidence' }),
  ]);

  const taskStats: Record<string, number> = {};
  for (const row of taskStatsR.rows) { taskStats[(row as any).status] = parseInt((row as any).cnt, 10); }

  const statusBreakdown: Record<string, number> = {};
  for (const row of statusBreakdownR.rows) { statusBreakdown[(row as any).status] = parseInt((row as any).cnt, 10); }

  const frameworkBreakdown: Array<{ framework_code: string; count: number }> = frameworkBreakdownR.rows.map((r: GenericRow) => ({
    framework_code: r.framework_code,
    count: parseInt(r.cnt, 10),
  }));

  return {
    totalEvidence: parseInt(getFirstRow(totalR)?.cnt, 10),
    expiringSoon: parseInt(getFirstRow(expiringR)?.cnt, 10),
    expired: parseInt(getFirstRow(expiredR)?.cnt, 10),
    pendingReviews: parseInt(getFirstRow(pendingReviewsR)!.cnt, 10),
    overdueRequests: parseInt(getFirstRow(overdueRequestsR)!.cnt, 10),
    riskLinkedCount: parseInt(getFirstRow(riskLinkedR)!.cnt, 10),
    taskStats,
    statusBreakdown,
    frameworkBreakdown,
  };
}

// === Evidence Mappings (cross-entity browser) ===

export async function getEvidenceMappings(tenantId: string, filters?: {
  frameworkId?: string; controlId?: string; riskId?: string; policyId?: string; entityType?: string;
}): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT ea.attachment_id, ea.entity_type, ea.entity_id,
                    ea.evidence_type_code, ea.file_name, ea.file_size_bytes,
                    ea.uploaded_by, ea.created_at,
                    CASE ea.entity_type
                      WHEN 'control' THEN (SELECT title FROM "${schema}".controls WHERE control_id = ea.entity_id LIMIT 1)
                      WHEN 'policy' THEN (SELECT title FROM "${schema}".policies WHERE policy_id = ea.entity_id LIMIT 1)
                      WHEN 'risk' THEN (SELECT title FROM "${schema}".risks WHERE risk_id = ea.entity_id LIMIT 1)
                      WHEN 'framework' THEN (SELECT name FROM "${schema}".frameworks WHERE framework_id = ea.entity_id LIMIT 1)
                      ELSE NULL
                    END AS entity_title
             FROM "${schema}".evidence_attachments ea
             WHERE 1=1`;
  const vals: unknown[] = [];
  let idx = 1;
  if (filters?.entityType) { sql += ` AND ea.entity_type = $${idx++}`; vals.push(filters.entityType); }
  if (filters?.controlId) { sql += ` AND ea.entity_type = 'control' AND ea.entity_id = $${idx++}`; vals.push(filters.controlId); }
  if (filters?.policyId) { sql += ` AND ea.entity_type = 'policy' AND ea.entity_id = $${idx++}`; vals.push(filters.policyId); }
  if (filters?.riskId) { sql += ` AND ea.entity_type = 'risk' AND ea.entity_id = $${idx++}`; vals.push(filters.riskId); }
  if (filters?.frameworkId) { sql += ` AND ea.entity_type = 'framework' AND ea.entity_id = $${idx++}`; vals.push(filters.frameworkId); }
  sql += ` ORDER BY ea.entity_type, ea.created_at DESC`;
  const result = await safeQuery(sql, vals);
  return result.rows;
}

// === Get Expired Evidence ===

export async function getExpiredEvidence(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".evidence
     WHERE expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE
     ORDER BY expiry_date ASC`
  );
  return result.rows;
}
