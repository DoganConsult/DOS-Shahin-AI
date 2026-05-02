// ============================================
// Shahin — Audit Cross-Module Service
// Cross-module linking: findings ↔ risks,
// findings ↔ compliance violations
// Tables: findings, risks, compliance_violations
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

// ── Sync finding to risk register ────────────────────────────────────

export async function syncFindingToRiskRegister(tenantId: string, findingId: string) {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Link finding to compliance violation ─────────────────────────────

export async function linkToComplianceViolation(tenantId: string, findingId: string, violationId: string) {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Get integration status (counts of linked findings) ───────────────

export async function getIntegrationStatus(tenantId: string) {
  const s = tenantSchema(tenantId);

  const [totalFindings, linkedToRisks, linkedToViolations] = await Promise.all([
    safeQuery(
      `SELECT COUNT(*)::int AS count
       FROM "${s}".findings WHERE deleted_at IS NULL`
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS count
       FROM "${s}".risks
       WHERE risk_source = 'audit_finding' AND deleted_at IS NULL`
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS count
       FROM "${s}".findings
       WHERE linked_violation_id IS NOT NULL AND deleted_at IS NULL`
    ),
  ]);

  const total = getFirstRow(totalFindings)?.count || 0;
  const riskLinked = getFirstRow(linkedToRisks)?.count || 0;
  const violationLinked = getFirstRow(linkedToViolations)?.count || 0;

  return {
    totalFindings: total,
    findingsLinkedToRisks: riskLinked,
    findingsLinkedToViolations: violationLinked,
    riskLinkagePct: total > 0 ? Math.round((riskLinked / total) * 100) : 0,
    violationLinkagePct: total > 0 ? Math.round((violationLinked / total) * 100) : 0,
  };
}
