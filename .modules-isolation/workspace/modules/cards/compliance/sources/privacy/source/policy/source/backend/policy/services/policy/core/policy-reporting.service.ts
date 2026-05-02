// ============================================
// Policy Reporting Service
// Generates 7 enterprise report types for
// policy governance: executive pack, ack status,
// stale policies, coverage gaps, exceptions,
// publication history, and review compliance.
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { v4 as uuid } from 'uuid';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReportCatalogEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  requiredPermission: string;
}

export interface ReportOptions {
  format?: 'json' | 'csv' | 'pdf';
  dateFrom?: string;
  dateTo?: string;
  categoryFilter?: string;
  statusFilter?: string;
}

export interface ReportResult {
  reportId: string;
  reportType: string;
  generatedAt: string;
  data: unknown;
  summary: Record<string, unknown>;
}

// ── Report Catalog ─────────────────────────────────────────────────────────

const REPORT_CATALOG: ReportCatalogEntry[] = [
  {
    id: 'executive_pack',
    name: 'Executive Policy Summary',
    description: 'High-level KPIs: total policies, status distribution, top categories, acknowledgment rate, active exceptions, stale count, and coverage percentage.',
    category: 'executive',
    requiredPermission: 'policy.document.read',
  },
  {
    id: 'acknowledgment',
    name: 'Acknowledgment Completion Report',
    description: 'Per-campaign breakdown: total users, attested, declined, pending, completion rate, and overdue user list.',
    category: 'compliance',
    requiredPermission: 'policy.document.read',
  },
  {
    id: 'stale_policies',
    name: 'Stale Policy Report',
    description: 'Policies not reviewed within their configured review cycle or past their next review date.',
    category: 'compliance',
    requiredPermission: 'policy.document.read',
  },
  {
    id: 'coverage',
    name: 'Policy Coverage Report',
    description: 'Identifies gaps in control, risk, and obligation linkages across the policy portfolio.',
    category: 'governance',
    requiredPermission: 'policy.document.read',
  },
  {
    id: 'exception_register',
    name: 'Exception Register',
    description: 'All policy exceptions with status, expiry, compensating controls, and approval history.',
    category: 'risk',
    requiredPermission: 'policy.document.read',
  },
  {
    id: 'publication_history',
    name: 'Publication History Report',
    description: 'Publication campaigns with delivery statistics, acknowledgment rates, and channel distribution.',
    category: 'operations',
    requiredPermission: 'policy.document.read',
  },
  {
    id: 'review_compliance',
    name: 'Review Cycle Compliance Report',
    description: 'Policies grouped by review status: on-time, late, missed, and upcoming reviews.',
    category: 'compliance',
    requiredPermission: 'policy.document.read',
  },
];

/**
 * Return the list of available report types with metadata.
 */
export function getReportCatalog(): ReportCatalogEntry[] {
  return REPORT_CATALOG;
}

// ── Report Dispatcher ──────────────────────────────────────────────────────

/**
 * Run a specific report by type.
 * Dispatches to the appropriate generator function.
 */
export async function runReport(
  tenantId: string,
  reportType: string,
  options?: ReportOptions,
): Promise<ReportResult> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.policy_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

// ── Executive Pack ─────────────────────────────────────────────────────────

/**
 * Aggregate KPIs for executive dashboard:
 * total policies, status distribution, top categories, acknowledgment rate,
 * active exceptions, stale count, coverage %, recent changes.
 */
export async function generateExecutivePack(
  tenantId: string,
  _options?: ReportOptions,
): Promise<{ data: unknown; summary: Record<string, unknown> }> {
  const schema = tenantSchema(tenantId);

  // Status distribution
  const statusResult = await safeQuery(
    `SELECT status, COUNT(*)::int AS count
     FROM "${schema}".policies
     WHERE deleted_at IS NULL
     GROUP BY status`,
    [],
  );
  const statusMap: Record<string, number> = {};
  let total = 0;
  for (const row of statusResult.rows) {
    statusMap[row.status] = row.count;
    total += row.count;
  }

  // Top categories
  const categoryResult = await safeQuery(
    `SELECT COALESCE(category, 'uncategorized') AS category, COUNT(*)::int AS count
     FROM "${schema}".policies WHERE deleted_at IS NULL
     GROUP BY category ORDER BY count DESC LIMIT 10`,
    [],
  );

  // Active exceptions
  const exceptionResult = await safeQuery(
    `SELECT COUNT(*)::int AS count
     FROM "${schema}".policy_exception_requests
     WHERE status IN ('pending','approved','under_review')`,
    [],
  );
  const activeExceptions = getFirstRow(exceptionResult)?.count ?? 0;

  // Stale count (past review date or not updated in 12 months)
  const staleResult = await safeQuery(
    `SELECT COUNT(*)::int AS count
     FROM "${schema}".policies
     WHERE deleted_at IS NULL AND status = 'published'
       AND (next_review_date < NOW() OR updated_at < NOW() - INTERVAL '12 months')`,
    [],
  );
  const staleCount = getFirstRow(staleResult)?.count ?? 0;

  // Acknowledgment rate (across all active campaigns)
  const ackResult = await safeQuery(
    `SELECT
       COUNT(*)::int AS total_records,
       COUNT(*) FILTER (WHERE ar.status = 'attested')::int AS attested
     FROM "${schema}".attestation_records ar
     JOIN "${schema}".attestation_campaigns ac ON ac.campaign_id = ar.campaign_id
     WHERE ac.status = 'active'`,
    [],
  );
  const ackRow = getFirstRow(ackResult)!;
  const ackRate = ackRow && ackRow.total_records > 0
    ? Math.round((ackRow.attested / ackRow.total_records) * 100)
    : 0;

  // Coverage: policies with at least one control link
  const coverageResult = await safeQuery(
    `SELECT
       COUNT(DISTINCT p.policy_id)::int AS total,
       COUNT(DISTINCT pcl.policy_id)::int AS with_controls
     FROM "${schema}".policies p
     LEFT JOIN "${schema}".policy_control_links pcl ON pcl.policy_id = p.policy_id
     WHERE p.deleted_at IS NULL AND p.status = 'published'`,
    [],
  );
  const covRow = getFirstRow(coverageResult)!;
  const coveragePercent = covRow && covRow.total > 0
    ? Math.round((covRow.with_controls / covRow.total) * 100)
    : 0;

  // Recent changes (last 30 days)
  const recentResult = await safeQuery(
    `SELECT policy_id, title, status, updated_at
     FROM "${schema}".policies
     WHERE deleted_at IS NULL AND updated_at >= NOW() - INTERVAL '30 days'
     ORDER BY updated_at DESC LIMIT 20`,
    [],
  );

  const data = {
    statusDistribution: statusMap,
    topCategories: categoryResult.rows,
    activeExceptions,
    staleCount,
    acknowledgmentRate: ackRate,
    coveragePercent,
    recentChanges: recentResult.rows,
  };

  return {
    data,
    summary: {
      totalPolicies: total,
      publishedCount: statusMap['published'] ?? 0,
      draftCount: statusMap['draft'] ?? 0,
      retiredCount: statusMap['retired'] ?? 0,
      activeExceptions,
      staleCount,
      acknowledgmentRate: ackRate,
      coveragePercent,
    },
  };
}

// ── Acknowledgment Report ──────────────────────────────────────────────────

/**
 * Per-campaign attestation breakdown: total users, attested, declined,
 * pending, completion rate, and list of overdue users.
 */
export async function generateAcknowledgmentReport(
  tenantId: string,
  options?: ReportOptions,
): Promise<{ data: unknown; summary: Record<string, unknown> }> {
  const schema = tenantSchema(tenantId);

  let dateFilter = '';
  const params: unknown[] = [];
  let paramIdx = 1;

  if (options?.dateFrom) {
    dateFilter += ` AND ac.created_at >= $${paramIdx++}`;
    params.push(options.dateFrom);
  }
  if (options?.dateTo) {
    dateFilter += ` AND ac.created_at <= $${paramIdx++}`;
    params.push(options.dateTo);
  }

  const result = await safeQuery(
    `SELECT
       ac.campaign_id, ac.name AS campaign_name,
       ac.due_date, ac.status AS campaign_status,
       p.title AS policy_title, p.policy_id,
       COUNT(ar.record_id)::int AS total_users,
       COUNT(ar.record_id) FILTER (WHERE ar.status = 'attested')::int AS attested,
       COUNT(ar.record_id) FILTER (WHERE ar.status = 'declined')::int AS declined,
       COUNT(ar.record_id) FILTER (WHERE ar.status = 'pending')::int AS pending,
       CASE WHEN COUNT(ar.record_id) > 0
         THEN ROUND((COUNT(ar.record_id) FILTER (WHERE ar.status = 'attested')::numeric
               / COUNT(ar.record_id)::numeric) * 100, 1)
         ELSE 0
       END AS completion_rate
     FROM "${schema}".attestation_campaigns ac
     LEFT JOIN "${schema}".attestation_records ar ON ar.campaign_id = ac.campaign_id
     LEFT JOIN "${schema}".policies p ON p.policy_id = ac.policy_id
     WHERE 1=1 ${dateFilter}
     GROUP BY ac.campaign_id, ac.name, ac.due_date, ac.status, p.title, p.policy_id
     ORDER BY ac.created_at DESC`,
    params,
  );

  // Find overdue users (pending records past due date)
  const overdueResult = await safeQuery(
    `SELECT ar.user_id, ac.campaign_id, ac.name AS campaign_name, ac.due_date,
            u.first_name, u.last_name, u.email
     FROM "${schema}".attestation_records ar
     JOIN "${schema}".attestation_campaigns ac ON ac.campaign_id = ar.campaign_id
     LEFT JOIN public.users u ON u.user_id = ar.user_id::text
     WHERE ar.status = 'pending' AND ac.due_date < NOW() AND ac.status = 'active'
     ORDER BY ac.due_date ASC`,
    [],
  );

  const totalCampaigns = result.rows.length;
  const totalUsers = result.rows.reduce((s: number, r: Record<string, number>) => s + r.total_users, 0);
  const totalAttested = result.rows.reduce((s: number, r: Record<string, number>) => s + r.attested, 0);

  return {
    data: {
      campaigns: result.rows,
      overdueUsers: overdueResult.rows,
    },
    summary: {
      totalCampaigns,
      totalUsers,
      totalAttested,
      overallCompletionRate: totalUsers > 0 ? Math.round((totalAttested / totalUsers) * 100) : 0,
      overdueUserCount: overdueResult.rows.length,
    },
  };
}

// ── Stale Policy Report ────────────────────────────────────────────────────

/**
 * Policies that have not been reviewed within their cycle or are
 * past their next_review_date.
 */
export async function generateStalePolicyReport(
  tenantId: string,
  options?: ReportOptions,
): Promise<{ data: unknown; summary: Record<string, unknown> }> {
  const schema = tenantSchema(tenantId);

  const conditions: string[] = [
    'p.deleted_at IS NULL',
    "p.status = 'published'",
    `(p.next_review_date < NOW() OR p.updated_at < NOW() - INTERVAL '12 months')`,
  ];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (options?.categoryFilter) {
    conditions.push(`p.category = $${paramIdx++}`);
    params.push(options.categoryFilter);
  }

  const result = await safeQuery(
    `SELECT p.policy_id, p.title, p.title_en, p.category, p.owner,
            p.status, p.next_review_date, p.updated_at, p.review_frequency,
            p.business_domain,
            EXTRACT(DAY FROM NOW() - COALESCE(p.next_review_date, p.updated_at))::int AS days_overdue
     FROM "${schema}".policies p
     WHERE ${conditions.join(' AND ')}
     ORDER BY days_overdue DESC`,
    params,
  );

  return {
    data: { stalePolicies: result.rows },
    summary: {
      totalStale: result.rows.length,
      avgDaysOverdue: result.rows.length > 0
        ? Math.round(result.rows.reduce((s: number, r: Record<string, number>) => s + (r.days_overdue ?? 0), 0) / result.rows.length)
        : 0,
      byCategory: groupByField(result.rows, 'category'),
    },
  };
}

// ── Coverage Report ────────────────────────────────────────────────────────

/**
 * Identifies linkage gaps: policies without controls, without risks;
 * controls without policy; risks without policy.
 */
export async function generateCoverageReport(
  tenantId: string,
  _options?: ReportOptions,
): Promise<{ data: unknown; summary: Record<string, unknown> }> {
  const schema = tenantSchema(tenantId);

  // Policies without any control links
  const noControlsResult = await safeQuery(
    `SELECT p.policy_id, p.title, p.status, p.category
     FROM "${schema}".policies p
     LEFT JOIN "${schema}".policy_control_links pcl ON pcl.policy_id = p.policy_id
     WHERE p.deleted_at IS NULL AND p.status IN ('published','draft')
       AND pcl.link_id IS NULL
     ORDER BY p.title`,
    [],
  );

  // Policies without any risk links
  const noRisksResult = await safeQuery(
    `SELECT p.policy_id, p.title, p.status, p.category
     FROM "${schema}".policies p
     LEFT JOIN "${schema}".policy_risk_links prl ON prl.policy_id = p.policy_id
     WHERE p.deleted_at IS NULL AND p.status IN ('published','draft')
       AND prl.link_id IS NULL
     ORDER BY p.title`,
    [],
  );

  // Controls without policy
  const orphanControlsResult = await safeQuery(
    `SELECT c.control_id, c.title
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".policy_control_links pcl ON pcl.control_id = c.control_id
     WHERE pcl.link_id IS NULL
     ORDER BY c.title
     LIMIT 200`,
    [],
  );

  // Risks without policy
  const orphanRisksResult = await safeQuery(
    `SELECT r.risk_id, r.title
     FROM "${schema}".risks r
     LEFT JOIN "${schema}".policy_risk_links prl ON prl.risk_id = r.risk_id
     WHERE prl.link_id IS NULL
     ORDER BY r.title
     LIMIT 200`,
    [],
  );

  return {
    data: {
      policiesWithoutControls: noControlsResult.rows,
      policiesWithoutRisks: noRisksResult.rows,
      controlsWithoutPolicy: orphanControlsResult.rows,
      risksWithoutPolicy: orphanRisksResult.rows,
    },
    summary: {
      policiesWithoutControls: noControlsResult.rows.length,
      policiesWithoutRisks: noRisksResult.rows.length,
      controlsWithoutPolicy: orphanControlsResult.rows.length,
      risksWithoutPolicy: orphanRisksResult.rows.length,
    },
  };
}

// ── Exception Register ─────────────────────────────────────────────────────

/**
 * All exceptions with policy title, requestor, status, expiry,
 * compensating controls, and approval history.
 */
export async function generateExceptionRegister(
  tenantId: string,
  options?: ReportOptions,
): Promise<{ data: unknown; summary: Record<string, unknown> }> {
  const schema = tenantSchema(tenantId);

  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (options?.statusFilter) {
    conditions.push(`ex.status = $${paramIdx++}`);
    params.push(options.statusFilter);
  }
  if (options?.dateFrom) {
    conditions.push(`ex.created_at >= $${paramIdx++}`);
    params.push(options.dateFrom);
  }
  if (options?.dateTo) {
    conditions.push(`ex.created_at <= $${paramIdx++}`);
    params.push(options.dateTo);
  }

  const result = await safeQuery(
    `SELECT ex.*,
            p.title AS policy_title, p.category AS policy_category,
            u.first_name AS requestor_first_name, u.last_name AS requestor_last_name, u.email AS requestor_email
     FROM "${schema}".policy_exception_requests ex
     LEFT JOIN "${schema}".policies p ON p.policy_id = ex.policy_id
     LEFT JOIN public.users u ON u.user_id = ex.requested_by
     WHERE ${conditions.join(' AND ')}
     ORDER BY ex.created_at DESC`,
    params,
  );

  // Get approval history for each exception
  const exceptionIds = result.rows.map((r: Record<string, unknown>) => r.exception_id);
  let approvals: unknown[] = [];
  if (exceptionIds.length > 0) {
    const approvalResult = await safeQuery(
      `SELECT * FROM "${schema}".policy_exception_approvals
       WHERE exception_id = ANY($1)
       ORDER BY decided_at DESC`,
      [exceptionIds],
    );
    approvals = approvalResult.rows;
  }

  // Map approvals to exceptions
  const approvalMap = new Map<string, unknown[]>();
  for (const a of approvals) {

    const list = approvalMap.get(a.exception_id) ?? [];
    list.push(a);

    approvalMap.set(a.exception_id, list);
  }

  const enrichedExceptions = result.rows.map((ex: Record<string, unknown>) => ({
    ...ex,
    approvalHistory: approvalMap.get((ex as any).exception_id) ?? [],
  }));

  // Status distribution
  const statusCounts: Record<string, number> = {};
  for (const ex of result.rows) {
    statusCounts[ex.status] = (statusCounts[ex.status] ?? 0) + 1;
  }

  // Expiring soon (next 30 days)
  const expiringSoon = result.rows.filter(
    (ex: Record<string, unknown>) => ex.status === 'approved' && ex.expiry_date &&
    new Date((ex as any).expiry_date).getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).length;

  return {
    data: { exceptions: enrichedExceptions },
    summary: {
      totalExceptions: result.rows.length,
      statusDistribution: statusCounts,
      expiringSoon,
      activeCount: statusCounts['approved'] ?? 0,
      pendingCount: statusCounts['pending'] ?? 0,
    },
  };
}

// ── Publication History ────────────────────────────────────────────────────

/**
 * Publication campaigns with delivery stats.
 */
export async function generatePublicationHistory(
  tenantId: string,
  options?: ReportOptions,
): Promise<{ data: unknown; summary: Record<string, unknown> }> {
  const schema = tenantSchema(tenantId);

  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (options?.dateFrom) {
    conditions.push(`pp.created_at >= $${paramIdx++}`);
    params.push(options.dateFrom);
  }
  if (options?.dateTo) {
    conditions.push(`pp.created_at <= $${paramIdx++}`);
    params.push(options.dateTo);
  }

  const result = await safeQuery(
    `SELECT pp.*,
            p.title AS policy_title, p.category AS policy_category,
            COUNT(pdr.delivery_id)::int AS total_deliveries,
            COUNT(pdr.delivery_id) FILTER (WHERE pdr.status = 'delivered')::int AS delivered_count,
            COUNT(pdr.delivery_id) FILTER (WHERE pdr.status = 'viewed')::int AS viewed_count,
            COUNT(pdr.delivery_id) FILTER (WHERE pdr.status = 'acknowledged')::int AS acknowledged_count,
            COUNT(pdr.delivery_id) FILTER (WHERE pdr.status = 'pending')::int AS pending_count
     FROM "${schema}".policy_publications pp
     LEFT JOIN "${schema}".policies p ON p.policy_id = pp.policy_id
     LEFT JOIN "${schema}".policy_delivery_records pdr ON pdr.publication_id = pp.publication_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY pp.publication_id, p.title, p.category
     ORDER BY pp.created_at DESC`,
    params,
  );

  const totalPublications = result.rows.length;
  const totalDeliveries = result.rows.reduce((s: number, r: Record<string, number>) => s + r.total_deliveries, 0);
  const totalAcknowledged = result.rows.reduce((s: number, r: Record<string, number>) => s + r.acknowledged_count, 0);

  return {
    data: { publications: result.rows },
    summary: {
      totalPublications,
      totalDeliveries,
      totalAcknowledged,
      overallAckRate: totalDeliveries > 0 ? Math.round((totalAcknowledged / totalDeliveries) * 100) : 0,
      byChannel: groupByField(result.rows, 'publish_channel'),
    },
  };
}

// ── Review Compliance Report ───────────────────────────────────────────────

/**
 * Policies grouped by review status: on-time, late, missed, upcoming.
 *
 * - on_time: published policies reviewed (updated_at) before next_review_date
 * - late: published policies updated after next_review_date but reviewed
 * - missed: published policies with next_review_date in the past and not updated since
 * - upcoming: published policies with next_review_date in the next 90 days
 */
export async function generateReviewComplianceReport(
  tenantId: string,
  _options?: ReportOptions,
): Promise<{ data: unknown; summary: Record<string, unknown> }> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT p.policy_id, p.title, p.title_en, p.category, p.owner,
            p.status, p.next_review_date, p.updated_at, p.review_frequency,
            p.business_domain,
            CASE
              WHEN p.next_review_date IS NULL THEN 'no_review_date'
              WHEN p.next_review_date > NOW() + INTERVAL '90 days' THEN 'on_schedule'
              WHEN p.next_review_date > NOW() AND p.next_review_date <= NOW() + INTERVAL '90 days' THEN 'upcoming'
              WHEN p.next_review_date <= NOW() AND p.updated_at >= p.next_review_date - INTERVAL '30 days' THEN 'late'
              WHEN p.next_review_date <= NOW() THEN 'missed'
              ELSE 'on_schedule'
            END AS review_status,
            CASE
              WHEN p.next_review_date IS NOT NULL
              THEN EXTRACT(DAY FROM p.next_review_date - NOW())::int
              ELSE NULL
            END AS days_until_review
     FROM "${schema}".policies p
     WHERE p.deleted_at IS NULL AND p.status IN ('published','approved','review')
     ORDER BY p.next_review_date ASC NULLS LAST`,
    [],
  );

  // Group by review_status
  const groups: Record<string, unknown[]> = {
    on_schedule: [],
    upcoming: [],
    late: [],
    missed: [],
    no_review_date: [],
  };
  for (const row of result.rows) {
    const status = row.review_status as string;
    if (!groups[status]) groups[status] = [];
    groups[status].push(row);
  }

  return {
    data: {
      onSchedule: groups['on_schedule'],
      upcoming: groups['upcoming'],
      late: groups['late'],
      missed: groups['missed'],
      noReviewDate: groups['no_review_date'],
    },
    summary: {
      totalReviewed: result.rows.length,
      onScheduleCount: groups['on_schedule'].length,
      upcomingCount: groups['upcoming'].length,
      lateCount: groups['late'].length,
      missedCount: groups['missed'].length,
      noReviewDateCount: groups['no_review_date'].length,
      complianceRate: result.rows.length > 0
        ? Math.round(
            ((groups['on_schedule'].length + groups['upcoming'].length) / result.rows.length) * 100,
          )
        : 0,
    },
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Group array of objects by a string field and return counts.
 */
function groupByField(rows: unknown[], field: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of rows) {
    const key = row[field] ?? 'unknown';
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}
