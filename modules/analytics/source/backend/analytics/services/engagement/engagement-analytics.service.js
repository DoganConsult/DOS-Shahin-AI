"use strict";
// ============================================
// Shahin — Engagement Analytics Service
// Aggregates engagement metrics for the
// analytics dashboard: vendor scores, questionnaire
// stats, regulator requests, consultant portfolio,
// and SLA breach trends.
//
// Requirements: 19.1, 19.2, 19.3, 19.4
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVendorScores = getVendorScores;
exports.getQuestionnaireStats = getQuestionnaireStats;
exports.getRegulatorRequests = getRegulatorRequests;
exports.getConsultantPortfolio = getConsultantPortfolio;
exports.getSLABreaches = getSLABreaches;
const database_port_1 = require("../../ports/database.port");
const db_1 = require("@dos/db");
// ── Vendor Scores ──────────────────────────────────────────────────────────
/**
 * Returns vendor objects with vendor_id, name, current score,
 * score trend (last 5 data points), and risk tier.
 *
 * Requirement 19.2
 */
async function getVendorScores(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        // Get all vendors with their latest engagement score
        const vendorResult = await (0, database_port_1.safeQuery)(`SELECT v.vendor_id, v.name, v.risk_tier,
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
       ORDER BY v.name`);
        const summaries = [];
        for (const row of vendorResult.rows) {
            // Fetch last 5 score data points for trend
            const trendResult = await (0, database_port_1.safeQuery)(`SELECT total_score
         FROM "${schema}".vendor_engagement_scores
         WHERE vendor_id = $1
         ORDER BY computed_at DESC
         LIMIT 5`, [row.vendor_id]);
            // Reverse so oldest is first (chronological order)
            const scoreTrend = trendResult.rows
                .map((r) => Number(r.total_score))
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
    }
    catch {
        return [];
    }
}
// ── Questionnaire Stats ────────────────────────────────────────────────────
/**
 * Returns counts grouped by status + average completion time.
 *
 * Requirement 19.3
 */
async function getQuestionnaireStats(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const result = await (0, database_port_1.safeQuery)(`SELECT
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
       FROM "${schema}".questionnaires`);
        const row = (0, db_1.getFirstRow)(result) ?? {};
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
    }
    catch {
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
async function getRegulatorRequests(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const result = await (0, database_port_1.safeQuery)(`SELECT
         COUNT(*) FILTER (WHERE status = 'pending') AS pending,
         COUNT(*) FILTER (WHERE status = 'responded') AS responded,
         COUNT(*) FILTER (WHERE status = 'closed') AS closed,
         AVG(
           CASE WHEN responded_at IS NOT NULL AND created_at IS NOT NULL
             THEN EXTRACT(EPOCH FROM (responded_at - created_at)) / 86400
             ELSE NULL
           END
         ) AS avg_response_days
       FROM "${schema}".regulator_requests`);
        const row = (0, db_1.getFirstRow)(result) ?? {};
        return {
            pending: Number(row.pending ?? 0),
            responded: Number(row.responded ?? 0),
            closed: Number(row.closed ?? 0),
            averageResponseDays: row.avg_response_days != null
                ? Math.round(Number(row.avg_response_days) * 10) / 10
                : 0,
        };
    }
    catch {
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
async function getConsultantPortfolio(consultantId) {
    try {
        // Get assigned clients from master schema
        const assignResult = await (0, database_port_1.safeQuery)(`SELECT tenant_id FROM consultant_assignments WHERE consultant_id = $1`, [consultantId]);
        const tenantIds = assignResult.rows.map((r) => r.tenant_id);
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
                const schema = (0, database_port_1.tenantSchema)(tid);
                // Average engagement score for this tenant's vendors
                const scoreResult = await (0, database_port_1.safeQuery)(`SELECT AVG(total_score) AS avg_score
           FROM (
             SELECT DISTINCT ON (vendor_id) total_score
             FROM "${schema}".vendor_engagement_scores
             ORDER BY vendor_id, computed_at DESC
           ) latest`);
                const avgEngagement = Number((0, db_1.getFirstRow)(scoreResult)?.avg_score ?? 0);
                // Compliance score approximation from vendors
                const compResult = await (0, database_port_1.safeQuery)(`SELECT AVG(assessment_score) AS avg_compliance
           FROM "${schema}".vendors
           WHERE status IS NULL OR status != 'inactive'`);
                const avgCompliance = Number((0, db_1.getFirstRow)(compResult)?.avg_compliance ?? 0);
                // Findings counts
                const findResult = await (0, database_port_1.safeQuery)(`SELECT
             COUNT(*) FILTER (WHERE status = 'open') AS open_count,
             COUNT(*) FILTER (WHERE status = 'open' AND severity = 'critical') AS critical_count
           FROM "${schema}".findings`);
                totalCompliance += avgCompliance;
                totalEngagement += avgEngagement;
                openFindings += Number((0, db_1.getFirstRow)(findResult)?.open_count ?? 0);
                criticalFindings += Number((0, db_1.getFirstRow)(findResult)?.critical_count ?? 0);
                validClients++;
            }
            catch {
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
    }
    catch {
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
async function getSLABreaches(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        // Daily breach counts for the last 30 days
        const dailyResult = await (0, database_port_1.safeQuery)(`SELECT
         DATE(created_at) AS breach_date,
         COUNT(*) AS breach_count
       FROM "${schema}".tasks
       WHERE title LIKE 'SLA breach:%'
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY breach_date`);
        // Fill in missing days with 0
        const daily = [];
        const now = new Date();
        const dayMap = new Map();
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
        const tierResult = await (0, database_port_1.safeQuery)(`SELECT v.risk_tier, COUNT(*) AS breach_count
       FROM "${schema}".tasks t
       JOIN "${schema}".vendors v ON v.vendor_id::text = t.entity_id::text
       WHERE t.title LIKE 'SLA breach:%'
         AND t.entity_type = 'vendor'
         AND t.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY v.risk_tier`);
        const byRiskTier = {};
        for (const row of tierResult.rows) {
            byRiskTier[row.risk_tier ?? 'any'] = Number(row.breach_count);
        }
        return { daily, byRiskTier };
    }
    catch {
        // Return empty structure on failure
        const daily = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            daily.push({ date: d.toISOString().slice(0, 10), count: 0 });
        }
        return { daily, byRiskTier: {} };
    }
}
//# sourceMappingURL=engagement-analytics.service.js.map