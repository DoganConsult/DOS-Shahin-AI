// ============================================================================
// Shahin — Evidence Health Dashboard Service
// Provides overall evidence health snapshot and per-control completeness
// metrics for the evidence health dashboard.
// ============================================================================

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

// ── Types ──

export interface EvidenceHealthSnapshot {
  tenant_id: string;
  computed_at: string;
  overall_health_score: number;     // 0-100
  collection_rate: number;          // % of required evidence collected
  freshness_rate: number;           // % of evidence not expired
  review_rate: number;              // % of evidence reviewed/approved
  auto_collected_count: number;     // collected via pipeline/automation
  manual_collected_count: number;   // collected manually
  overdue_count: number;            // evidence past due date
  expiring_soon_count: number;      // evidence expiring within 30 days
  by_control: ControlEvidenceHealth[];
}

export interface ControlEvidenceHealth {
  control_id: string;
  control_title: string;
  required_evidence: number;
  collected_evidence: number;
  approved_evidence: number;
  expired_evidence: number;
  completeness_score: number;       // 0-100 (collected/required * 100)
}

// ── Health Weights ──
const HEALTH_WEIGHTS = {
  collection: 0.40,
  freshness: 0.30,
  review: 0.30,
};

// ── Public API ──

/**
 * Compute a full evidence health snapshot for the tenant.
 * Queries evidence, evidence_schedules, evidence_tasks, and evidence_requests
 * to build collection, freshness, and review metrics.
 */
export async function getEvidenceHealthSnapshot(
  tenantId: string,
): Promise<EvidenceHealthSnapshot> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString();

  // 1. Total evidence counts by status
  const statusResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, approved: 0, expired: 0, expiring_soon: 0 }]), safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status IN ('approved','active'))::int AS approved,
       COUNT(*) FILTER (WHERE status = 'expired' OR (expiry_date IS NOT NULL AND expiry_date < NOW()))::int AS expired,
       COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date >= NOW() AND expiry_date < NOW() + INTERVAL '30 days')::int AS expiring_soon
     FROM "${schema}".evidence`,
  ), { tenantId: tenantId, operation: 'query evidence' });

  const stats = statusResult.rows[0] || { total: 0, approved: 0, expired: 0, expiring_soon: 0 };
  const totalEvidence = Number(stats.total) || 0;
  const approvedCount = Number(stats.approved) || 0;
  const expiredCount = Number(stats.expired) || 0;
  const expiringSoonCount = Number(stats.expiring_soon) || 0;

  // 2. Auto vs manual collection counts
  // Try source/collection_method column first, fall back to created_by = 'system'
  const collectionResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ auto_count: 0, manual_count: 0 }]), safeQuery(
    `SELECT
       COUNT(*) FILTER (WHERE COALESCE(source_type, '') IN ('pipeline','automated','connector','api') OR created_by = 'system' OR created_by LIKE 'pipeline:%')::int AS auto_count,
       COUNT(*) FILTER (WHERE COALESCE(source_type, '') NOT IN ('pipeline','automated','connector','api') AND created_by != 'system' AND created_by NOT LIKE 'pipeline:%')::int AS manual_count
     FROM "${schema}".evidence`,
  ), { tenantId: tenantId, operation: 'query evidence' });

  const collStats = collectionResult.rows[0] || { auto_count: 0, manual_count: 0 };
  const autoCollectedCount = Number(collStats.auto_count) || 0;
  const manualCollectedCount = Number(collStats.manual_count) || 0;

  // 3. Required evidence count from evidence_tasks or control_evidence_requirements
  const requiredResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ required_count: 0, fulfilled_count: 0 }]), safeQuery(
    `SELECT COUNT(DISTINCT task_id)::int AS required_count,
            COUNT(DISTINCT task_id) FILTER (WHERE status IN ('completed','approved'))::int AS fulfilled_count
     FROM "${schema}".evidence_tasks`,
  ), { tenantId: tenantId, operation: 'query evidence_tasks' });

  const reqStats = requiredResult.rows[0] || { required_count: 0, fulfilled_count: 0 };
  const requiredCount = Number(reqStats.required_count) || 0;
  const fulfilledCount = Number(reqStats.fulfilled_count) || 0;

  // 4. Overdue evidence requests
  const overdueResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ overdue_count: 0 }]), safeQuery(
    `SELECT COUNT(*)::int AS overdue_count
     FROM "${schema}".evidence_requests
     WHERE status NOT IN ('completed','cancelled','fulfilled')
       AND due_date < NOW()`,
  ), { tenantId: tenantId, operation: 'query evidence_requests' });

  const overdueCount = Number(overdueResult.rows[0]?.overdue_count) || 0;

  // 5. Per-control completeness
  const byControl = await getEvidenceCompletenessPerControl(tenantId);

  // 6. Compute rates
  const collectionRate = requiredCount > 0
    ? Math.round((fulfilledCount / requiredCount) * 100)
    : (totalEvidence > 0 ? 100 : 0);

  const freshCount = totalEvidence - expiredCount;
  const freshnessRate = totalEvidence > 0
    ? Math.round((freshCount / totalEvidence) * 100)
    : 100;

  const reviewRate = totalEvidence > 0
    ? Math.round((approvedCount / totalEvidence) * 100)
    : 0;

  // 7. Composite health score (weighted average of rates)
  const overallHealthScore = Math.round(
    collectionRate * HEALTH_WEIGHTS.collection +
    freshnessRate * HEALTH_WEIGHTS.freshness +
    reviewRate * HEALTH_WEIGHTS.review,
  );

  return {
    tenant_id: tenantId,
    computed_at: now,
    overall_health_score: Math.min(100, Math.max(0, overallHealthScore)),
    collection_rate: collectionRate,
    freshness_rate: freshnessRate,
    review_rate: reviewRate,
    auto_collected_count: autoCollectedCount,
    manual_collected_count: manualCollectedCount,
    overdue_count: overdueCount,
    expiring_soon_count: expiringSoonCount,
    by_control: byControl,
  };
}

/**
 * Compute per-control evidence completeness.
 * For each control that has evidence tasks, count required, collected,
 * approved, and expired evidence. Returns sorted by completeness_score ASC
 * (worst-performing controls first).
 */
export async function getEvidenceCompletenessPerControl(
  tenantId: string,
): Promise<ControlEvidenceHealth[]> {
  const schema = tenantSchema(tenantId);

  // Join evidence_tasks with controls to get per-control stats
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT
       et.control_id,
       COALESCE(c.control_title, c.control_title_en, et.control_id) AS control_title,
       COUNT(DISTINCT et.task_id)::int AS required_evidence,
       COUNT(DISTINCT et.task_id) FILTER (WHERE et.status IN ('completed','approved','fulfilled'))::int AS collected_evidence,
       COUNT(DISTINCT et.task_id) FILTER (WHERE et.status = 'approved')::int AS approved_evidence,
       COUNT(DISTINCT et.task_id) FILTER (WHERE et.status = 'expired')::int AS expired_evidence
     FROM "${schema}".evidence_tasks et
     LEFT JOIN "${schema}".ucf_controls c ON c.control_id = et.control_id
     WHERE et.control_id IS NOT NULL
     GROUP BY et.control_id, c.control_title, c.control_title_en
     ORDER BY
       CASE WHEN COUNT(DISTINCT et.task_id) > 0
         THEN (COUNT(DISTINCT et.task_id) FILTER (WHERE et.status IN ('completed','approved','fulfilled'))::float / COUNT(DISTINCT et.task_id)::float)
         ELSE 0
       END ASC`,
  ), { tenantId: tenantId, operation: 'query evidence_tasks' });

  return result.rows.map((r: GenericRow) => {
    const required = Number(r.required_evidence) || 0;
    const collected = Number(r.collected_evidence) || 0;
    const completenessScore = required > 0
      ? Math.round((collected / required) * 100)
      : 0;

    return {
      control_id: r.control_id,
      control_title: r.control_title || r.control_id,
      required_evidence: required,
      collected_evidence: collected,
      approved_evidence: Number(r.approved_evidence) || 0,
      expired_evidence: Number(r.expired_evidence) || 0,
      completeness_score: completenessScore,
    };
  });
}
