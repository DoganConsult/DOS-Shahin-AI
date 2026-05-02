// ============================================
// Shahin — Audit Committee Reporting Service
// Aggregated reporting from audits, findings,
// remediation_plans, and closure_reviews
// ============================================

import { v4 as _uuid } from "uuid";
import { emptyResult, safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

// ── Executive Summary (KPIs) ─────────────────────────────────────────

export async function generateExecutiveSummary(tenantId: string) {
  const s = tenantSchema(tenantId);

  const [audits, findings, capa, closures, slaCompliance] = await Promise.all([
    safeQuery(
      `SELECT status, COUNT(*)::int AS c
       FROM "${s}".audits WHERE deleted_at IS NULL GROUP BY status`
    ),
    safeQuery(
      `SELECT status, severity, COUNT(*)::int AS c
       FROM "${s}".findings WHERE deleted_at IS NULL GROUP BY status, severity`
    ),
    safeQuery(
      `SELECT status, COUNT(*)::int AS c
       FROM "${s}".remediation_plans WHERE deleted_at IS NULL GROUP BY status`
    ),
    safeQuery(
      `SELECT outcome, COUNT(*)::int AS c
       FROM "${s}".closure_reviews WHERE deleted_at IS NULL GROUP BY outcome`
    ),
    safeQuery(
      `SELECT
         COUNT(*)::int AS total_closed,
         COUNT(*) FILTER (WHERE cr.review_date <= f.created_at + INTERVAL '90 days')::int AS within_sla
       FROM "${s}".closure_reviews cr
       JOIN "${s}".findings f ON f.finding_id = cr.finding_id
       WHERE cr.deleted_at IS NULL AND cr.outcome = 'closed'`
    ),
  ]);

  const auditsByStatus: Record<string, number> = {};
  for (const r of audits.rows) auditsByStatus[r.status] = r.c;

  const findingsByStatus: Record<string, number> = {};
  const findingsBySeverity: Record<string, number> = {};
  let totalFindings = 0;
  for (const r of findings.rows) {
    findingsByStatus[r.status] = (findingsByStatus[r.status] || 0) + r.c;
    findingsBySeverity[r.severity] = (findingsBySeverity[r.severity] || 0) + r.c;
    totalFindings += r.c;
  }

  const capaByStatus: Record<string, number> = {};
  for (const r of capa.rows) capaByStatus[r.status] = r.c;

  const closedCount = closures.rows.find((r: GenericRow) => r.outcome === 'closed')?.c || 0;
  const totalClosures = closures.rows.reduce((sum: number, r: Record<string, unknown>) => (sum as any) + r.c, 0);
  const closureRate = totalClosures > 0 ? Math.round((closedCount / totalClosures) * 100) : 0;

  const sla = getFirstRow(slaCompliance) || { total_closed: 0, within_sla: 0 };
  const slaCompliancePct = sla.total_closed > 0
    ? Math.round((sla.within_sla / sla.total_closed) * 100) : 100;

  return {
    generatedAt: new Date().toISOString(),
    totalAudits: Object.values(auditsByStatus).reduce((a, b) => a + b, 0),
    auditsByStatus,
    totalFindings,
    findingsByStatus,
    findingsBySeverity,
    capaByStatus,
    closureRate,
    slaCompliancePct,
  };
}

// ── Committee Metrics (quarterly trends) ─────────────────────────────

export async function getCommitteeMetrics(tenantId: string) {
  const s = tenantSchema(tenantId);

  const [auditTrends, findingTrends, capaTrends] = await Promise.all([
    safeQuery(
      `SELECT
         DATE_TRUNC('quarter', created_at) AS quarter,
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
       FROM "${s}".audits WHERE deleted_at IS NULL
       GROUP BY quarter ORDER BY quarter DESC LIMIT 8`
    ),
    safeQuery(
      `SELECT
         DATE_TRUNC('quarter', created_at) AS quarter,
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE severity IN ('critical','high'))::int AS critical_high,
         COUNT(*) FILTER (WHERE status = 'closed')::int AS closed
       FROM "${s}".findings WHERE deleted_at IS NULL
       GROUP BY quarter ORDER BY quarter DESC LIMIT 8`
    ),
    safeQuery(
      `SELECT
         DATE_TRUNC('quarter', created_at) AS quarter,
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'overdue' OR (target_date < NOW() AND status != 'completed'))::int AS overdue
       FROM "${s}".remediation_plans WHERE deleted_at IS NULL
       GROUP BY quarter ORDER BY quarter DESC LIMIT 8`
    ),
  ]);

  return {
    auditTrends: auditTrends.rows,
    findingTrends: findingTrends.rows,
    capaTrends: capaTrends.rows,
  };
}

// ── Board Dashboard (high-level risk indicators + cross-module GRC posture) ──

export async function getBoardDashboard(tenantId: string) {
  const s = tenantSchema(tenantId);

  const safeCount = (q: string, params?: unknown[]) =>
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ count: 0 }]), safeQuery(q, params), { tenantId: tenantId, operation: 'fallback query' });

  const [criticalOpen, overdueCapas, auditCoverage, recentClosures,
         riskPosture, compliancePosture, auditRiskLinks] = await Promise.all([
    safeQuery(
      `SELECT COUNT(*)::int AS count
       FROM "${s}".findings
       WHERE severity IN ('critical','high') AND status = 'open' AND deleted_at IS NULL`
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS count
       FROM "${s}".remediation_plans
       WHERE target_date < NOW() AND status NOT IN ('completed','closed') AND deleted_at IS NULL`
    ),
    safeQuery(
      `SELECT
         COUNT(*)::int AS total_audits,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_audits,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS active_audits
       FROM "${s}".audits WHERE deleted_at IS NULL`
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS count
       FROM "${s}".closure_reviews
       WHERE outcome = 'closed' AND review_date >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL`
    ),
    // Cross-module: Risk posture
    safeCount(
      `SELECT
         COUNT(*)::int AS total_risks,
         COUNT(*) FILTER (WHERE risk_level IN ('critical','high'))::int AS high_risks,
         COUNT(*) FILTER (WHERE status = 'open')::int AS open_risks,
         COALESCE(AVG(likelihood * impact)::numeric(5,2), 0) AS avg_risk_score
       FROM "${s}".risks WHERE deleted_at IS NULL`
    ),
    // Cross-module: Compliance posture
    safeCount(
      `SELECT
         COUNT(*)::int AS total_controls,
         COUNT(*) FILTER (WHERE implementation_status = 'implemented')::int AS implemented,
         COUNT(*) FILTER (WHERE implementation_status = 'not_implemented')::int AS gaps
       FROM "${s}".controls WHERE deleted_at IS NULL`
    ),
    // Cross-module: Audit findings linked to risks
    safeCount(
      `SELECT COUNT(*)::int AS count
       FROM "${s}".risks
       WHERE risk_source = 'audit_finding' AND deleted_at IS NULL`
    ),
  ]);

  const coverage = getFirstRow(auditCoverage) || { total_audits: 0, completed_audits: 0, active_audits: 0 };
  const riskData = getFirstRow(riskPosture) || { total_risks: 0, high_risks: 0, open_risks: 0, avg_risk_score: 0 };
  const compData = getFirstRow(compliancePosture) || { total_controls: 0, implemented: 0, gaps: 0 };

  const compliancePct = compData.total_controls > 0

    ? Math.round((compData.implemented / compData.total_controls) * 100) : 0;

  return {
    criticalOpenFindings: getFirstRow(criticalOpen)?.count || 0,
    overdueCapaPlans: getFirstRow(overdueCapas)?.count || 0,
    totalAudits: coverage.total_audits,
    completedAudits: coverage.completed_audits,
    activeAudits: coverage.active_audits,
    recentClosures30d: getFirstRow(recentClosures)?.count || 0,
    riskLevel: (getFirstRow(criticalOpen)?.count || 0) > 5 ? 'high'
      : (getFirstRow(criticalOpen)?.count || 0) > 0 ? 'medium' : 'low',
    // Cross-module GRC posture
    grcPosture: {
      risk: {

        totalRisks: riskData.total_risks,

        highRisks: riskData.high_risks,

        openRisks: riskData.open_risks,

        avgRiskScore: riskData.avg_risk_score,
        findingsLinkedToRisks: getFirstRow(auditRiskLinks)?.count || 0,
      },
      compliance: {

        totalControls: compData.total_controls,

        implementedControls: compData.implemented,

        controlGaps: compData.gaps,
        compliancePct,
      },
    },
  };
}
