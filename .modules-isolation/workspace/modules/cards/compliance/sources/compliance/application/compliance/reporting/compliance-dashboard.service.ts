import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow as _getFirstRow } from '@dos/db';
import { logger } from '../../../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow } from '@dos/types';

export interface ComplianceDashboardSummary {
  totalFrameworks: number;
  activeFrameworks: number;
  totalObligations: number;
  metObligations: number;
  overdueObligations: number;
  openGaps: number;
  criticalGaps: number;
  pendingAssessments: number;
  completedAssessments: number;
  averageCoverage: number | null;
  maturityScore: number | null;
  pendingAttestations: number;
  controlMappingCoverage: number | null;
  topRiskFrameworks: FrameworkRiskItem[];
  recentActivity: RecentActivityItem[];
  capturedAt: string;
}

export interface FrameworkRiskItem {
  frameworkId: string;
  frameworkCode: string;
  nameEn: string;
  coveragePercent: number;
  overdueObligations: number;
  openGaps: number;
}

export interface RecentActivityItem {
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  performedAt: string;
}

export async function getComplianceDashboard(tenantId: string): Promise<ComplianceDashboardSummary> {
  const schema = tenantSchema(tenantId);
  try {
    const [frameworks, obligations, gaps, assessments, attestations, coverage, topRisk, activity] = await Promise.all([
      safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active
         FROM "${schema}".compliance_frameworks WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ total: 0, active: 0 }] })),
      safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'met')::int AS met,
           COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('met', 'waived'))::int AS overdue
         FROM "${schema}".compliance_obligations WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ total: 0, met: 0, overdue: 0 }] })),
      safeQuery(
        `SELECT
           COUNT(*) FILTER (WHERE status IN ('open', 'remediation_planned', 'in_remediation'))::int AS open,
           COUNT(*) FILTER (WHERE severity = 'critical' AND status IN ('open', 'remediation_planned'))::int AS critical
         FROM "${schema}".compliance_gap_snapshots WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ open: 0, critical: 0 }] })),
      safeQuery(
        `SELECT
           COUNT(*) FILTER (WHERE status IN ('draft', 'in_progress'))::int AS pending,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
         FROM "${schema}".compliance_assessments WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ pending: 0, completed: 0 }] })),
      safeQuery(
        `SELECT COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
         FROM "${schema}".attestation_records WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ pending: 0 }] })),
      safeQuery(
        `SELECT ROUND(AVG(
           CASE WHEN co_total > 0 THEN (co_met::numeric / co_total) * 100 ELSE NULL END
         ), 2) AS avg_coverage,
         ROUND(AVG(maturity_score), 2) AS maturity
         FROM (
           SELECT cf.framework_id,
             COUNT(co.obligation_id)::int AS co_total,
             COUNT(co.obligation_id) FILTER (WHERE co.status = 'met')::int AS co_met,
             cf.maturity_score
           FROM "${schema}".compliance_frameworks cf
           LEFT JOIN "${schema}".compliance_obligations co ON co.framework_id = cf.framework_id AND co.deleted_at IS NULL
           WHERE cf.status = 'active' AND cf.deleted_at IS NULL
           GROUP BY cf.framework_id, cf.maturity_score
         ) sub`,
      ).catch(() => ({ rows: [{ avg_coverage: null, maturity: null }] })),
      getTopRiskFrameworks(schema),
      getRecentActivity(schema),
    ]);

    const f = frameworks.rows[0] ?? {};
    const o = obligations.rows[0] ?? {};
    const g = gaps.rows[0] ?? {};
    const a = assessments.rows[0] ?? {};
    const c = coverage.rows[0] ?? {};

    return {
      totalFrameworks: f.total ?? 0,
      activeFrameworks: f.active ?? 0,
      totalObligations: o.total ?? 0,
      metObligations: o.met ?? 0,
      overdueObligations: o.overdue ?? 0,
      openGaps: g.open ?? 0,
      criticalGaps: g.critical ?? 0,
      pendingAssessments: a.pending ?? 0,
      completedAssessments: a.completed ?? 0,
      averageCoverage: c.avg_coverage != null ? parseFloat(c.avg_coverage) : null,
      maturityScore: c.maturity != null ? parseFloat(c.maturity) : null,
      pendingAttestations: attestations.rows[0]?.pending ?? 0,
      controlMappingCoverage: null,
      topRiskFrameworks: topRisk,
      recentActivity: activity,
      capturedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[ComplianceDashboard] getComplianceDashboard failed', { tenantId, error: toErrorMessage(err) });
    return {
      totalFrameworks: 0, activeFrameworks: 0, totalObligations: 0, metObligations: 0,
      overdueObligations: 0, openGaps: 0, criticalGaps: 0, pendingAssessments: 0,
      completedAssessments: 0, averageCoverage: null, maturityScore: null,
      pendingAttestations: 0, controlMappingCoverage: null,
      topRiskFrameworks: [], recentActivity: [],
      capturedAt: new Date().toISOString(),
    };
  }
}

async function getTopRiskFrameworks(schema: string): Promise<FrameworkRiskItem[]> {
  const result = await safeQuery(
    `SELECT cf.framework_id, cf.code, cf.name_en,
       COALESCE(ROUND((COUNT(co.obligation_id) FILTER (WHERE co.status = 'met')::numeric /
         NULLIF(COUNT(co.obligation_id), 0)) * 100, 1), 0) AS coverage_pct,
       COUNT(co.obligation_id) FILTER (WHERE co.due_date < NOW() AND co.status NOT IN ('met', 'waived'))::int AS overdue,
       (SELECT COUNT(*)::int FROM "${schema}".compliance_gap_snapshots cgs
        WHERE cgs.framework_id = cf.framework_id AND cgs.status IN ('open', 'remediation_planned') AND cgs.deleted_at IS NULL) AS open_gaps
     FROM "${schema}".compliance_frameworks cf
     LEFT JOIN "${schema}".compliance_obligations co ON co.framework_id = cf.framework_id AND co.deleted_at IS NULL
     WHERE cf.status = 'active' AND cf.deleted_at IS NULL
     GROUP BY cf.framework_id, cf.code, cf.name_en
     ORDER BY overdue DESC, open_gaps DESC
     LIMIT 5`,
  ).catch(() => ({ rows: [] }));

  return result.rows.map((r: GenericRow) => ({
    frameworkId: r.framework_id,
    frameworkCode: r.code,
    nameEn: r.name_en,
    coveragePercent: parseFloat(r.coverage_pct ?? '0'),
    overdueObligations: r.overdue ?? 0,
    openGaps: r.open_gaps ?? 0,
  }));
}

async function getRecentActivity(schema: string): Promise<RecentActivityItem[]> {
  const result = await safeQuery(
    `SELECT entity_type, entity_id, action, user_id AS performed_by, created_at AS performed_at
     FROM "${schema}".audit_trail
     WHERE module = 'compliance' AND created_at > NOW() - INTERVAL '7 days'
     ORDER BY created_at DESC
     LIMIT 10`,
  ).catch(() => ({ rows: [] }));

  return result.rows.map((r: GenericRow) => ({
    entityType: r.entity_type ?? '',
    entityId: r.entity_id ?? '',
    action: r.action ?? '',
    performedBy: r.performed_by ?? '',
    performedAt: r.performed_at?.toISOString?.() ?? r.performed_at ?? '',
  }));
}

export async function getComplianceRegulatorReadiness(tenantId: string): Promise<RegulatorReadinessResult> {
  const schema = tenantSchema(tenantId);
  try {
    const [frameworks, pendingSubmissions, attestationGaps] = await Promise.all([
      safeQuery(
        `SELECT cf.framework_id, cf.code, cf.name_en, cf.regulator_body,
           COALESCE(ROUND((COUNT(co.obligation_id) FILTER (WHERE co.status = 'met')::numeric /
             NULLIF(COUNT(co.obligation_id), 0)) * 100, 1), 0) AS readiness_pct,
           cf.status
         FROM "${schema}".compliance_frameworks cf
         LEFT JOIN "${schema}".compliance_obligations co ON co.framework_id = cf.framework_id AND co.deleted_at IS NULL
         WHERE cf.status = 'active' AND cf.deleted_at IS NULL
         GROUP BY cf.framework_id, cf.code, cf.name_en, cf.regulator_body, cf.status
         ORDER BY readiness_pct ASC`,
      ).catch(() => ({ rows: [] })),
      safeQuery(
        `SELECT COUNT(*)::int AS cnt FROM "${schema}".regulatory_submissions
         WHERE status IN ('draft', 'pending_review') AND deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ cnt: 0 }] })),
      safeQuery(
        `SELECT COUNT(*)::int AS cnt FROM "${schema}".attestation_records
         WHERE status IN ('pending', 'expired') AND deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ cnt: 0 }] })),
    ]);

    return {
      frameworkReadiness: frameworks.rows.map((r: GenericRow) => ({
        frameworkId: r.framework_id,
        code: r.code,
        nameEn: r.name_en,
        regulatorBody: r.regulator_body ?? null,
        readinessPercent: parseFloat(r.readiness_pct ?? '0'),
      })),
      pendingSubmissions: pendingSubmissions.rows[0]?.cnt ?? 0,
      attestationGaps: attestationGaps.rows[0]?.cnt ?? 0,
      overallReadiness: frameworks.rows.length > 0
        ? parseFloat((frameworks.rows.reduce((s: number, r: GenericRow) => s + parseFloat(r.readiness_pct ?? '0'), 0) / frameworks.rows.length).toFixed(1))
        : null,
      capturedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.warn('[ComplianceDashboard] getComplianceRegulatorReadiness failed', { tenantId, error: toErrorMessage(err) });
    return { frameworkReadiness: [], pendingSubmissions: 0, attestationGaps: 0, overallReadiness: null, capturedAt: new Date().toISOString() };
  }
}

export async function getRemediationLinkage(tenantId: string, limit: number = 30): Promise<RemediationLinkageItem[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT cgs.gap_id, cgs.framework_id, cgs.obligation_id, cgs.control_id,
         cgs.gap_type, cgs.severity, cgs.status, cgs.remediation_id, cgs.description,
         cgs.detected_at, cgs.closed_at
       FROM "${schema}".compliance_gap_snapshots cgs
       WHERE cgs.status IN ('open', 'remediation_planned', 'in_remediation')
         AND cgs.deleted_at IS NULL
       ORDER BY CASE cgs.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                cgs.detected_at ASC
       LIMIT $1`,
      [limit],
    ).catch(() => ({ rows: [] }));

    return result.rows.map((r: GenericRow) => ({
      gapId: r.gap_id,
      frameworkId: r.framework_id,
      obligationId: r.obligation_id ?? null,
      controlId: r.control_id ?? null,
      gapType: r.gap_type,
      severity: r.severity,
      status: r.status,
      remediationId: r.remediation_id ?? null,
      hasRemediation: r.remediation_id != null,
      description: r.description ?? '',
      detectedAt: r.detected_at?.toISOString?.() ?? r.detected_at ?? '',
    }));
  } catch (err) {
    logger.warn('[ComplianceDashboard] getRemediationLinkage failed', { tenantId, error: toErrorMessage(err) });
    return [];
  }
}

export interface RegulatorReadinessResult {
  frameworkReadiness: { frameworkId: string; code: string; nameEn: string; regulatorBody: string | null; readinessPercent: number }[];
  pendingSubmissions: number;
  attestationGaps: number;
  overallReadiness: number | null;
  capturedAt: string;
}

export interface RemediationLinkageItem {
  gapId: string;
  frameworkId: string;
  obligationId: string | null;
  controlId: string | null;
  gapType: string;
  severity: string;
  status: string;
  remediationId: string | null;
  hasRemediation: boolean;
  description: string;
  detectedAt: string;
}
