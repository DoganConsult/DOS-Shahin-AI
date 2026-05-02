// ============================================
// Shahin — Audit Package Service
// Bundles assessment + evidence + remediation
// data into a downloadable audit package
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { getClearanceFilterHierarchy } from '../../../../remediation/services/clearance.service';

// === Pure bundle function (useful for testing) ===

export function bundleAuditPackage(
  assessment: GenericRow | null,
  items: GenericRow[],
  evidence: GenericRow[],
  remediationTasks: GenericRow[]
): {
  assessment: GenericRow | null;
  items: GenericRow[];
  evidence: GenericRow[];
  remediationTasks: GenericRow[];
  generatedAt: Date;
} {
  return {
    assessment,
    items,
    evidence,
    remediationTasks,
    generatedAt: new Date(),
  };
}

// === Database-backed audit package generation ===

export async function generateAssessmentAuditPackage(
  tenantId: string,
  assessmentId: string,
  userRole?: string
): Promise<{
  assessment: GenericRow | null;
  items: GenericRow[];
  evidence: GenericRow[];
  remediationTasks: GenericRow[];
  generatedAt: Date;
}> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}
