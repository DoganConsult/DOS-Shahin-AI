// ============================================
// Shahin — Audit Test Plans Service
// Control testing plans per audit engagement
// Table: audit_test_plans
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

// ── List test plans for an audit ─────────────────────────────────────

export async function listTestPlans(tenantId: string, auditId: string) {
  const s = tenantSchema(tenantId);
  try {
    // Enriched with control details from compliance module
    const result = await safeQuery(
      `SELECT tp.*,
         c.control_title_en AS control_name,
         c.framework_code,
         c.implementation_status AS control_status,
         c.control_description_en AS control_description
       FROM "${s}".audit_test_plans tp
       LEFT JOIN "${s}".controls c ON c.control_id = tp.control_id AND c.deleted_at IS NULL
       WHERE tp.audit_id = $1 AND tp.deleted_at IS NULL
       ORDER BY tp.created_at DESC`,
      [auditId]
    );
    return result.rows;
  } catch {
    // Fallback without enrichment if controls table schema differs
    const result = await safeQuery(
      `SELECT * FROM "${s}".audit_test_plans
       WHERE audit_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [auditId]
    );
    return result.rows;
  }
}

// ── Create a test plan ───────────────────────────────────────────────

export async function createTestPlan(tenantId: string, data: {
  audit_id: string;
  control_id: string;
  test_description: string;
  test_type?: string;
  sample_size?: number;
  assigned_to?: string;
  status?: string;
}) {
  const s = tenantSchema(tenantId);
  const planId = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".audit_test_plans
       (plan_id, audit_id, control_id, test_description, test_type,
        sample_size, assigned_to, status, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW()) RETURNING *`,
    [planId, data.audit_id, data.control_id, data.test_description,
     data.test_type || 'walkthrough', data.sample_size || null,
     data.assigned_to || null, data.status || 'pending']
  );
  return getFirstRow(result);
}

// ── Update test result ───────────────────────────────────────────────

export async function updateTestResult(
  tenantId: string,
  id: string,
  status: string,
  resultNotes: string,
  testedBy: string
) {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Get control coverage for an audit ────────────────────────────────

export async function getControlCoverage(tenantId: string, auditId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       COUNT(DISTINCT control_id)::int AS tested_controls,
       COUNT(*)::int AS total_test_plans,
       COUNT(*) FILTER (WHERE status = 'passed')::int AS passed,
       COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
       COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
       (SELECT COUNT(*)::int FROM "${s}".controls WHERE deleted_at IS NULL) AS total_controls
     FROM "${s}".audit_test_plans
     WHERE audit_id = $1 AND deleted_at IS NULL`,
    [auditId]
  );
  const row = getFirstRow(result)!;
  return {
    ...row,
    coveragePct: row.total_controls > 0
      ? Math.round((row.tested_controls / row.total_controls) * 100)
      : 0,
  };
}
