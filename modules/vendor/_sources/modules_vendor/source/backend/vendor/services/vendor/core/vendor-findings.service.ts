import { logger } from '../../../ports/logger.port';
// ============================================
// Vendor Findings & Remediation Feedback
// Covers: incident-to-finding linking,
// finding closure, and vendor risk score
// recalculation upon remediation completion.
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';

/**
 * When an incident has a vendor_id, auto-create a vendor_finding linking back.
 * This enables bidirectional traceability: incident -> vendor finding, vendor -> incidents.
 */
export async function createVendorFindingFromIncident(
  tenantId: string,
  incidentId: string,
  vendorId: string,
  incidentTitle: string,
  severity: string,
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Ensure vendor_findings table exists
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".vendor_findings (
      finding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vendor_id UUID NOT NULL,
      source_type VARCHAR(50) NOT NULL DEFAULT 'incident',
      source_id UUID,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      severity VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(30) DEFAULT 'open',
      risk_impact_score NUMERIC(5,2),
      remediation_deadline TIMESTAMPTZ,
      remediation_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      closed_at TIMESTAMPTZ
    )
  `);

  // Avoid duplicate findings for the same incident
  const existingRes = await safeQuery(
    `SELECT finding_id FROM "${schema}".vendor_findings
     WHERE vendor_id = $1 AND source_type = 'incident' AND source_id = $2
     LIMIT 1`,
    [vendorId, incidentId],
  );
  if (existingRes.rows.length > 0) {
    return getFirstRow(existingRes);
  }

  const result = await safeQuery(
    `INSERT INTO "${schema}".vendor_findings
       (vendor_id, source_type, source_id, title, severity, status)
     VALUES ($1, 'incident', $2, $3, $4, 'open')
     RETURNING *`,
    [vendorId, incidentId, `Incident-linked: ${incidentTitle}`, severity],
  );

  const finding = getFirstRow(result)!;

  // Also link back on the incident side if the column exists
  await safeQuery(
    `UPDATE "${schema}".incidents
     SET vendor_finding_id = $1, updated_at = NOW()
     WHERE incident_id = $2`,
    [finding?.finding_id, incidentId],
  ).catch((e: unknown) => logger.warn(`[VendorEnhancements] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));

  await eventBus.publish(({
      eventType: 'vendor.risk_changed',
      tenantId,
      sourceService: 'vendor-enhancements',
      severity: severity === 'critical' ? 'critical' : 'warning',
      entityType: 'vendor_finding',
      entityId: finding?.finding_id,
      payload: { vendorId, incidentId, findingId: finding?.finding_id, severity },
    } as any)).catch((e: unknown) => logger.warn(`[VendorEnhancements] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));

  return finding;
}

/**
 * When a remediation task completes for a vendor-sourced finding,
 * update the vendor finding status and recalculate the vendor risk score.
 */
export async function closeVendorFindingAndRecalculate(
  tenantId: string,
  vendorId: string,
  findingId: string,
  remediationNotes?: string,
): Promise<{ updatedScore: number | null }> {
  const schema = tenantSchema(tenantId);

  // Close the vendor finding
  await safeQuery(
    `UPDATE "${schema}".vendor_findings
     SET status = 'closed', closed_at = NOW(), remediation_notes = $2, updated_at = NOW()
     WHERE finding_id = $1`,
    [findingId, remediationNotes ?? null],
  );

  // Recalculate vendor risk score based on open findings
  const scoreRes = await safeQuery(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'open' AND severity = 'critical')::int AS critical_open,
       COUNT(*) FILTER (WHERE status = 'open' AND severity = 'high')::int AS high_open,
       COUNT(*) FILTER (WHERE status = 'open' AND severity = 'medium')::int AS medium_open,
       COUNT(*) FILTER (WHERE status = 'open' AND severity = 'low')::int AS low_open,
       COUNT(*) FILTER (WHERE status = 'open')::int AS total_open,
       COUNT(*)::int AS total
     FROM "${schema}".vendor_findings
     WHERE vendor_id = $1`,
    [vendorId],
  );

  const counts = getFirstRow(scoreRes) ?? { critical_open: 0, high_open: 0, medium_open: 0, low_open: 0, total_open: 0, total: 0 };

  // Weighted score: critical=25, high=10, medium=4, low=1
  const rawScore = counts.critical_open * 25 + counts.high_open * 10 + counts.medium_open * 4 + counts.low_open * 1;
  // Normalize to 0-100 scale with a denominator based on total findings
  const maxPossible = Math.max(counts.total * 25, 1);
  const normalizedScore = Math.min(100, Math.round((rawScore / maxPossible) * 100));

  // Update vendor risk score
  await safeQuery(
    `UPDATE "${schema}".vendors
     SET risk_score = $2, last_risk_assessed_at = NOW(), updated_at = NOW()
     WHERE vendor_id = $1`,
    [vendorId, normalizedScore],
  ).catch((e: unknown) => logger.warn(`[VendorEnhancements] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));

  // Determine new risk tier based on score
  const newTier = normalizedScore >= 75 ? 'critical' : normalizedScore >= 50 ? 'high' : normalizedScore >= 25 ? 'medium' : 'low';
  await safeQuery(
    `UPDATE "${schema}".vendors SET risk_tier = $2 WHERE vendor_id = $1`,
    [vendorId, newTier],
  ).catch((e: unknown) => logger.warn(`[VendorEnhancements] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));

  await eventBus.publish(({
      eventType: 'vendor.posture_recalculated',
      tenantId,
      sourceService: 'vendor-enhancements',
      severity: normalizedScore >= 75 ? 'critical' : normalizedScore >= 50 ? 'warning' : 'info',
      entityType: 'vendor',
      entityId: vendorId,
      payload: { vendorId, findingId, newScore: normalizedScore, newTier, openFindings: counts.total_open },
    } as any)).catch((e: unknown) => logger.warn(`[VendorEnhancements] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));

  return { updatedScore: normalizedScore };
}
