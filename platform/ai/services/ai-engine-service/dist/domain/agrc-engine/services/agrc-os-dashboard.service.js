// ============================================
// Shahin — AGRC-OS Dashboard Data Service (Product)
// Provides real data for all dashboard widgets.
// Uses tenant-scoped schema for all queries.
// NOTE: This is an AGRC product service residing
// in the platform directory. Law 2 ownership: agrc.
// ============================================
import { safeQuery, tenantSchema } from '../ports/database.port.js';
import { getFirstRow } from '@dos/db';
// ── Risk Heatmap Data ───────────────────────────────────────────────────────
export async function getRiskHeatmapData(tenantId) {
    const s = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT
       r.likelihood AS likelihood,
       r.impact AS impact,
       COUNT(*)::int AS count,
       ROUND(AVG(r.risk_score)::numeric, 2) AS weighted_score
     FROM "${s}".risks r
     WHERE r.status != 'closed'
     GROUP BY r.likelihood, r.impact
     ORDER BY r.likelihood, r.impact`);
    return result.rows.map(row => ({
        impact: parseInt(row.impact) || 0,
        likelihood: parseInt(row.likelihood) || 0,
        count: parseInt(row.count),
        weightedScore: parseFloat(row.weighted_score) || undefined
    }));
}
// ── Compliance Score Data ─────────────────────────────────────────────────────
export async function getComplianceScoreData(tenantId) {
    const s = tenantSchema(tenantId);
    // Control testing status breakdown
    const breakdownResult = await safeQuery(`SELECT
       COALESCE(test_status, 'not_tested') AS status,
       COUNT(*)::int AS count
     FROM "${s}".controls
     GROUP BY COALESCE(test_status, 'not_tested')`);
    const controlBreakdown = breakdownResult.rows.map(r => ({ status: r.status, count: parseInt(r.count) }));
    // Overall compliance score — weighted from control testing status
    const overallResult = await safeQuery(`SELECT
       ROUND(AVG(CASE WHEN c.test_status = 'effective' THEN 100
                  WHEN c.test_status = 'partially_effective' THEN 70
                  WHEN c.test_status = 'ineffective' THEN 30
                  WHEN c.test_status = 'not_tested' THEN 50
                  ELSE 50 END)::numeric, 2) AS overall_score,
       COUNT(*)::int AS total_controls,
       COUNT(*) FILTER (WHERE c.test_status = 'effective')::int AS effective_count
     FROM "${s}".controls c`);
    const overall = parseFloat(getFirstRow(overallResult)?.overall_score) || 0;
    // By framework — with control counts for drill-through
    const frameworkResult = await safeQuery(`SELECT
       f.framework_id,
       f.name AS framework_name,
       COUNT(c.control_id)::int AS control_count,
       COUNT(c.control_id) FILTER (WHERE c.test_status = 'effective')::int AS effective_count,
       ROUND(AVG(CASE WHEN c.test_status = 'effective' THEN 100
                  WHEN c.test_status = 'partially_effective' THEN 70
                  WHEN c.test_status = 'ineffective' THEN 30
                  WHEN c.test_status = 'not_tested' THEN 50
                  ELSE 50 END)::numeric, 2) AS score
     FROM "${s}".frameworks f
     LEFT JOIN "${s}".controls c ON c.framework_id = f.framework_id
     GROUP BY f.framework_id, f.name
     ORDER BY score DESC`);
    const byFramework = frameworkResult.rows.map(row => ({
        frameworkId: row.framework_id,
        frameworkName: row.framework_name,
        score: parseFloat(row.score) || 0,
        controlCount: parseInt(row.control_count) || 0,
        effectiveCount: parseInt(row.effective_count) || 0,
    }));
    // Trend — compute from kpi_snapshots if available, else empty
    const trendResult = await safeQuery(`SELECT
       snapshot_date::text AS date,
       ROUND(compliance_score::numeric, 2) AS score
     FROM "${s}".kpi_snapshots
     WHERE snapshot_date >= NOW() - INTERVAL '30 days'
     ORDER BY snapshot_date`);
    const trend = trendResult.rows.map(row => ({
        date: row.date,
        score: parseFloat(row.score) || 0
    }));
    return { overall, byFramework, trend, controlBreakdown };
}
// ── Maturity Radar Data ───────────────────────────────────────────────────────
export async function getMaturityRadarData(tenantId) {
    const s = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT
       maturity_domain AS name,
       ROUND(AVG(current_score)::numeric, 2) AS score,
       MAX(target_score) AS max_score,
       ROUND(AVG(target_score)::numeric, 2) AS target_score
     FROM "${s}".maturity_assessments
     WHERE assessment_date >= NOW() - INTERVAL '90 days'
     GROUP BY maturity_domain
     ORDER BY score DESC`);
    return result.rows.map(row => ({
        name: row.name,
        score: parseFloat(row.score) || 0,
        maxScore: parseInt(row.max_score) || 5,
        targetScore: parseFloat(row.target_score) || 3
    }));
}
// ── Findings Bar Data ────────────────────────────────────────────────────────
export async function getFindingsBarData(tenantId) {
    const s = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT
       COALESCE(af.category, 'Uncategorized') AS category,
       COUNT(*) FILTER (WHERE af.severity = 'critical')::int AS critical_count,
       COUNT(*) FILTER (WHERE af.severity = 'high')::int AS high_count,
       COUNT(*) FILTER (WHERE af.severity = 'medium')::int AS medium_count,
       COUNT(*) FILTER (WHERE af.severity = 'low')::int AS low_count
     FROM "${s}".audit_findings af
     WHERE af.status = 'open'
     GROUP BY COALESCE(af.category, 'Uncategorized')
     ORDER BY (COUNT(*) FILTER (WHERE af.severity = 'critical') * 4 +
               COUNT(*) FILTER (WHERE af.severity = 'high') * 3 +
               COUNT(*) FILTER (WHERE af.severity = 'medium') * 2 +
               COUNT(*) FILTER (WHERE af.severity = 'low')) DESC
     LIMIT 10`);
    return result.rows.map(row => ({
        category: row.category || 'Uncategorized',
        critical: parseInt(row.critical_count) || 0,
        high: parseInt(row.high_count) || 0,
        medium: parseInt(row.medium_count) || 0,
        low: parseInt(row.low_count) || 0
    }));
}
// ── Evidence Coverage Data (deep drill-through) ──────────────────────────────
export async function getEvidenceDonutData(tenantId) {
    const s = tenantSchema(tenantId);
    // Total controls and those with evidence tasks
    const controlsResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${s}".controls`);
    const totalControls = parseInt(getFirstRow(controlsResult)?.total) || 0;
    // Controls covered by evidence tasks
    const coveredResult = await safeQuery(`SELECT COUNT(DISTINCT et.control_id)::int AS covered
     FROM "${s}".evidence_tasks et
     WHERE et.control_id IS NOT NULL`);
    const coveredControls = parseInt(getFirstRow(coveredResult)?.covered) || 0;
    const coveragePercent = totalControls > 0 ? Math.round((coveredControls / totalControls) * 100) : 0;
    // Evidence task status breakdown
    const taskResult = await safeQuery(`SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
       COUNT(*) FILTER (WHERE status = 'completed' OR status = 'approved')::int AS completed,
       COUNT(*) FILTER (WHERE due_at < NOW() AND status NOT IN ('completed', 'approved'))::int AS overdue
     FROM "${s}".evidence_tasks`);
    const tr = getFirstRow(taskResult) || {};
    // Coverage by framework for drill-through
    const fwResult = await safeQuery(`SELECT
       SPLIT_PART(c.control_id, '::', 1) AS framework_code,
       COUNT(DISTINCT c.control_id)::int AS total,
       COUNT(DISTINCT et.control_id)::int AS covered
     FROM "${s}".controls c
     LEFT JOIN "${s}".evidence_tasks et ON et.control_id = c.control_id
     GROUP BY SPLIT_PART(c.control_id, '::', 1)
     ORDER BY framework_code`);
    const byFramework = fwResult.rows.map(r => ({
        frameworkCode: r.framework_code || 'Unknown',
        total: parseInt(r.total) || 0,
        covered: parseInt(r.covered) || 0,
        percent: parseInt(r.total) > 0 ? Math.round((parseInt(r.covered) / parseInt(r.total)) * 100) : 0,
    }));
    return {
        totalControls,
        coveredControls,
        coveragePercent,
        totalTasks: parseInt(tr.total) || 0,
        pendingTasks: parseInt(tr.pending) || 0,
        completedTasks: parseInt(tr.completed) || 0,
        overdueTasks: parseInt(tr.overdue) || 0,
        byFramework,
    };
}
// ── Vendor Bubble Data ───────────────────────────────────────────────────────
export async function getVendorBubbleData(tenantId) {
    const s = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT
       v.vendor_id,
       v.name AS vendor_name,
       COALESCE(v.risk_score, 0) AS risk_score,
       CASE
         WHEN COALESCE(v.risk_score, 0) >= 80 THEN 'critical'
         WHEN COALESCE(v.risk_score, 0) >= 60 THEN 'high'
         WHEN COALESCE(v.risk_score, 0) >= 40 THEN 'medium'
         ELSE 'low'
       END AS criticality
     FROM "${s}".vendors v
     WHERE v.status = 'active'
     ORDER BY v.risk_score DESC NULLS LAST
     LIMIT 20`);
    return result.rows.map(row => ({
        vendorId: row.vendor_id,
        vendorName: row.vendor_name,
        riskScore: parseFloat(row.risk_score) || 0,
        spend: 0,
        criticality: row.criticality || 'low',
        contractCount: 0,
    }));
}
// ── Top Risks Data (with drill-through details) ─────────────────────────────
export async function getTopRisksData(tenantId) {
    const s = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT
       r.risk_id,
       r.title,
       r.risk_score AS score,
       r.category,
       r.likelihood,
       r.impact,
       r.owner,
       r.updated_at AS last_updated,
       (SELECT COUNT(*)::int FROM "${s}".risk_treatments rt WHERE rt.risk_id = r.risk_id) AS treatments
     FROM "${s}".risks r
     WHERE r.status != 'closed'
     ORDER BY r.risk_score DESC NULLS LAST
     LIMIT 10`);
    return result.rows.map(row => ({
        riskId: row.risk_id,
        title: row.title,
        score: parseFloat(row.score) || 0,
        category: row.category || 'General',
        trend: 'stable',
        lastUpdated: row.last_updated,
        likelihood: parseInt(row.likelihood) || 0,
        impact: parseInt(row.impact) || 0,
        owner: row.owner || undefined,
        treatments: parseInt(row.treatments) || 0,
    }));
}
// ── Trend Line Data ───────────────────────────────────────────────────────────
export async function getTrendLineData(tenantId, days = 30) {
    const s = tenantSchema(tenantId);
    // Use kpi_snapshots for historical trends
    const result = await safeQuery(`SELECT
       snapshot_date::text AS date,
       compliance_score,
       risk_score,
       evidence_coverage
     FROM "${s}".kpi_snapshots
     WHERE snapshot_date >= NOW() - INTERVAL '${Math.min(days, 365)} days'
     ORDER BY snapshot_date`);
    return [
        {
            name: 'Compliance %',
            data: result.rows.map(row => ({ date: row.date, value: parseFloat(row.compliance_score) || 0 }))
        },
        {
            name: 'Risk Score',
            data: result.rows.map(row => ({ date: row.date, value: parseFloat(row.risk_score) || 0 }))
        },
        {
            name: 'Evidence Coverage',
            data: result.rows.map(row => ({ date: row.date, value: parseFloat(row.evidence_coverage) || 0 }))
        }
    ];
}
// ── Control Health Data (with framework drill-through) ─────────────────────
export async function getControlHealthData(tenantId) {
    const s = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE test_status = 'effective')::int AS effective,
       COUNT(*) FILTER (WHERE test_status = 'ineffective')::int AS ineffective,
       COUNT(*) FILTER (WHERE test_status IS NULL OR test_status = 'not_tested')::int AS not_tested,
       COUNT(*) FILTER (WHERE last_tested < NOW() - INTERVAL '180 days')::int AS stale
     FROM "${s}".controls`);
    // Framework-level drill-through
    const fwResult = await safeQuery(`SELECT
       SPLIT_PART(c.control_id, '::', 1) AS framework_id,
       COALESCE(f.name, SPLIT_PART(c.control_id, '::', 1)) AS framework_name,
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE c.test_status = 'effective')::int AS effective
     FROM "${s}".controls c
     LEFT JOIN "${s}".frameworks f ON f.framework_id = SPLIT_PART(c.control_id, '::', 1)
     GROUP BY SPLIT_PART(c.control_id, '::', 1), f.name
     ORDER BY total DESC`);
    const row = getFirstRow(result) || {};
    return {
        total: parseInt(row.total) || 0,
        effective: parseInt(row.effective) || 0,
        ineffective: parseInt(row.ineffective) || 0,
        notTested: parseInt(row.not_tested) || 0,
        stale: parseInt(row.stale) || 0,
        byFramework: fwResult.rows.map(r => ({
            frameworkId: r.framework_id,
            frameworkName: r.framework_name,
            total: parseInt(r.total) || 0,
            effective: parseInt(r.effective) || 0,
        })),
    };
}
// ── Incident Stats Data (with monthly trend drill-through) ──────────────────
export async function getIncidentStatsData(tenantId) {
    const s = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
       COUNT(*) FILTER (WHERE severity = 'high')::int AS high,
       COUNT(*) FILTER (WHERE severity = 'medium')::int AS medium,
       COUNT(*) FILTER (WHERE severity = 'low')::int AS low,
       COUNT(*) FILTER (WHERE status = 'open' OR status = 'in_progress')::int AS open_count,
       COUNT(*) FILTER (WHERE status = 'resolved' OR status = 'closed')::int AS resolved_count,
       COALESCE(EXTRACT(EPOCH FROM AVG(resolved_at - created_at) FILTER (WHERE resolved_at IS NOT NULL))/3600, 0) AS mttr
     FROM "${s}".incidents`);
    // Monthly trend for drill-through
    const monthlyResult = await safeQuery(`SELECT
       TO_CHAR(created_at, 'YYYY-MM') AS month,
       COUNT(*)::int AS count
     FROM "${s}".incidents
     WHERE created_at >= NOW() - INTERVAL '12 months'
     GROUP BY TO_CHAR(created_at, 'YYYY-MM')
     ORDER BY month`);
    const row = getFirstRow(result) || {};
    return {
        total: parseInt(row.total) || 0,
        critical: parseInt(row.critical) || 0,
        high: parseInt(row.high) || 0,
        medium: parseInt(row.medium) || 0,
        low: parseInt(row.low) || 0,
        mttr: parseFloat(row.mttr) || 0,
        open: parseInt(row.open_count) || 0,
        resolved: parseInt(row.resolved_count) || 0,
        byMonth: monthlyResult.rows.map(r => ({ month: r.month, count: parseInt(r.count) || 0 })),
    };
}
// ── Policy Compliance Data ───────────────────────────────────────────────────
export async function getPolicyComplianceData(tenantId) {
    const s = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE approval_status = 'approved')::int AS compliant,
       COUNT(*) FILTER (WHERE approval_status = 'rejected' OR approval_status = 'draft')::int AS non_compliant,
       COUNT(*) FILTER (WHERE approval_status = 'pending_review')::int AS pending,
       COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date < NOW())::int AS expired
     FROM "${s}".policies`);
    const row = getFirstRow(result) || {};
    return {
        total: parseInt(row.total) || 0,
        compliant: parseInt(row.compliant) || 0,
        nonCompliant: parseInt(row.non_compliant) || 0,
        pending: parseInt(row.pending) || 0,
        expired: parseInt(row.expired) || 0
    };
}
// ── System Overview Stats (comprehensive) ───────────────────────────────────
export async function getSystemOverviewStats(tenantId) {
    const s = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT
       (SELECT COUNT(*)::int FROM "${s}".frameworks) AS frameworks,
       (SELECT COUNT(*)::int FROM "${s}".controls) AS controls,
       (SELECT COUNT(*)::int FROM "${s}".risks WHERE status != 'closed') AS risks,
       (SELECT COUNT(*)::int FROM "${s}".policies) AS policies,
       (SELECT COUNT(*)::int FROM "${s}".vendors WHERE status = 'active') AS vendors,
       (SELECT COUNT(*)::int FROM "${s}".evidence_tasks) AS evidence_tasks,
       (SELECT COUNT(*)::int FROM "${s}".incidents WHERE created_at >= NOW() - INTERVAL '30 days') AS incidents_30d,
       (SELECT COUNT(*)::int FROM "${s}".audit_findings WHERE status = 'open') AS open_findings,
       (SELECT COUNT(*)::int FROM "${s}".workflows WHERE status = 'active') AS active_workflows,
       (SELECT COUNT(*)::int FROM "${s}".team_members) AS team_members`);
    const row = getFirstRow(result) || {};
    return {
        frameworks: parseInt(row.frameworks) || 0,
        controls: parseInt(row.controls) || 0,
        risks: parseInt(row.risks) || 0,
        policies: parseInt(row.policies) || 0,
        vendors: parseInt(row.vendors) || 0,
        evidenceTasks: parseInt(row.evidence_tasks) || 0,
        incidents30d: parseInt(row.incidents_30d) || 0,
        openFindings: parseInt(row.open_findings) || 0,
        activeWorkflows: parseInt(row.active_workflows) || 0,
        teamMembers: parseInt(row.team_members) || 0,
    };
}
//# sourceMappingURL=agrc-os-dashboard.service.js.map