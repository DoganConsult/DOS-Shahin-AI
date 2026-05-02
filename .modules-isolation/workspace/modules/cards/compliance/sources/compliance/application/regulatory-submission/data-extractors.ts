// ============================================
// Shahin — Regulatory Submission Data Extractors
// Query tenant data for auto-filled sections:
// compliance score, controls, evidence, risk,
// incidents, remediation
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from "@dos/db";
import type { GenericRow } from '@dos/types';

/**
 * Extract compliance score data for a tenant and framework
 */
export async function extractComplianceScore(
  tenantId: string,
  frameworkCode: string
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Get framework compliance score
  const fwResult = await safeQuery(
    `SELECT framework_id, framework_name_en, framework_name_ar, compliance_score, last_assessment_date
     FROM "${schema}".frameworks
     WHERE framework_code = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [frameworkCode]
  );

  if (fwResult.rows.length === 0) {
    return {
      frameworkCode,
      complianceScore: 0,
      lastAssessmentDate: null,
      status: "not_assessed",
    };
  }

  const fw = getFirstRow(fwResult)!;
  const complianceScore = Number(fw.compliance_score) || 0;

  // Get control status breakdown
  const controlResult = await safeQuery(
    `SELECT test_status, COUNT(*)::int AS count
     FROM "${schema}".controls
     WHERE framework_id = $1 AND deleted_at IS NULL
     GROUP BY test_status`,
    [fw.framework_id]
  );

  const statusBreakdown: Record<string, number> = {};
  for (const row of controlResult.rows) {
    statusBreakdown[row.test_status || "not_tested"] = Number(row.count);
  }

  return {
    frameworkCode,
    frameworkNameEn: fw.framework_name_en,
    frameworkNameAr: fw.framework_name_ar,
    complianceScore,
    lastAssessmentDate: fw.last_assessment_date,
    status: complianceScore >= 80 ? "compliant" : complianceScore >= 60 ? "mostly_compliant" : "non_compliant",
    controlBreakdown: statusBreakdown,
    totalControls: Object.values(statusBreakdown).reduce((a, b) => a + b, 0),
  };
}

/**
 * Extract control status data
 */
export async function extractControlStatus(
  tenantId: string,
  frameworkCode: string
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Get framework ID
  const fwResult = await safeQuery(
    `SELECT framework_id FROM "${schema}".frameworks
     WHERE framework_code = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [frameworkCode]
  );

  if (fwResult.rows.length === 0) {
    return { controls: [], summary: {} };
  }

  const frameworkId = getFirstRow(fwResult)?.framework_id;

  // Get controls with status
  const controlResult = await safeQuery(
    `SELECT control_id, control_code, title_en, title_ar, test_status, effectiveness_score, last_tested_at
     FROM "${schema}".controls
     WHERE framework_id = $1 AND deleted_at IS NULL
     ORDER BY control_code`,
    [frameworkId]
  );

  const controls = controlResult.rows.map((c: GenericRow) => ({
    controlId: c.control_id,
    controlCode: c.control_code,
    titleEn: c.title_en,
    titleAr: c.title_ar,
    status: c.test_status || "not_tested",
    effectivenessScore: Number(c.effectiveness_score) || 0,
    lastTestedAt: c.last_tested_at,
  }));

  // Summary
  const summary: Record<string, number> = {};
  for (const c of controls) {
    summary[c.status] = (summary[c.status] || 0) + 1;
  }

  return { controls, summary };
}

/**
 * Extract evidence coverage data
 */
export async function extractEvidenceCoverage(
  tenantId: string,
  frameworkCode: string
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Get framework ID
  const fwResult = await safeQuery(
    `SELECT framework_id FROM "${schema}".frameworks
     WHERE framework_code = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [frameworkCode]
  );

  if (fwResult.rows.length === 0) {
    return { coverage: 0, evidenceCount: 0, qualityBreakdown: {} };
  }

  const frameworkId = getFirstRow(fwResult)?.framework_id;

  // Get controls with evidence
  const evidenceResult = await safeQuery(
    `SELECT
       COUNT(DISTINCT c.control_id)::int AS controls_with_evidence,
       COUNT(DISTINCT c.control_id) FILTER (WHERE e.evidence_id IS NOT NULL)::int AS total_controls,
       COUNT(DISTINCT e.evidence_id)::int AS evidence_count,
       COUNT(DISTINCT e.evidence_id) FILTER (WHERE e.quality_tier = 'A')::int AS tier_a_count,
       COUNT(DISTINCT e.evidence_id) FILTER (WHERE e.quality_tier = 'B')::int AS tier_b_count,
       COUNT(DISTINCT e.evidence_id) FILTER (WHERE e.quality_tier = 'C')::int AS tier_c_count
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".control_evidence_requirements cer ON cer.control_id = c.control_id
     LEFT JOIN "${schema}".evidence e ON e.evidence_id = cer.evidence_id AND e.deleted_at IS NULL
     WHERE c.framework_id = $1 AND c.deleted_at IS NULL`,
    [frameworkId]
  );

  const row = getFirstRow(evidenceResult)!;
  const totalControls = Number(row.total_controls) || 1;
  const controlsWithEvidence = Number(row.controls_with_evidence) || 0;
  const coverage = totalControls > 0 ? Math.round((controlsWithEvidence / totalControls) * 100) : 0;

  return {
    coverage,
    evidenceCount: Number(row.evidence_count) || 0,
    controlsWithEvidence,
    totalControls,
    qualityBreakdown: {
      tierA: Number(row.tier_a_count) || 0,
      tierB: Number(row.tier_b_count) || 0,
      tierC: Number(row.tier_c_count) || 0,
    },
  };
}

/**
 * Extract risk posture data
 */
export async function extractRiskPosture(tenantId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Get risk distribution
  const riskResult = await safeQuery(
    `SELECT risk_level, COUNT(*)::int AS count
     FROM "${schema}".risks
     WHERE deleted_at IS NULL
     GROUP BY risk_level`,
    []
  );

  const distribution: Record<string, number> = {};
  let totalRisks = 0;
  for (const row of riskResult.rows) {
    const level = row.risk_level || "low";
    distribution[level] = Number(row.count);
    totalRisks += Number(row.count);
  }

  // Get top risks
  const topRisksResult = await safeQuery(
    `SELECT risk_id, title, risk_level, likelihood, impact, treatment_status
     FROM "${schema}".risks
     WHERE deleted_at IS NULL
     ORDER BY
       CASE risk_level
         WHEN 'critical' THEN 4
         WHEN 'high' THEN 3
         WHEN 'medium' THEN 2
         WHEN 'low' THEN 1
         ELSE 0
       END DESC,
       (likelihood * impact) DESC
     LIMIT 10`,
    []
  );

  const topRisks = topRisksResult.rows.map((r: GenericRow) => ({
    riskId: r.risk_id,
    title: r.title,
    level: r.risk_level,
    likelihood: Number(r.likelihood) || 3,
    impact: Number(r.impact) || 3,
    treatmentStatus: r.treatment_status || "open",
  }));

  // Determine overall posture
  const criticalCount = distribution["critical"] || 0;
  const highCount = distribution["high"] || 0;
  let posture: "low" | "medium" | "high" | "critical" = "low";
  if (criticalCount > 0 || highCount > 5) {
    posture = criticalCount > 0 ? "critical" : "high";
  } else if (highCount > 0 || (distribution["medium"] || 0) > 10) {
    posture = "medium";
  }

  return {
    posture,
    distribution,
    totalRisks,
    topRisks,
  };
}

/**
 * Extract incident summary data
 */
export async function extractIncidentSummary(
  tenantId: string,
  periodStart: string,
  periodEnd: string
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  const incidentResult = await safeQuery(
    `SELECT
       COUNT(*)::int AS total_incidents,
       COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical_count,
       COUNT(*) FILTER (WHERE severity = 'high')::int AS high_count,
       COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved_count
     FROM "${schema}".incidents
     WHERE reported_at >= $1 AND reported_at <= $2 AND deleted_at IS NULL`,
    [periodStart, periodEnd]
  );

  const row = getFirstRow(incidentResult)!;
  const total = Number(row.total_incidents) || 0;
  const critical = Number(row.critical_count) || 0;
  const high = Number(row.high_count) || 0;
  const resolved = Number(row.resolved_count) || 0;

  // Get recent incidents
  const recentResult = await safeQuery(
    `SELECT incident_id, title, severity, status, reported_at, resolved_at
     FROM "${schema}".incidents
     WHERE reported_at >= $1 AND reported_at <= $2 AND deleted_at IS NULL
     ORDER BY reported_at DESC
     LIMIT 10`,
    [periodStart, periodEnd]
  );

  const recentIncidents = recentResult.rows.map((i: GenericRow) => ({
    incidentId: i.incident_id,
    title: i.title,
    severity: i.severity,
    status: i.status,
    reportedAt: i.reported_at,
    resolvedAt: i.resolved_at,
  }));

  return {
    total,
    critical,
    high,
    resolved,
    resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 100,
    recentIncidents,
  };
}

/**
 * Extract remediation status data
 */
export async function extractRemediationStatus(
  tenantId: string,
  frameworkCode: string
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Get framework ID
  const fwResult = await safeQuery(
    `SELECT framework_id FROM "${schema}".frameworks
     WHERE framework_code = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [frameworkCode]
  );

  if (fwResult.rows.length === 0) {
    return { tasks: [], summary: {} };
  }

  const frameworkId = getFirstRow(fwResult)?.framework_id;

  // Get remediation tasks linked to controls in this framework
  const taskResult = await safeQuery(
    `SELECT
       rt.task_id, rt.title, rt.status, rt.priority, rt.due_date, rt.completed_at,
       c.control_code, c.title_en, c.title_ar
     FROM "${schema}".remediation_tasks rt
     JOIN "${schema}".controls c ON c.control_id = rt.control_id
     WHERE c.framework_id = $1 AND rt.deleted_at IS NULL
     ORDER BY
       CASE rt.priority
         WHEN 'critical' THEN 4
         WHEN 'high' THEN 3
         WHEN 'medium' THEN 2
         WHEN 'low' THEN 1
         ELSE 0
       END DESC,
       rt.due_date ASC
     LIMIT 50`,
    [frameworkId]
  );

  const tasks = taskResult.rows.map((t: GenericRow) => ({
    taskId: t.task_id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.due_date,
    completedAt: t.completed_at,
    controlCode: t.control_code,
    controlTitleEn: t.title_en,
    controlTitleAr: t.title_ar,
  }));

  // Summary
  const summary: Record<string, number> = {};
  for (const t of tasks) {
    summary[t.status] = (summary[t.status] || 0) + 1;
  }

  const overdue = tasks.filter((t) => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < new Date()).length;

  return {
    tasks,
    summary,
    overdue,
    totalTasks: tasks.length,
    completedTasks: summary["completed"] || 0,
  };
}
