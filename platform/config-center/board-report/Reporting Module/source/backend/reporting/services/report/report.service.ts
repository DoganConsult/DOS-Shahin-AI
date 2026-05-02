// ============================================
// Shahin — Report Service
// Compliance report generation, executive
// snapshots, and report metadata serialization
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// === Types ===

export interface ReportMetadata {
  title: string;
  type: string;
  parameters: Record<string, unknown>;
  generatedAt: string;
  filePath?: string;
}

export interface ReportData {
  title: string;
  frameworkId: string;
  generatedAt: string;
  overallScore: number;
  assessments: Array<{
    assessmentId: string;
    title: string;
    score: number;
    status: string;
  }>;
  controlSummary: {
    compliant: number;
    partiallyCompliant: number;
    nonCompliant: number;
    notApplicable: number;
    notAssessed: number;
  };
  evidenceCount: number;
}

export interface ExecutiveSnapshot {
  generatedAt: string;
  overallComplianceScore: number;
  openRisksCount: number;
  pendingRemediationsCount: number;
  evidenceCoveragePercent: number;
}

// === Serialization ===

/**
 * Serializes ReportMetadata to JSON with consistent key ordering.
 */
export function serializeReportMetadata(metadata: ReportMetadata): string {
  const ordered: Record<string, unknown> = {
    title: metadata.title,
    type: metadata.type,
    parameters: metadata.parameters,
    generatedAt: metadata.generatedAt,
  };
  if (metadata.filePath !== undefined) {
    ordered.filePath = metadata.filePath;
  }
  return JSON.stringify(ordered);
}

/**
 * Deserializes a JSON string back into a ReportMetadata object.
 */
export function deserializeReportMetadata(json: string): ReportMetadata {
  const parsed = JSON.parse(json);
  const metadata: ReportMetadata = {
    title: parsed.title,
    type: parsed.type,
    parameters: parsed.parameters,
    generatedAt: parsed.generatedAt,
  };
  if (parsed.filePath !== undefined) {
    metadata.filePath = parsed.filePath;
  }
  return metadata;
}

// === Report Generation ===

/**
 * Generates a compliance report for a specific framework.
 * Aggregates assessment scores, control item statuses, and evidence counts.
 */
export async function generateComplianceReport(
  tenantId: string,
  frameworkId: string
): Promise<ReportData> {
  const schema = tenantSchema(tenantId);

  // Get all assessments for this framework
  const assessmentsResult = await safeQuery(
    `SELECT assessment_id, title, score, status
     FROM "${schema}".assessments
     WHERE framework_id = $1
     ORDER BY created_at DESC`,
    [frameworkId]
  );

  const assessments = assessmentsResult.rows.map((row: GenericRow) => ({
    assessmentId: row.assessment_id,
    title: row.title,
    score: parseFloat(row.score) || 0,
    status: row.status,
  }));

  // Calculate overall score as average of all assessment scores
  const overallScore =
    assessments.length > 0
      ? assessments.reduce((sum: number, a: any) => sum + a.score, 0) /
        assessments.length
      : 0;

  // Get assessment IDs for item aggregation
  const assessmentIds = assessments.map((a: GenericRow) => a.assessmentId);

  // Aggregate control item statuses across all assessments for this framework
  let controlSummary = {
    compliant: 0,
    partiallyCompliant: 0,
    nonCompliant: 0,
    notApplicable: 0,
    notAssessed: 0,
  };

  if (assessmentIds.length > 0) {
    const itemsResult = await safeQuery(
      `SELECT status, COUNT(*)::int as count
       FROM "${schema}".assessment_items
       WHERE assessment_id = ANY($1)
       GROUP BY status`,
      [assessmentIds]
    );

    for (const row of itemsResult.rows) {
      switch (row.status) {
        case "compliant":
          controlSummary.compliant = row.count;
          break;
        case "partially_compliant":
          controlSummary.partiallyCompliant = row.count;
          break;
        case "non_compliant":
          controlSummary.nonCompliant = row.count;
          break;
        case "not_applicable":
          controlSummary.notApplicable = row.count;
          break;
        case "not_assessed":
          controlSummary.notAssessed = row.count;
          break;
      }
    }
  }

  // Count evidence linked to controls in this framework's assessments
  let evidenceCount = 0;
  if (assessmentIds.length > 0) {
    const evidenceResult = await safeQuery(
      `SELECT COUNT(DISTINCT e.evidence_id)::int as count
       FROM "${schema}".evidence e
       INNER JOIN "${schema}".assessment_items ai
         ON e.control_id = ai.control_node_id
       WHERE ai.assessment_id = ANY($1)`,
      [assessmentIds]
    );
    evidenceCount = getFirstRow(evidenceResult)?.count || 0;
  }

  return {
    title: `Compliance Report — ${frameworkId}`,
    frameworkId,
    generatedAt: new Date().toISOString(),
    overallScore: Math.round(overallScore * 100) / 100,
    assessments,
    controlSummary,
    evidenceCount,
  };
}

/**
 * Generates an executive snapshot with top-level KPIs across all frameworks.
 * - overallComplianceScore: average of all assessment scores
 * - openRisksCount: risks with status != 'closed'
 * - pendingRemediationsCount: remediation tasks with status 'open' or 'in_progress'
 * - evidenceCoveragePercent: percentage of controls that have at least one evidence
 */
export async function generateExecutiveSnapshot(
  tenantId: string
): Promise<ExecutiveSnapshot> {
  const schema = tenantSchema(tenantId);

  // Overall compliance score: average of all assessment scores
  const scoreResult = await safeQuery(
    `SELECT AVG(score)::decimal as avg_score
     FROM "${schema}".assessments`
  );
  const overallComplianceScore =
    Math.round((parseFloat(getFirstRow(scoreResult)?.avg_score) || 0) * 100) / 100;

  // Open risks count
  const risksResult = await safeQuery(
    `SELECT COUNT(*)::int as count
     FROM "${schema}".risks
     WHERE status != 'closed'`
  );
  const openRisksCount = getFirstRow(risksResult)?.count || 0;

  // Pending remediations count
  let pendingRemediationsCount = 0;
  try {
    const remResult = await safeQuery(
      `SELECT COUNT(*)::int as count
       FROM "${schema}".remediation_tasks
       WHERE status IN ('open', 'in_progress')`
    );
    pendingRemediationsCount = getFirstRow(remResult)?.count || 0;
  } catch {
    // remediation_tasks table may not exist yet (Phase 3)
  }

  // Evidence coverage: % of controls that have at least one evidence
  const controlsResult = await safeQuery(
    `SELECT COUNT(*)::int as total FROM "${schema}".controls`
  );
  const totalControls = getFirstRow(controlsResult)?.total || 0;

  let coveredControls = 0;
  if (totalControls > 0) {
    const coveredResult = await safeQuery(
      `SELECT COUNT(DISTINCT control_id)::int as count
       FROM "${schema}".evidence`
    );
    coveredControls = getFirstRow(coveredResult)?.count || 0;
  }

  const evidenceCoveragePercent =
    totalControls > 0
      ? Math.round((coveredControls / totalControls) * 10000) / 100
      : 0;

  return {
    generatedAt: new Date().toISOString(),
    overallComplianceScore,
    openRisksCount,
    pendingRemediationsCount,
    evidenceCoveragePercent,
  };
}

// === Report Scheduling ===

export interface ReportSchedule {
  scheduleId?: string;
  reportType: string;
  parameters: Record<string, unknown>;
  cronExpression: string;
  enabled?: boolean;
  lastRunAt?: string | null;
  createdBy: string;
  createdAt?: string;
}

/**
 * Basic cron expression validation.
 * Accepts standard 5-field cron: minute hour day-of-month month day-of-week
 */
function isValidCron(expression: string): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length < 5 || parts.length > 6) return false;
  // Each field must contain only digits, *, /, -, and comma
  const fieldPattern = /^[\d*\/,\-]+$/;
  return parts.every((p) => fieldPattern.test(p));
}

/**
 * Persists a cron-based report schedule for a tenant.
 * Validates the cron expression before inserting.
 */
export async function scheduleReportBasic(
  tenantId: string,
  schedule: {
    reportType: string;
    parameters: Record<string, unknown>;
    cronExpression: string;
    createdBy: string;
  }
): Promise<ReportSchedule> {
  const schema = tenantSchema(tenantId);
  if (!isValidCron(schedule.cronExpression)) {
    const e = new Error('Invalid cron expression');
    (e as any).statusCode = 400;
    throw e;
  }

  const result = await safeQuery(
    `INSERT INTO "${schema}".report_schedules (report_type, parameters, cron_expression, created_by)
     VALUES ($1, $2::jsonb, $3, $4)
     RETURNING schedule_id, report_type, parameters, cron_expression, enabled, last_run_at, created_by, created_at`,
    [schedule.reportType, JSON.stringify(schedule.parameters ?? {}), schedule.cronExpression, schedule.createdBy],
  ).catch(() => ({ rows: [] as any[] }));

  const row = getFirstRow(result) as any;
  return {
    scheduleId: row?.schedule_id,
    reportType: row?.report_type ?? schedule.reportType,
    parameters: row?.parameters ?? schedule.parameters,
    cronExpression: row?.cron_expression ?? schedule.cronExpression,
    enabled: row?.enabled ?? true,
    lastRunAt: row?.last_run_at ?? null,
    createdBy: row?.created_by ?? schedule.createdBy,
    createdAt: row?.created_at?.toISOString?.() ?? row?.created_at ?? new Date().toISOString(),
  };
}

/**
 * Retrieves all report schedules for a tenant.
 */
export async function getScheduledReports(
  tenantId: string
): Promise<ReportSchedule[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT schedule_id, report_type, parameters, cron_expression,
            enabled, last_run_at, created_by, created_at
     FROM "${schema}".report_schedules
     ORDER BY created_at DESC`
  );

  return result.rows.map((row: GenericRow) => ({
    scheduleId: row.schedule_id,
    reportType: row.report_type,
    parameters: row.parameters,
    cronExpression: row.cron_expression,
    enabled: row.enabled,
    lastRunAt: row.last_run_at,
    createdBy: row.created_by,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  }));
}
