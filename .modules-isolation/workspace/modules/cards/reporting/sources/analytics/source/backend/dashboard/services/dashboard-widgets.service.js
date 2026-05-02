"use strict";
// ============================================
// Shahin — Dashboard Widget Data Services
// Premium Dashboard Overhaul — Task 8
// Backend endpoints for 7 new widget types
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.bucketExceptionsByAge = bucketExceptionsByAge;
exports.getExceptionsAging = getExceptionsAging;
exports.detectControlDrift = detectControlDrift;
exports.getControlDrift = getControlDrift;
exports.sortEvidenceQueue = sortEvidenceQueue;
exports.getEvidenceQueue = getEvidenceQueue;
exports.computeAuditPackProgress = computeAuditPackProgress;
exports.getAuditPackStatus = getAuditPackStatus;
exports.predictRiskTrend = predictRiskTrend;
exports.getRiskPrediction = getRiskPrediction;
exports.buildAISummary = buildAISummary;
exports.getIncidentDashboardWidget = getIncidentDashboardWidget;
exports.getBcpDashboardWidget = getBcpDashboardWidget;
exports.getVendorDashboardWidget = getVendorDashboardWidget;
exports.getTrainingDashboardWidget = getTrainingDashboardWidget;
exports.getAISummary = getAISummary;
exports.getRemediationDashboardWidget = getRemediationDashboardWidget;
exports.getActionDashboardWidget = getActionDashboardWidget;
exports.getWorkflowDashboardWidget = getWorkflowDashboardWidget;
exports.getAssetDashboardWidget = getAssetDashboardWidget;
exports.getIntegrationsDashboardWidget = getIntegrationsDashboardWidget;
exports.getAdminDashboardWidget = getAdminDashboardWidget;
const database_port_1 = require("../ports/database.port");
const ai_gateway_service_1 = require("../../ai/services/gateway/ai-gateway.service");
const db_1 = require("@dos/db");
/**
 * Bucket exceptions by age into 4 categories.
 * Pure function — testable without DB.
 * Requirements: 11.1
 */
function bucketExceptionsByAge(items, now = new Date()) {
    const buckets = [
        { label: '0-30', minDays: 0, maxDays: 30, count: 0 },
        { label: '31-60', minDays: 31, maxDays: 60, count: 0 },
        { label: '61-90', minDays: 61, maxDays: 90, count: 0 },
        { label: '90+', minDays: 91, maxDays: Infinity, count: 0 },
    ];
    for (const item of items) {
        const age = Math.floor((now.getTime() - new Date(item.created_at).getTime()) / 86400000);
        const bucket = buckets.find(b => age >= b.minDays && age <= b.maxDays);
        if (bucket)
            bucket.count++;
    }
    return buckets;
}
async function getExceptionsAging(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`SELECT created_at FROM "${schema}".exceptions WHERE status = 'open' OR status = 'pending'`);
        return bucketExceptionsByAge(res.rows);
    }
    catch {
        return bucketExceptionsByAge([]);
    }
}
/**
 * Detect controls that have drifted from their baseline.
 * Pure function — testable without DB.
 * Requirements: 12.1, 12.2
 */
function detectControlDrift(controls, now = new Date()) {
    return controls
        .filter(c => c.baseline_status && c.status !== c.baseline_status)
        .map(c => ({
        controlId: c.control_id,
        title: c.title,
        baselineStatus: c.baseline_status,
        currentStatus: c.status,
        daysSinceDrift: c.last_status_change
            ? Math.floor((now.getTime() - new Date(c.last_status_change).getTime()) / 86400000)
            : 0,
    }));
}
async function getControlDrift(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`SELECT control_id, title, status, baseline_status, last_status_change FROM "${schema}".controls WHERE baseline_status IS NOT NULL`);
        return detectControlDrift(res.rows);
    }
    catch {
        return [];
    }
}
/**
 * Sort evidence queue: overdue first, then by upcoming due date.
 * Pure function — testable without DB.
 * Requirements: 13.2
 */
function sortEvidenceQueue(items, now = new Date()) {
    return items
        .map(item => {
        const due = new Date(item.due_date);
        const daysUntilDue = Math.floor((due.getTime() - now.getTime()) / 86400000);
        return {
            evidenceId: item.evidence_id,
            title: item.title,
            dueDate: item.due_date,
            isOverdue: daysUntilDue < 0,
            daysUntilDue,
        };
    })
        .sort((a, b) => {
        // Overdue first
        if (a.isOverdue && !b.isOverdue)
            return -1;
        if (!a.isOverdue && b.isOverdue)
            return 1;
        // Then by days until due (ascending)
        return a.daysUntilDue - b.daysUntilDue;
    });
}
async function getEvidenceQueue(tenantId, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        // Parameterize userId as $1 to prevent SQL injection. Fragment
        // template contains only $-placeholders + the quoted-identifier
        // "${schema}" — all interpolations are static or pre-validated.
        const whereClause = userId ? 'AND assigned_to = $1' : '';
        const params = userId ? [userId] : [];
        const res = await (0, database_port_1.safeQuery)(`SELECT evidence_id, title, due_date, assigned_to FROM "${schema}".evidence WHERE status = 'pending' ${whereClause} ORDER BY due_date`, params);
        return sortEvidenceQueue(res.rows);
    }
    catch {
        return [];
    }
}
/**
 * Compute audit pack progress per assessment.
 * Pure function — testable without DB.
 * Requirements: 14.1
 */
function computeAuditPackProgress(assessments) {
    return assessments.map(a => {
        const total = a.items.length;
        const completed = a.items.filter(i => i.status === 'completed' || i.status === 'approved').length;
        const outstanding = a.items.filter(i => i.status !== 'completed' && i.status !== 'approved').map(i => i.title);
        return {
            assessmentId: a.assessment_id,
            assessmentName: a.name,
            totalItems: total,
            completedItems: completed,
            progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
            outstandingItems: outstanding,
        };
    });
}
async function getAuditPackStatus(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`SELECT assessment_id, name FROM "${schema}".assessments WHERE status = 'active'`);
        const packs = [];
        for (const row of res.rows) {
            const items = await (0, database_port_1.safeQuery)(`SELECT title, status FROM "${schema}".assessment_items WHERE assessment_id = $1`, [row.assessment_id]);
            packs.push(...computeAuditPackProgress([{ assessment_id: row.assessment_id, name: row.name, items: items.rows }]));
        }
        return packs;
    }
    catch {
        return [];
    }
}
/**
 * Simple linear regression for risk prediction.
 * Pure function — testable without DB.
 * Requirements: 15.1, 15.2
 */
function predictRiskTrend(snapshots) {
    if (snapshots.length < 2) {
        return {
            historical: snapshots.map(s => ({ date: s.snapshot_date, score: s.risk_score })),
            projected: [],
            insufficientData: true,
        };
    }
    const historical = snapshots.map(s => ({ date: s.snapshot_date, score: s.risk_score }));
    // Linear regression
    const n = snapshots.length;
    const xs = snapshots.map((_, i) => i);
    const ys = snapshots.map(s => s.risk_score);
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const sumX2 = xs.reduce((a, x) => a + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    // Project 30 days (4 weekly points)
    const lastDate = new Date(snapshots[snapshots.length - 1].snapshot_date);
    const projected = [];
    for (let w = 1; w <= 4; w++) {
        const projDate = new Date(lastDate);
        projDate.setDate(projDate.getDate() + w * 7);
        const projScore = Math.max(0, Math.min(100, Math.round((intercept + slope * (n - 1 + w)) * 100) / 100));
        projected.push({ date: projDate.toISOString().split('T')[0], score: projScore });
    }
    return { historical, projected, insufficientData: false };
}
async function getRiskPrediction(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`SELECT snapshot_date, risk_score FROM "${schema}".kpi_snapshots ORDER BY snapshot_date ASC LIMIT 52`);
        return predictRiskTrend(res.rows);
    }
    catch {
        return { historical: [], projected: [], insufficientData: true };
    }
}
/**
 * Build AI summary structure from KPI data.
 * Pure function — testable without DB.
 * Requirements: 10.1, 10.4
 */
function buildAISummary(kpis) {
    const priorities = [];
    const weeklyChanges = [];
    const actions = [];
    const cs = kpis.compliance_score ?? 0;
    const rs = kpis.risk_score ?? 0;
    const ec = kpis.evidence_coverage ?? 0;
    const openRisks = kpis.open_risks ?? 0;
    const expiredEvidence = kpis.expired_evidence ?? 0;
    const untreatedRisks = kpis.untreated_risks ?? 0;
    if (cs < 70) {
        priorities.push({ en: 'Compliance score below target (70%)', ar: 'نسبة الامتثال أقل من الهدف (70%)' });
        actions.push({ en: 'Review and remediate non-compliant controls', ar: 'مراجعة ومعالجة الضوابط غير الممتثلة' });
    }
    if (rs > 15) {
        priorities.push({ en: 'Elevated risk score requires attention', ar: 'درجة المخاطر المرتفعة تتطلب اهتماماً' });
        actions.push({ en: 'Prioritize high-risk mitigation plans', ar: 'إعطاء الأولوية لخطط تخفيف المخاطر العالية' });
    }
    if (ec < 80) {
        priorities.push({ en: 'Evidence coverage gaps detected', ar: 'تم اكتشاف فجوات في تغطية الأدلة' });
        actions.push({ en: 'Upload missing evidence for upcoming audit', ar: 'رفع الأدلة المفقودة للتدقيق القادم' });
    }
    if (openRisks > 5) {
        priorities.push({ en: `${openRisks} high-severity risks remain open`, ar: `${openRisks} مخاطر عالية الخطورة لا تزال مفتوحة` });
        actions.push({ en: 'Escalate unresolved high risks to leadership', ar: 'تصعيد المخاطر العالية غير المحلولة للإدارة' });
    }
    if (expiredEvidence > 0) {
        priorities.push({ en: `${expiredEvidence} evidence items have expired`, ar: `${expiredEvidence} عنصر أدلة منتهي الصلاحية` });
        actions.push({ en: 'Renew expired evidence to maintain audit readiness', ar: 'تجديد الأدلة المنتهية للحفاظ على جاهزية التدقيق' });
    }
    if (untreatedRisks > 3) {
        actions.push({ en: `${untreatedRisks} risks lack treatment plans — assign owners`, ar: `${untreatedRisks} مخاطر بدون خطط معالجة — عيّن مسؤولين` });
    }
    weeklyChanges.push({ en: `Compliance: ${cs}%, Risk: ${rs}, Evidence: ${ec}%`, ar: `الامتثال: ${cs}%، المخاطر: ${rs}، الأدلة: ${ec}%` });
    if (priorities.length === 0) {
        priorities.push({ en: 'All KPIs within acceptable range', ar: 'جميع مؤشرات الأداء ضمن النطاق المقبول' });
    }
    return {
        priorities,
        weeklyChanges,
        recommendedActions: actions,
        generatedAt: new Date().toISOString(),
    };
}
async function getIncidentDashboardWidget(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const summary = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".v_incident_dashboard_summary`);
        const nearMiss = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".near_miss_reports WHERE status = 'reported' AND deleted_at IS NULL`);
        const pirs = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status IN ('in_progress','scheduled'))::int AS active FROM "${schema}".incident_pir WHERE deleted_at IS NULL`);
        return { ...(0, db_1.getFirstRow)(summary), nearMissOpen: (0, db_1.getFirstRow)(nearMiss)?.cnt || 0, pirTotal: (0, db_1.getFirstRow)(pirs)?.total || 0, pirActive: (0, db_1.getFirstRow)(pirs)?.active || 0 };
    }
    catch {
        return { total_incidents: 0, open_count: 0, nearMissOpen: 0, pirTotal: 0, pirActive: 0 };
    }
}
async function getBcpDashboardWidget(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const summary = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".v_bcp_dashboard_summary`);
        const activations = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS active FROM "${schema}".bcp_activations WHERE status = 'active'`);
        return { ...(0, db_1.getFirstRow)(summary), activeActivations: (0, db_1.getFirstRow)(activations)?.active || 0 };
    }
    catch {
        return { total_plans: 0, approved_count: 0, total_bias: 0, total_exercises: 0, activeActivations: 0 };
    }
}
async function getVendorDashboardWidget(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const summary = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".v_vendor_dashboard_summary`);
        const fourthParty = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".vendor_fourth_party_risk WHERE monitoring_status = 'active'`);
        return { ...(0, db_1.getFirstRow)(summary), fourthPartyCount: (0, db_1.getFirstRow)(fourthParty)?.cnt || 0 };
    }
    catch {
        return { total_vendors: 0, active_count: 0, high_risk_count: 0, open_sla_breaches: 0, fourthPartyCount: 0 };
    }
}
async function getTrainingDashboardWidget(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const summary = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".v_training_dashboard_summary`);
        return (0, db_1.getFirstRow)(summary) || { total_campaigns: 0, active_campaigns: 0, completed_assignments: 0, overdue_assignments: 0, active_certifications: 0 };
    }
    catch {
        return { total_campaigns: 0, active_campaigns: 0, completed_assignments: 0, overdue_assignments: 0, active_certifications: 0 };
    }
}
async function getAISummary(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        // Fetch comprehensive KPI data for AI analysis
        const [kpiRes, riskRes, controlRes, incidentRes, evidenceRes] = await Promise.all([
            (0, database_port_1.safeQuery)(`SELECT compliance_score, risk_score, evidence_coverage FROM "${schema}".kpi_snapshots ORDER BY snapshot_date DESC LIMIT 2`),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE risk_score >= 12 AND status = 'open') as high_open, COUNT(*) FILTER (WHERE treatment_status IS NULL OR treatment_status = 'none') as untreated FROM "${schema}".risks`),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'implemented') as implemented, COUNT(*) FILTER (WHERE test_status = 'passed') as tested FROM "${schema}".controls`),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*) FILTER (WHERE status = 'open') as open, COUNT(*) FILTER (WHERE severity IN ('critical', 'high') AND status = 'open') as critical_open FROM "${schema}".incidents`),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*) FILTER (WHERE expiry_date < NOW()) as expired, COUNT(*) FILTER (WHERE status = 'pending') as pending FROM "${schema}".evidence`),
        ]);
        const kpis = (0, db_1.getFirstRow)(kpiRes) || {};
        const prevKpis = kpiRes.rows[1] || {};
        const riskData = (0, db_1.getFirstRow)(riskRes) || {};
        const controlData = (0, db_1.getFirstRow)(controlRes) || {};
        const incidentData = (0, db_1.getFirstRow)(incidentRes) || {};
        const evidenceData = (0, db_1.getFirstRow)(evidenceRes) || {};
        // Try AI-powered summary first
        try {
            const context = {
                compliance: { current: kpis.compliance_score, previous: prevKpis.compliance_score },
                risk: { current: kpis.risk_score, previous: prevKpis.risk_score, highOpen: riskData.high_open, untreated: riskData.untreated },
                controls: { total: controlData.total, implemented: controlData.implemented, tested: controlData.tested },
                incidents: { open: incidentData.open, criticalOpen: incidentData.critical_open },
                evidence: { coverage: kpis.evidence_coverage, expired: evidenceData.expired, pending: evidenceData.pending },
            };
            const aiResult = await (0, ai_gateway_service_1.gatewayJSON)({
                systemPrompt: `You are a GRC analyst for a Saudi Arabian organization. Analyze the KPI data and provide an executive dashboard summary.
Respond in JSON: { "priorities": [{"en":"...","ar":"..."}], "weeklyChanges": [{"en":"...","ar":"..."}], "recommendedActions": [{"en":"...","ar":"..."}] }
Keep each item concise (under 80 chars). Provide 2-4 items per category. Focus on actionable insights.`,
                userMessage: `Current GRC metrics:\n${JSON.stringify(context, null, 2)}`,
                maxTokens: 800,
                temperature: 0.2,
                tenantId,
            });
            return {
                priorities: aiResult.priorities || [],
                weeklyChanges: aiResult.weeklyChanges || [],
                recommendedActions: aiResult.recommendedActions || [],
                generatedAt: new Date().toISOString(),
            };
        }
        catch {
            // Fall back to rule-based summary with enriched data
            return buildAISummary({ ...kpis, open_risks: Number(riskData.high_open || 0), open_findings: Number(incidentData.open || 0), expired_evidence: Number(evidenceData.expired || 0), untreated_risks: Number(riskData.untreated || 0) });
        }
    }
    catch {
        return buildAISummary({});
    }
}
// ── Remediation Dashboard Widget ──
async function getRemediationDashboardWidget(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const result = await (0, database_port_1.safeQuery)(`
      SELECT
        COUNT(*)::int AS total_tasks,
        COUNT(*) FILTER (WHERE status IN ('open','in_progress'))::int AS open_count,
        COUNT(*) FILTER (WHERE status = 'overdue' OR (due_date < NOW() AND status NOT IN ('completed','closed')))::int AS overdue_count,
        COUNT(*) FILTER (WHERE status IN ('completed','closed'))::int AS closed_count,
        ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - created_at)) / 86400)::numeric, 1) AS avg_resolution_days
      FROM "${schema}".remediation_tasks WHERE deleted_at IS NULL
    `);
        return result.rows[0] || { total_tasks: 0, open_count: 0, overdue_count: 0, closed_count: 0, avg_resolution_days: 0 };
    }
    catch {
        return { total_tasks: 0, open_count: 0, overdue_count: 0, closed_count: 0, avg_resolution_days: 0 };
    }
}
// ── Action Items Dashboard Widget ──
async function getActionDashboardWidget(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const result = await (0, database_port_1.safeQuery)(`
      SELECT
        COUNT(*)::int AS total_items,
        COUNT(*) FILTER (WHERE status IN ('open','in_progress'))::int AS open_count,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed','closed'))::int AS overdue_count,
        COUNT(*) FILTER (WHERE status IN ('completed','closed'))::int AS completed_count,
        ROUND(COUNT(*) FILTER (WHERE status IN ('completed','closed'))::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS completion_rate
      FROM "${schema}".action_items WHERE deleted_at IS NULL
    `);
        return result.rows[0] || { total_items: 0, open_count: 0, overdue_count: 0, completed_count: 0, completion_rate: 0 };
    }
    catch {
        return { total_items: 0, open_count: 0, overdue_count: 0, completed_count: 0, completion_rate: 0 };
    }
}
// ── Workflow Dashboard Widget ──
async function getWorkflowDashboardWidget(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const result = await (0, database_port_1.safeQuery)(`
      SELECT
        COUNT(*)::int AS total_instances,
        COUNT(*) FILTER (WHERE status = 'running')::int AS active_count,
        COUNT(*) FILTER (WHERE status = 'pending' AND created_at < NOW() - INTERVAL '48 hours')::int AS stalled_count,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count,
        ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - created_at)) / 3600)::numeric, 1) AS avg_cycle_hours
      FROM "${schema}".workflow_instances WHERE deleted_at IS NULL
    `);
        return result.rows[0] || { total_instances: 0, active_count: 0, stalled_count: 0, completed_count: 0, avg_cycle_hours: 0 };
    }
    catch {
        return { total_instances: 0, active_count: 0, stalled_count: 0, completed_count: 0, avg_cycle_hours: 0 };
    }
}
// ── Asset Dashboard Widget ──
async function getAssetDashboardWidget(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const result = await (0, database_port_1.safeQuery)(`
      SELECT
        COUNT(*)::int AS total_assets,
        COUNT(*) FILTER (WHERE criticality = 'critical')::int AS critical_count,
        COUNT(*) FILTER (WHERE criticality = 'high')::int AS high_count,
        COUNT(*) FILTER (WHERE criticality = 'medium')::int AS medium_count,
        COUNT(*) FILTER (WHERE criticality = 'low')::int AS low_count
      FROM "${schema}".assets WHERE deleted_at IS NULL
    `);
        return result.rows[0] || { total_assets: 0, critical_count: 0, high_count: 0, medium_count: 0, low_count: 0 };
    }
    catch {
        return { total_assets: 0, critical_count: 0, high_count: 0, medium_count: 0, low_count: 0 };
    }
}
// ── Integrations Dashboard Widget ──
async function getIntegrationsDashboardWidget(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const result = await (0, database_port_1.safeQuery)(`
      SELECT
        COUNT(*)::int AS total_integrations,
        COUNT(*) FILTER (WHERE status = 'connected')::int AS connected_count,
        COUNT(*) FILTER (WHERE status = 'error')::int AS failing_count,
        MAX(last_sync_at) AS last_sync
      FROM "${schema}".integration_configs WHERE deleted_at IS NULL
    `);
        return result.rows[0] || { total_integrations: 0, connected_count: 0, failing_count: 0, last_sync: null };
    }
    catch {
        return { total_integrations: 0, connected_count: 0, failing_count: 0, last_sync: null };
    }
}
// ── Admin Dashboard Widget ──
async function getAdminDashboardWidget(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const [users, roles, modules] = await Promise.all([
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS active_users FROM "${schema}".users WHERE status = 'active'`),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS roles_count FROM "${schema}".roles`),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS modules_enabled FROM "${schema}".module_activations WHERE active = true`),
        ]);
        return {
            active_users: users.rows[0]?.active_users || 0,
            roles_count: roles.rows[0]?.roles_count || 0,
            modules_enabled: modules.rows[0]?.modules_enabled || 0,
        };
    }
    catch {
        return { active_users: 0, roles_count: 0, modules_enabled: 0 };
    }
}
//# sourceMappingURL=dashboard-widgets.service.js.map