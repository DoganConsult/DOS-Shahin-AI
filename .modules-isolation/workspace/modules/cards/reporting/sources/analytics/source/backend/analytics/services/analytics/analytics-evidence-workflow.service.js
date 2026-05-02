"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdvancedEvidenceAnalytics = getAdvancedEvidenceAnalytics;
exports.getAdvancedWorkflowAnalytics = getAdvancedWorkflowAnalytics;
const logger_port_1 = require("../../ports/logger.port");
// ============================================
// Shahin GRC — Evidence & Workflow Analytics Service
// ============================================
const database_port_1 = require("../../ports/database.port");
async function getAdvancedEvidenceAnalytics(ctx) {
    const startTime = Date.now();
    const schema = (0, database_port_1.tenantSchema)(ctx.tenantId);
    try {
        const evidenceResult = await (0, database_port_1.safeQuery)(`SELECT e.evidence_id, e.title, e.status, e.submitted_at as collected_at, e.expiry_date,
        e.control_id, c.title as control_title, c.frameworks, c.framework_id,
        CASE WHEN e.expiry_date < NOW() THEN 'expired'
             WHEN e.expiry_date < NOW() + INTERVAL '30 days' THEN 'expiring_soon'
             ELSE 'valid' END as validity_status,
        EXTRACT(DAY FROM (e.expiry_date - NOW()))::int as days_until_expiry
      FROM "${schema}".evidence e
      LEFT JOIN "${schema}".controls c ON e.control_id = c.control_id
      WHERE e.status != 'deleted' AND e.deleted_at IS NULL
      ORDER BY e.submitted_at DESC NULLS LAST`);
        const coverageResult = await (0, database_port_1.safeQuery)(`SELECT COALESCE(c.framework_id, (c.frameworks[1])) as framework_code,
        COUNT(DISTINCT c.control_id)::int as total_controls,
        COUNT(DISTINCT CASE WHEN e.evidence_id IS NOT NULL THEN c.control_id END)::int as controls_with_evidence,
        COUNT(DISTINCT e.evidence_id)::int as total_evidence,
        COUNT(DISTINCT CASE WHEN e.expiry_date < NOW() THEN e.evidence_id END)::int as expired_evidence,
        COUNT(DISTINCT CASE WHEN e.expiry_date < NOW() + INTERVAL '30 days' AND e.expiry_date >= NOW() THEN e.evidence_id END)::int as expiring_soon
      FROM "${schema}".controls c
      LEFT JOIN "${schema}".evidence e ON e.control_id = c.control_id AND e.status != 'deleted' AND e.deleted_at IS NULL
      WHERE c.status NOT IN ('retired', 'deleted') AND c.deleted_at IS NULL
      GROUP BY COALESCE(c.framework_id, (c.frameworks[1]))
      ORDER BY COALESCE(c.framework_id, (c.frameworks[1]))`);
        const drillThrough = coverageResult.rows.map((cov) => ({
            level: 1, widgetId: 'evidence-coverage-framework',
            title: `${cov.framework_code || 'Unknown'} (${cov.controls_with_evidence}/${cov.total_controls} covered)`,
            titleAr: `${cov.framework_code || 'Unknown'} (${cov.controls_with_evidence}/${cov.total_controls})`,
            payload: { frameworkCode: cov.framework_code },
            route: `/evidence?framework=${encodeURIComponent(cov.framework_code || '')}`,
            children: [
                { level: 2, widgetId: 'evidence-status', title: `Valid Evidence (${cov.total_evidence - cov.expired_evidence - cov.expiring_soon})`, titleAr: `Valid (${cov.total_evidence - cov.expired_evidence - cov.expiring_soon})`, payload: { frameworkCode: cov.framework_code, validityStatus: 'valid' }, route: `/evidence?framework=${encodeURIComponent(cov.framework_code || '')}&status=valid` },
                { level: 2, widgetId: 'evidence-status', title: `Expiring Soon (${cov.expiring_soon})`, titleAr: `Expiring (${cov.expiring_soon})`, payload: { frameworkCode: cov.framework_code, validityStatus: 'expiring_soon' }, route: `/evidence?framework=${encodeURIComponent(cov.framework_code || '')}&status=expiring_soon` },
                { level: 2, widgetId: 'evidence-status', title: `Expired (${cov.expired_evidence})`, titleAr: `Expired (${cov.expired_evidence})`, payload: { frameworkCode: cov.framework_code, validityStatus: 'expired' }, route: `/evidence?framework=${encodeURIComponent(cov.framework_code || '')}&status=expired` },
            ],
        }));
        const predictiveInsights = await computeEvidencePredictiveInsights(ctx, evidenceResult.rows);
        const realTimeMetrics = await getEvidenceRealTimeMetrics(ctx);
        return {
            widgetId: 'advanced-evidence-analytics',
            data: { evidence: evidenceResult.rows, coverage: coverageResult.rows, totalEvidence: evidenceResult.rows.length, expiredCount: evidenceResult.rows.filter((e) => e.validity_status === 'expired').length, expiringSoonCount: evidenceResult.rows.filter((e) => e.validity_status === 'expiring_soon').length, coverageRate: coverageResult.rows.length > 0 ? coverageResult.rows.reduce((sum, c) => sum + (c.controls_with_evidence / Math.max(1, c.total_controls)), 0) / coverageResult.rows.length : 0 },
            drillThrough, predictiveInsights, realTimeMetrics,
            metadata: { generatedAt: new Date().toISOString(), dataSource: 'database', queryTimeMs: Date.now() - startTime, recordCount: evidenceResult.rows.length },
        };
    }
    catch (err) {
        logger_port_1.logger.error('[AdvancedAnalytics] Evidence analytics error:', err);
        return { widgetId: 'advanced-evidence-analytics', data: { evidence: [], coverage: [], totalEvidence: 0, expiredCount: 0, expiringSoonCount: 0, coverageRate: 0 }, metadata: { generatedAt: new Date().toISOString(), dataSource: 'database', queryTimeMs: Date.now() - startTime, recordCount: 0 } };
    }
}
async function getAdvancedWorkflowAnalytics(ctx) {
    const startTime = Date.now();
    const schema = (0, database_port_1.tenantSchema)(ctx.tenantId);
    try {
        const workflowResult = await (0, database_port_1.safeQuery)(`SELECT w.execution_id, w.workflow_id, w.status, w.started_at, w.completed_at, w.step_log,
        a.request_id as approval_id, a.approval_status, a.sla_deadline, a.request_reason as decision_comment,
        CASE WHEN a.sla_deadline < NOW() AND a.approval_status = 'pending' THEN 'breached'
             WHEN a.sla_deadline < NOW() + INTERVAL '24 hours' AND a.approval_status = 'pending' THEN 'at_risk'
             ELSE 'on_track' END as sla_status
      FROM "${schema}".workflow_instances w
      LEFT JOIN "${schema}".approval_requests a ON a.entity_type = 'workflow' AND a.entity_id = w.execution_id
      WHERE w.status IN ('running', 'pending', 'in_progress', 'awaiting_approval')
      ORDER BY w.started_at DESC`);
        const slaByRoleResult = await (0, database_port_1.safeQuery)(`SELECT COALESCE(a.current_approver_id, 'unassigned') as approver_role,
        COUNT(*)::int as total_approvals,
        COUNT(*) FILTER (WHERE a.sla_deadline < NOW() AND a.approval_status = 'pending')::int as breached,
        COUNT(*) FILTER (WHERE a.sla_deadline < NOW() + INTERVAL '24 hours' AND a.approval_status = 'pending')::int as at_risk,
        AVG(EXTRACT(EPOCH FROM (COALESCE(a.completed_at, NOW()) - a.requested_at)) / 3600)::numeric(10,2) as avg_hours_to_complete
      FROM "${schema}".approval_requests a
      WHERE a.approval_status IN ('pending', 'approved', 'rejected', 'in_review')
      GROUP BY COALESCE(a.current_approver_id, 'unassigned')
      ORDER BY breached DESC, at_risk DESC`);
        const drillThrough = slaByRoleResult.rows.map((sla) => ({
            level: 1, widgetId: 'workflow-sla-by-role',
            title: `${sla.approver_role} (${sla.breached} breached, ${sla.at_risk} at risk)`,
            titleAr: `${sla.approver_role} (${sla.breached} breached, ${sla.at_risk} at risk)`,
            payload: { role: sla.approver_role },
            route: `/workflows?approver=${encodeURIComponent(sla.approver_role)}`,
            children: [
                { level: 2, widgetId: 'workflow-sla-breached', title: `Breached (${sla.breached})`, titleAr: `Breached (${sla.breached})`, payload: { role: sla.approver_role, slaStatus: 'breached' }, route: `/workflows?approver=${encodeURIComponent(sla.approver_role)}&slaStatus=breached` },
                { level: 2, widgetId: 'workflow-sla-at-risk', title: `At Risk (${sla.at_risk})`, titleAr: `At Risk (${sla.at_risk})`, payload: { role: sla.approver_role, slaStatus: 'at_risk' }, route: `/workflows?approver=${encodeURIComponent(sla.approver_role)}&slaStatus=at_risk` },
            ],
        }));
        const predictiveInsights = await computeWorkflowPredictiveInsights(ctx, workflowResult.rows);
        const realTimeMetrics = await getWorkflowRealTimeMetrics(ctx);
        return {
            widgetId: 'advanced-workflow-analytics',
            data: { workflows: workflowResult.rows, slaByRole: slaByRoleResult.rows, totalPending: workflowResult.rows.length, totalBreached: slaByRoleResult.rows.reduce((sum, s) => sum + (Number(s.breached) || 0), 0), totalAtRisk: slaByRoleResult.rows.reduce((sum, s) => sum + (Number(s.at_risk) || 0), 0) },
            drillThrough, predictiveInsights, realTimeMetrics,
            metadata: { generatedAt: new Date().toISOString(), dataSource: 'database', queryTimeMs: Date.now() - startTime, recordCount: workflowResult.rows.length },
        };
    }
    catch (err) {
        logger_port_1.logger.error('[AdvancedAnalytics] Workflow analytics error:', err);
        return { widgetId: 'advanced-workflow-analytics', data: { workflows: [], slaByRole: [], totalPending: 0, totalBreached: 0, totalAtRisk: 0 }, metadata: { generatedAt: new Date().toISOString(), dataSource: 'database', queryTimeMs: Date.now() - startTime, recordCount: 0 } };
    }
}
async function computeEvidencePredictiveInsights(_ctx, evidence) {
    const insights = [];
    try {
        const expiringSoon = evidence.filter((e) => e.validity_status === 'expiring_soon');
        const expired = evidence.filter((e) => e.validity_status === 'expired');
        if (expiringSoon.length > 10) {
            insights.push({ type: 'forecast', severity: 'high', title: `${expiringSoon.length} Evidence Items Expiring Soon`, titleAr: `${expiringSoon.length} Evidence Expiring`, description: `${expiringSoon.length} evidence items will expire within 30 days.`, descriptionAr: `${expiringSoon.length} evidence items expiring.`, confidence: 0.95, predictedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), actionItems: ['Schedule evidence renewal tasks', 'Notify control owners', 'Update evidence collection schedule'] });
        }
        if (expired.length > 0) {
            insights.push({ type: 'anomaly', severity: 'critical', title: `${expired.length} Expired Evidence Items`, titleAr: `${expired.length} Expired Evidence`, description: `${expired.length} evidence items have expired.`, descriptionAr: `${expired.length} expired evidence items.`, confidence: 1.0, actionItems: ['Renew expired evidence immediately', 'Review evidence lifecycle process', 'Update compliance posture calculations'] });
        }
    }
    catch (err) {
        logger_port_1.logger.error('[AdvancedAnalytics] Evidence predictive insights error:', err);
    }
    return insights;
}
async function computeWorkflowPredictiveInsights(_ctx, workflows) {
    const insights = [];
    try {
        const breached = workflows.filter((w) => w.sla_status === 'breached');
        const atRisk = workflows.filter((w) => w.sla_status === 'at_risk');
        if (breached.length > 5) {
            insights.push({ type: 'anomaly', severity: 'critical', title: `${breached.length} SLA Breaches Detected`, titleAr: `${breached.length} SLA Breaches`, description: `${breached.length} workflow approvals have breached SLA deadlines.`, descriptionAr: `${breached.length} SLA breaches.`, confidence: 1.0, actionItems: ['Escalate to approvers immediately', 'Review SLA configuration', 'Consider automated approvals for low-risk items'] });
        }
        if (atRisk.length > 10) {
            insights.push({ type: 'forecast', severity: 'high', title: `${atRisk.length} Approvals At Risk`, titleAr: `${atRisk.length} Approvals At Risk`, description: `${atRisk.length} approvals approaching SLA deadlines within 24 hours.`, descriptionAr: `${atRisk.length} approvals at risk.`, confidence: 0.85, predictedDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), actionItems: ['Send reminder notifications', 'Review approval queue priorities', 'Consider delegation options'] });
        }
    }
    catch (err) {
        logger_port_1.logger.error('[AdvancedAnalytics] Workflow predictive insights error:', err);
    }
    return insights;
}
async function getEvidenceRealTimeMetrics(ctx) {
    const metrics = [];
    try {
        const schema = (0, database_port_1.tenantSchema)(ctx.tenantId);
        const r = await (0, database_port_1.safeQuery)(`SELECT COUNT(*) FILTER (WHERE submitted_at >= NOW() - INTERVAL '24 hours')::int as last_24h, COUNT(*) FILTER (WHERE submitted_at >= NOW() - INTERVAL '7 days')::int as last_7d FROM "${schema}".evidence WHERE status != 'deleted' AND deleted_at IS NULL`);
        const last24h = r.rows[0]?.last_24h || 0;
        const last7d = r.rows[0]?.last_7d || 0;
        const dailyAvg = last7d / 7;
        const changePercent = dailyAvg > 0 ? ((last24h - dailyAvg) / dailyAvg) * 100 : 0;
        metrics.push({ name: 'Evidence Collected (24h)', nameAr: 'Evidence (24h)', value: last24h, unit: 'items', trend: changePercent > 10 ? 'up' : changePercent < -10 ? 'down' : 'stable', changePercent, lastUpdated: new Date().toISOString(), source: 'database' });
    }
    catch (err) {
        logger_port_1.logger.error('[AdvancedAnalytics] Evidence real-time metrics error:', err);
    }
    return metrics;
}
async function getWorkflowRealTimeMetrics(ctx) {
    const metrics = [];
    try {
        const schema = (0, database_port_1.tenantSchema)(ctx.tenantId);
        const pr = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int as count FROM "${schema}".approval_requests WHERE approval_status = 'pending'`);
        metrics.push({ name: 'Pending Approvals', nameAr: 'Pending Approvals', value: pr.rows[0]?.count || 0, unit: 'approvals', trend: 'stable', changePercent: 0, lastUpdated: new Date().toISOString(), source: 'database' });
        const br = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int as count FROM "${schema}".approval_requests WHERE approval_status = 'pending' AND sla_deadline < NOW()`);
        const bc = br.rows[0]?.count || 0;
        metrics.push({ name: 'SLA Breaches', nameAr: 'SLA Breaches', value: bc, unit: 'breaches', trend: bc > 0 ? 'up' : 'stable', changePercent: 0, lastUpdated: new Date().toISOString(), source: 'database' });
    }
    catch (err) {
        logger_port_1.logger.error('[AdvancedAnalytics] Workflow real-time metrics error:', err);
    }
    return metrics;
}
//# sourceMappingURL=analytics-evidence-workflow.service.js.map