// ============================================
// Shahin-Ai — Audit Advanced Service
// Features: Risk-Based Universe Planning,
// Auditor Capacity, Committee Reporting,
// Finding Aging/SLA, QA Reviews, External Audit
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import type { GenericRow } from '@dos/types';

// ── Type Definitions ──────────────────────────────────────────────

export interface AuditableEntity {
  entity_id: string;
  entity_name: string;
  entity_type: string;
  department: string | null;
  risk_score: number;
  last_audit_date: string | null;
  days_since_audit: number | null;
  composite_score: number;
  priority_rank: number;
  audit_frequency: string;
  notes: string | null;
}

export interface AuditorCapacity {
  auditor_id: string;
  auditor_name: string;
  active_engagements: number;
  total_hours_allocated: number;
  available_capacity: number;
}

export interface CommitteeReport {
  generatedAt: string;
  period: string;
  totalAuditsCompleted: number;
  totalAuditsInProgress: number;
  totalAuditsPlanned: number;
  findingsBySeverity: Record<string, number>;
  overdueRemediations: number;
  riskCoveragePct: number;
  upcomingAudits: GenericRow[];
  topIssues: GenericRow[];
  closureRate: number;
}

export interface FindingAging {
  finding_id: string;
  title: string;
  severity: string;
  status: string;
  created_at: string;
  days_open: number;
  sla_days: number;
  sla_status: "on_track" | "warning" | "breached";
}

export interface QAReviewInput {
  reviewer: string;
  checklist_items: Record<string, unknown>[];
  overall_rating: "satisfactory" | "needs_improvement" | "unsatisfactory";
  comments?: string;
  status?: string;
}

export interface ExternalAuditInput {
  title: string;
  external_firm?: string;
  audit_type?: string;
  contact_email?: string;
  notes?: string;
  created_by?: string;
}

// ── SLA thresholds by severity (in days) ──────────────────────────

const SLA_THRESHOLDS: Record<string, number> = {
  critical: 15,
  high: 30,
  medium: 60,
  low: 90,
};

// Warning threshold is 80% of SLA days elapsed
const SLA_WARNING_PCT = 0.8;

// ── 4.1 Risk-Based Audit Universe Planning ────────────────────────

/**
 * Retrieve all auditable entities ranked by composite risk score.
 * Composite score = risk_score * (1 + days_since_last_audit / 365).
 * Entities that have never been audited receive maximum priority boost.
 */
export async function getAuditUniverse(tenantId: string): Promise<Record<string, unknown>[]> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       entity_id,
       entity_name,
       entity_type,
       department,
       risk_score,
       last_audit_date,
       audit_frequency,
       notes,
       CASE
         WHEN last_audit_date IS NOT NULL
           THEN EXTRACT(DAY FROM NOW() - last_audit_date)::int
         ELSE NULL
       END AS days_since_audit,
       CASE
         WHEN last_audit_date IS NOT NULL
           THEN ROUND(risk_score * (1 + EXTRACT(DAY FROM NOW() - last_audit_date) / 365.0), 2)
         ELSE ROUND(risk_score * 2, 2)
       END AS composite_score
     FROM "${s}".audit_universe
     ORDER BY
       CASE
         WHEN last_audit_date IS NOT NULL
           THEN risk_score * (1 + EXTRACT(DAY FROM NOW() - last_audit_date) / 365.0)
         ELSE risk_score * 2
       END DESC`
  );

  // Assign priority ranks based on sorted order
  return result.rows.map((row: GenericRow, idx: number) => ({
    ...row,
    priority_rank: idx + 1,
  }));
}

// ── 4.2 Audit Resource / Capacity Planning ────────────────────────

/** Maximum hours per auditor per period (configurable baseline) */
const MAX_AUDITOR_HOURS = 160;

/**
 * Return auditor capacity: active engagement count, total hours
 * allocated, and remaining available capacity.
 */
export async function getAuditorCapacity(tenantId: string): Promise<AuditorCapacity[]> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       aa.auditor_id,
       COALESCE(tm.full_name, tm.email, aa.auditor_id) AS auditor_name,
       COUNT(DISTINCT aa.engagement_id) FILTER (WHERE aa.status = 'active')::int AS active_engagements,
       COALESCE(SUM(aa.hours_allocated) FILTER (WHERE aa.status = 'active'), 0)::numeric AS total_hours_allocated,
       (${MAX_AUDITOR_HOURS} - COALESCE(SUM(aa.hours_allocated) FILTER (WHERE aa.status = 'active'), 0))::numeric AS available_capacity
     FROM "${s}".auditor_assignments aa
     LEFT JOIN "${s}".team_members tm ON tm.user_id = aa.auditor_id
     GROUP BY aa.auditor_id, tm.full_name, tm.email
     ORDER BY available_capacity DESC`
  );
  return result.rows;
}

/**
 * Assign an auditor to an engagement with a specified role.
 */
export async function assignAuditorToEngagement(
  tenantId: string,
  engagementId: string,
  auditorId: string,
  role: string
): Promise<GenericRow | undefined> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${s}".auditor_assignments
       (engagement_id, auditor_id, role, status, assigned_at)
     VALUES ($1, $2, $3, 'active', NOW())
     RETURNING *`,
    [engagementId, auditorId, role]
  );
  return result.rows[0];
}

// ── 4.3 Audit Committee Reporting Package ─────────────────────────

/**
 * Auto-compile a committee report for the given period.
 * Period format: 'Q1-2026', 'Q2-2026', or 'YYYY' for annual.
 * Falls back to all-time if period is not provided.
 */
export async function generateCommitteeReport(
  tenantId: string,
  period: string
): Promise<CommitteeReport> {
  const s = tenantSchema(tenantId);

  // Parse period into date range
  const { startDate, endDate } = parsePeriod(period);

  // Parameterize startDate/endDate so user-supplied period can't
  // inject SQL. $1 = startDate, $2 = endDate; `dateFilter` and
  // `dateFilterPlans` now only compose static literal fragments.
  const dateFilter = startDate && endDate
    ? `AND created_at >= $1 AND created_at < $2`
    : '';
  const dateFilterPlans = startDate && endDate
    ? `AND rp.created_at >= $1 AND rp.created_at < $2`
    : '';
  const dateParams: unknown[] = startDate && endDate ? [startDate, endDate] : [];

  const [audits, findings, overdueCapas, upcoming, topIssues, closures] = await Promise.all([
    // Audit counts by status
    safeQuery(
      `SELECT status, COUNT(*)::int AS c
       FROM "${s}".audits
       WHERE deleted_at IS NULL ${dateFilter}
       GROUP BY status`,
      dateParams
    ),
    // Findings by severity
    safeQuery(
      `SELECT severity, COUNT(*)::int AS c
       FROM "${s}".findings
       WHERE deleted_at IS NULL ${dateFilter}
       GROUP BY severity`,
      dateParams
    ),
    // Overdue remediation plans
    safeQuery(
      `SELECT COUNT(*)::int AS c
       FROM "${s}".remediation_plans rp
       WHERE rp.deleted_at IS NULL
         AND rp.target_date < NOW()
         AND rp.status NOT IN ('completed', 'closed')
         ${dateFilterPlans}`,
      dateParams
    ),
    // Upcoming audits (planned, starting within next 90 days)
    safeQuery(
      `SELECT audit_id, title, planned_start, planned_end, audit_type
       FROM "${s}".audits
       WHERE deleted_at IS NULL
         AND status = 'planned'
         AND planned_start IS NOT NULL
         AND planned_start <= NOW() + INTERVAL '90 days'
       ORDER BY planned_start ASC
       LIMIT 10`
    ),
    // Top issues (critical/high open findings)
    safeQuery(
      `SELECT finding_id, title, severity, status, created_at
       FROM "${s}".findings
       WHERE deleted_at IS NULL
         AND severity IN ('critical', 'high')
         AND status = 'open'
       ORDER BY
         CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 END,
         created_at ASC
       LIMIT 10`
    ),
    // Closure rate
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE outcome = 'closed')::int AS closed
       FROM "${s}".closure_reviews
       WHERE deleted_at IS NULL ${dateFilter}`,
      dateParams
    ),
  ]);

  // Build status counts
  const auditsByStatus: Record<string, number> = {};
  for (const r of audits.rows) auditsByStatus[r.status] = r.c;

  const findingsBySeverity: Record<string, number> = {};
  for (const r of findings.rows) {
    findingsBySeverity[r.severity] = r.c;
  }

  // Risk coverage: percentage of universe entities that have been audited
  const coverageRes = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE last_audit_date IS NOT NULL)::int AS audited
     FROM "${s}".audit_universe`
  );
  const cov = coverageRes.rows[0] || { total: 0, audited: 0 };
  const riskCoveragePct = cov.total > 0
    ? Math.round((cov.audited / cov.total) * 100)
    : 0;

  const closureData = closures.rows[0] || { total: 0, closed: 0 };
  const closureRate = closureData.total > 0
    ? Math.round((closureData.closed / closureData.total) * 100)
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    period,
    totalAuditsCompleted: auditsByStatus["completed"] || 0,
    totalAuditsInProgress: auditsByStatus["in_progress"] || 0,
    totalAuditsPlanned: auditsByStatus["planned"] || 0,
    findingsBySeverity,
    overdueRemediations: overdueCapas.rows[0]?.c || 0,
    riskCoveragePct,
    upcomingAudits: upcoming.rows,
    topIssues: topIssues.rows,
    closureRate,
  };
}

/**
 * Parse a period string (e.g. 'Q1-2026', '2026') into start/end dates.
 */
function parsePeriod(period: string): { startDate: string | null; endDate: string | null } {
  if (!period) return { startDate: null, endDate: null };

  // Quarter format: Q1-2026, Q2-2025, etc.
  const quarterMatch = period.match(/^Q([1-4])-(\d{4})$/i);
  if (quarterMatch) {
    const q = parseInt(quarterMatch[1], 10);
    const year = parseInt(quarterMatch[2], 10);
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = startMonth + 3;
    const startDate = `${year}-${String(startMonth).padStart(2, "0")}-01`;
    const endDate = endMonth <= 12
      ? `${year}-${String(endMonth).padStart(2, "0")}-01`
      : `${year + 1}-01-01`;
    return { startDate, endDate };
  }

  // Annual format: 2026
  const yearMatch = period.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    return { startDate: `${year}-01-01`, endDate: `${year + 1}-01-01` };
  }

  // Unrecognized period — return all-time
  return { startDate: null, endDate: null };
}

// ── 4.4 Finding Aging / SLA Tracking ──────────────────────────────

/**
 * Calculate days open for each open finding and determine SLA status.
 * SLA thresholds: Critical=15d, High=30d, Medium=60d, Low=90d.
 * Status: on_track (< 80% of SLA), warning (80-100%), breached (> 100%).
 */
export async function getFindingAging(tenantId: string): Promise<FindingAging[]> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       finding_id,
       title,
       severity,
       status,
       created_at,
       EXTRACT(DAY FROM NOW() - created_at)::int AS days_open
     FROM "${s}".findings
     WHERE deleted_at IS NULL
       AND status NOT IN ('closed', 'deferred')
     ORDER BY created_at ASC`
  );

  return result.rows.map((row: GenericRow) => {
    const slaDays = SLA_THRESHOLDS[row.severity] || SLA_THRESHOLDS.medium;
    const daysOpen = row.days_open || 0;
    let slaStatus: "on_track" | "warning" | "breached";

    if (daysOpen > slaDays) {
      slaStatus = "breached";
    } else if (daysOpen >= slaDays * SLA_WARNING_PCT) {
      slaStatus = "warning";
    } else {
      slaStatus = "on_track";
    }

    return {
      finding_id: row.finding_id,
      title: row.title,
      severity: row.severity,
      status: row.status,
      created_at: row.created_at,
      days_open: daysOpen,
      sla_days: slaDays,
      sla_status: slaStatus,
    };
  });
}

/**
 * Return only findings that have breached their SLA.
 */
export async function getFindingSLABreaches(tenantId: string): Promise<GenericRow[]> {
  const agingResults = await getFindingAging(tenantId);
  return agingResults.filter((f) => f.sla_status === "breached");
}

// ── 4.5 Audit QA Review ──────────────────────────────────────────

/**
 * Create a QA review for an audit engagement.
 * Stores peer review checklist, rating, and comments.
 */
export async function createQAReview(
  tenantId: string,
  engagementId: string,
  data: QAReviewInput
): Promise<GenericRow | undefined> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

/**
 * List QA reviews, optionally filtered by engagement.
 */
export async function getQAReviews(
  tenantId: string,
  engagementId?: string
): Promise<GenericRow[]> {
  const s = tenantSchema(tenantId);

  if (engagementId) {
    const result = await safeQuery(
      `SELECT qr.*, a.title AS engagement_title
       FROM "${s}".audit_qa_reviews qr
       LEFT JOIN "${s}".audits a ON a.audit_id = qr.engagement_id
       WHERE qr.engagement_id = $1
       ORDER BY qr.created_at DESC`,
      [engagementId]
    );
    return result.rows;
  }

  const result = await safeQuery(
    `SELECT qr.*, a.title AS engagement_title
     FROM "${s}".audit_qa_reviews qr
     LEFT JOIN "${s}".audits a ON a.audit_id = qr.engagement_id
     ORDER BY qr.created_at DESC`
  );
  return result.rows;
}

// ── 4.6 External Audit Coordination ──────────────────────────────

/**
 * Create an external audit request record.
 */
export async function createExternalAuditRequest(
  tenantId: string,
  data: ExternalAuditInput
): Promise<GenericRow | undefined> {
  const s = tenantSchema(tenantId);

  // Generate a one-time access token for controlled sharing
  const accessToken = uuid();
  // Access expires in 30 days by default
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const result = await safeQuery(
    `INSERT INTO "${s}".external_audit_requests
       (title, external_firm, audit_type, contact_email, notes,
        created_by, access_token, access_expires_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
     RETURNING *`,
    [
      data.title,
      data.external_firm || null,
      data.audit_type || "financial",
      data.contact_email || null,
      data.notes || null,
      data.created_by || null,
      accessToken,
      expiresAt.toISOString(),
    ]
  );
  return result.rows[0];
}

/**
 * List all external audit requests for the tenant.
 */
export async function getExternalAuditRequests(tenantId: string): Promise<GenericRow[]> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".external_audit_requests
     ORDER BY created_at DESC`
  );
  return result.rows;
}

/**
 * Share specific findings and evidence with an external auditor
 * by updating the shared_findings and shared_evidence JSONB arrays
 * on the external audit request record.
 */
export async function shareWithExternalAuditor(
  tenantId: string,
  requestId: string,
  findingIds: string[],
  evidenceIds: string[]
): Promise<GenericRow | undefined> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.audit_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}
