// ============================================
// Shahin — Engagement Analytics Service
// Aggregates engagement metrics for the
// analytics dashboard: vendor scores, questionnaire
// stats, regulator requests, consultant portfolio,
// and SLA breach trends.
//
// Requirements: 19.1, 19.2, 19.3, 19.4
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import type {
  VendorScoreSummary,
  QuestionnaireStats,
  RegulatorRequestSummary,
  PortfolioMetrics,
  SLABreachTrend,
} from '@dos/types';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ── Vendor Scores ──────────────────────────────────────────────────────────

/**
 * Returns vendor objects with vendor_id, name, current score,
 * score trend (last 5 data points), and risk tier.
 *
 * Requirement 19.2
 */
export async function getVendorScores(tenantId: string): Promise<VendorScoreSummary[]> {
  const schema = tenantSchema(tenantId);

  try {
    // Get all vendors with their latest engagement score
    const vendorResult = await safeQuery(
      `SELECT v.vendor_id, v.name, v.risk_tier,
              s.total_score AS current_score
       FROM "${schema}".vendors v
       LEFT JOIN LATERAL (
         SELECT total_score
         FROM "${schema}".vendor_engagement_scores
         WHERE vendor_id = v.vendor_id
         ORDER BY computed_at DESC
         LIMIT 1
       ) s ON true
       WHERE v.status IS NULL OR v.status != 'inactive'
       ORDER BY v.name`,
    );

    const summaries: VendorScoreSummary[] = [];

    for (const row of vendorResult.rows) {
      // Fetch last 5 score data points for trend
      const trendResult = await safeQuery(
        `SELECT total_score
         FROM "${schema}".vendor_engagement_scores
         WHERE vendor_id = $1
         ORDER BY computed_at DESC
         LIMIT 5`,
        [row.vendor_id],
      );

      // Reverse so oldest is first (chronological order)
      const scoreTrend = trendResult.rows
        .map((r: GenericRow) => Number(r.total_score))
        .reverse();

      summaries.push({
        vendorId: row.vendor_id,
        name: row.name ?? '',
        currentScore: row.current_score != null ? Number(row.current_score) : 0,
        scoreTrend,
        riskTier: row.risk_tier ?? 'any',
      });
    }

    return summaries;
  } catch {
    return [];
  }
}

// ── Questionnaire Stats ────────────────────────────────────────────────────

/**
 * Returns counts grouped by status + average completion time.
 *
 * Requirement 19.3
 */
export async function getQuestionnaireStats(tenantId: string): Promise<QuestionnaireStats> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'draft') AS draft,
         COUNT(*) FILTER (WHERE status = 'distributed') AS distributed,
         COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed,
         COUNT(*) FILTER (WHERE status = 'overdue') AS overdue,
         AVG(
           CASE WHEN completed_at IS NOT NULL AND created_at IS NOT NULL
             THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400
             ELSE NULL
           END
         ) AS avg_completion_days
       FROM "${schema}".questionnaires`,
    );

    const row = getFirstRow(result) ?? {};

    return {
      draft: Number(row.draft ?? 0),
      distributed: Number(row.distributed ?? 0),
      inProgress: Number(row.in_progress ?? 0),
      completed: Number(row.completed ?? 0),
      overdue: Number(row.overdue ?? 0),
      averageCompletionDays: row.avg_completion_days != null
        ? Math.round(Number(row.avg_completion_days) * 10) / 10
        : 0,
    };
  } catch {
    return {
      draft: 0,
      distributed: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      averageCompletionDays: 0,
    };
  }
}

// ── Regulator Requests ─────────────────────────────────────────────────────

/**
 * Returns request summary by status and average response time.
 *
 * Requirement 19.1
 */
export async function getRegulatorRequests(tenantId: string): Promise<RegulatorRequestSummary> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending') AS pending,
         COUNT(*) FILTER (WHERE status = 'responded') AS responded,
         COUNT(*) FILTER (WHERE status = 'closed') AS closed,
         AVG(
           CASE WHEN responded_at IS NOT NULL AND created_at IS NOT NULL
             THEN EXTRACT(EPOCH FROM (responded_at - created_at)) / 86400
             ELSE NULL
           END
         ) AS avg_response_days
       FROM "${schema}".regulator_requests`,
    );

    const row = getFirstRow(result) ?? {};

    return {
      pending: Number(row.pending ?? 0),
      responded: Number(row.responded ?? 0),
      closed: Number(row.closed ?? 0),
      averageResponseDays: row.avg_response_days != null
        ? Math.round(Number(row.avg_response_days) * 10) / 10
        : 0,
    };
  } catch {
    return { pending: 0, responded: 0, closed: 0, averageResponseDays: 0 };
  }
}

// ── Consultant Portfolio ───────────────────────────────────────────────────

/**
 * Returns portfolio health metrics for a consultant.
 * Aggregates compliance scores, engagement scores, and findings
 * across all assigned clients.
 *
 * Requirement 19.1
 */
export async function getConsultantPortfolio(consultantId: string): Promise<PortfolioMetrics> {
  try {
    // Get assigned clients from master schema
    const assignResult = await safeQuery(
      `SELECT tenant_id FROM consultant_assignments WHERE consultant_id = $1`,
      [consultantId],
    );

    const tenantIds: string[] = assignResult.rows.map((r: GenericRow) => r.tenant_id);

    if (tenantIds.length === 0) {
      return {
        clientCount: 0,
        averageComplianceScore: 0,
        averageEngagementScore: 0,
        openFindings: 0,
        criticalFindings: 0,
      };
    }

    let totalCompliance = 0;
    let totalEngagement = 0;
    let openFindings = 0;
    let criticalFindings = 0;
    let validClients = 0;

    for (const tid of tenantIds) {
      try {
        const schema = tenantSchema(tid);

        // Average engagement score for this tenant's vendors
        const scoreResult = await safeQuery(
          `SELECT AVG(total_score) AS avg_score
           FROM (
             SELECT DISTINCT ON (vendor_id) total_score
             FROM "${schema}".vendor_engagement_scores
             ORDER BY vendor_id, computed_at DESC
           ) latest`,
        );
        const avgEngagement = Number(getFirstRow(scoreResult)?.avg_score ?? 0);

        // Compliance score approximation from vendors
        const compResult = await safeQuery(
          `SELECT AVG(assessment_score) AS avg_compliance
           FROM "${schema}".vendors
           WHERE status IS NULL OR status != 'inactive'`,
        );
        const avgCompliance = Number(getFirstRow(compResult)?.avg_compliance ?? 0);

        // Findings counts
        const findResult = await safeQuery(
          `SELECT
             COUNT(*) FILTER (WHERE status = 'open') AS open_count,
             COUNT(*) FILTER (WHERE status = 'open' AND severity = 'critical') AS critical_count
           FROM "${schema}".findings`,
        );

        totalCompliance += avgCompliance;
        totalEngagement += avgEngagement;
        openFindings += Number(getFirstRow(findResult)?.open_count ?? 0);
        criticalFindings += Number(getFirstRow(findResult)?.critical_count ?? 0);
        validClients++;
      } catch {
        // Skip tenant on error
      }
    }

    return {
      clientCount: tenantIds.length,
      averageComplianceScore: validClients > 0
        ? Math.round(totalCompliance / validClients)
        : 0,
      averageEngagementScore: validClients > 0
        ? Math.round(totalEngagement / validClients)
        : 0,
      openFindings,
      criticalFindings,
    };
  } catch {
    return {
      clientCount: 0,
      averageComplianceScore: 0,
      averageEngagementScore: 0,
      openFindings: 0,
      criticalFindings: 0,
    };
  }
}

// ── SLA Breaches ───────────────────────────────────────────────────────────

/**
 * Returns breach counts grouped by time period (daily for last 30 days)
 * and by vendor risk tier.
 *
 * SLA breaches are tracked via high-priority tasks created by the
 * vendor-compliance-sync service with title starting with "SLA breach:".
 *
 * Requirement 19.4
 */
export async function getSLABreaches(tenantId: string): Promise<SLABreachTrend> {
  const schema = tenantSchema(tenantId);

  try {
    // Daily breach counts for the last 30 days
    const dailyResult = await safeQuery(
      `SELECT
         DATE(created_at) AS breach_date,
         COUNT(*) AS breach_count
       FROM "${schema}".tasks
       WHERE title LIKE 'SLA breach:%'
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY breach_date`,
    );

    // Fill in missing days with 0
    const daily: Array<{ date: string; count: number }> = [];
    const now = new Date();
    const dayMap = new Map<string, number>();
    for (const row of dailyResult.rows) {
      const dateStr = row.breach_date instanceof Date
        ? row.breach_date.toISOString().slice(0, 10)
        : String(row.breach_date).slice(0, 10);
      dayMap.set(dateStr, Number(row.breach_count));
    }

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      daily.push({ date: dateStr, count: dayMap.get(dateStr) ?? 0 });
    }

    // Breach counts by vendor risk tier
    const tierResult = await safeQuery(
      `SELECT v.risk_tier, COUNT(*) AS breach_count
       FROM "${schema}".tasks t
       JOIN "${schema}".vendors v ON v.vendor_id::text = t.entity_id::text
       WHERE t.title LIKE 'SLA breach:%'
         AND t.entity_type = 'vendor'
         AND t.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY v.risk_tier`,
    );

    const byRiskTier: Record<string, number> = {};
    for (const row of tierResult.rows) {
      byRiskTier[row.risk_tier ?? 'any'] = Number(row.breach_count);
    }

    return { daily, byRiskTier };
  } catch {
    // Return empty structure on failure
    const daily: Array<{ date: string; count: number }> = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      daily.push({ date: d.toISOString().slice(0, 10), count: 0 });
    }
    return { daily, byRiskTier: {} };
  }
}

export async function getOnboardingFunnel(tenantId: string, window: { startIso: string; endIso: string }): Promise<{
  window: { start: string; end: string };
  totals: { sessions: number; completed: number; completionRate: number; avgMinutesToComplete: number };
  byVariant: Array<{ variant: string; sessions: number; completed: number; completionRate: number }>;
  stageTransitions: Array<{ from: string; to: string; count: number }>;
}> {
  const start = window.startIso;
  const end = window.endIso;

  const sessionsRes = await safeQuery(
    `SELECT
       COUNT(*) AS sessions,
       COUNT(*) FILTER (
         WHERE completed_at IS NOT NULL OR status IN ('approved_for_provisioning', 'provisioning', 'provisioned', 'active')
       ) AS completed,
       AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60.0) AS avg_minutes
     FROM public.onboarding_sessions
     WHERE tenant_id = $1
       AND created_at >= $2::timestamptz
       AND created_at <  $3::timestamptz`,
    [tenantId, start, end],
  ).catch(() => ({ rows: [] as any[] }));

  const row = (sessionsRes.rows[0] as any) ?? {};
  const sessions = Number(row.sessions ?? 0);
  const completed = Number(row.completed ?? 0);
  const completionRate = sessions > 0 ? Math.round((completed / sessions) * 10000) / 100 : 0;
  const avgMinutesToComplete = row.avg_minutes != null ? Math.round(Number(row.avg_minutes) * 10) / 10 : 0;

  const byVariantRes = await safeQuery(
    `WITH ab AS (
       SELECT
         entity_id AS session_id,
         MAX(COALESCE(after_state->'properties'->'ab'->>'onb_help_v1', 'unknown')) AS variant
       FROM public.audit_trail
       WHERE tenant_id = $1
         AND module = 'onboarding'
         AND action = 'ui_event'
         AND after_state->>'name' = 'onboarding.ab.assigned'
         AND created_at >= $2::timestamptz
         AND created_at <  $3::timestamptz
       GROUP BY entity_id
     )
     SELECT
       ab.variant AS variant,
       COUNT(*) AS sessions,
       COUNT(*) FILTER (
         WHERE s.completed_at IS NOT NULL OR s.status IN ('approved_for_provisioning', 'provisioning', 'provisioned', 'active')
       ) AS completed
     FROM ab
     JOIN public.onboarding_sessions s ON s.id = ab.session_id
     WHERE s.tenant_id = $1
       AND s.created_at >= $2::timestamptz
       AND s.created_at <  $3::timestamptz
     GROUP BY ab.variant
     ORDER BY ab.variant`,
    [tenantId, start, end],
  ).catch(() => ({ rows: [] as any[] }));

  const byVariant = (byVariantRes.rows as any[]).map((r) => {
    const vSessions = Number(r.sessions ?? 0);
    const vCompleted = Number(r.completed ?? 0);
    return {
      variant: String(r.variant ?? 'unknown'),
      sessions: vSessions,
      completed: vCompleted,
      completionRate: vSessions > 0 ? Math.round((vCompleted / vSessions) * 10000) / 100 : 0,
    };
  });

  const transitionsRes = await safeQuery(
    `SELECT
       COALESCE(after_state->>'from', 'unknown') AS stage_from,
       COALESCE(after_state->>'to', 'unknown')   AS stage_to,
       COUNT(*) AS count
     FROM public.audit_trail
     WHERE tenant_id = $1
       AND module = 'onboarding'
       AND action = 'stage_transitioned'
       AND created_at >= $2::timestamptz
       AND created_at <  $3::timestamptz
     GROUP BY 1,2
     ORDER BY count DESC`,
    [tenantId, start, end],
  ).catch(() => ({ rows: [] as any[] }));

  const stageTransitions = (transitionsRes.rows as any[]).map((r) => ({
    from: String(r.stage_from ?? 'unknown'),
    to: String(r.stage_to ?? 'unknown'),
    count: Number(r.count ?? 0),
  }));

  return {
    window: { start, end },
    totals: { sessions, completed, completionRate, avgMinutesToComplete },
    byVariant,
    stageTransitions,
  };
}
