// AGRC-OS — Dashboard Widget Data APIs (30+ endpoints)
import { Router } from 'express';
import { asyncHandler } from '../../ports/middleware.port';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { getFirstRow } from '@dos/db';
import { validate } from "../ports/middleware.port";
import { z } from "zod";
const router = Router();
// Risk Heatmap Widget
router.get('/dashboard/risk-heatmap', authenticate, requirePermission('risk.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getRiskHeatmapData } = await import('../../services/agrc-os-dashboard.service');
    const result = await getRiskHeatmapData(req.tenantId);
    res.json(result);
}));
// Compliance Gauge Widget
router.get('/dashboard/compliance-score', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getComplianceScoreData } = await import('../../services/agrc-os-dashboard.service');
    const result = await getComplianceScoreData(req.tenantId);
    res.json(result);
}));
// Maturity Radar Widget
router.get('/dashboard/maturity-radar', authenticate, requirePermission('maturity.assessment.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getMaturityRadarData } = await import('../../services/agrc-os-dashboard.service');
    const result = await getMaturityRadarData(req.tenantId);
    res.json(result);
}));
// Findings Bar Widget
router.get('/dashboard/findings-bar', authenticate, requirePermission('audit.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getFindingsBarData } = await import('../../services/agrc-os-dashboard.service');
    const result = await getFindingsBarData(req.tenantId);
    res.json(result);
}));
// Evidence Donut Widget
router.get('/dashboard/evidence-donut', authenticate, requirePermission('evidence.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getEvidenceDonutData } = await import('../../services/agrc-os-dashboard.service');
    const result = await getEvidenceDonutData(req.tenantId);
    res.json(result);
}));
// Vendor Bubble Widget
router.get('/dashboard/vendor-bubble', authenticate, requirePermission('vendor.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getVendorBubbleData } = await import('../../services/agrc-os-dashboard.service');
    const result = await getVendorBubbleData(req.tenantId);
    res.json(result);
}));
// Top Risks Widget
router.get('/dashboard/top-risks', authenticate, requirePermission('risk.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getTopRisksData } = await import('../../services/agrc-os-dashboard.service');
    const result = await getTopRisksData(req.tenantId);
    res.json(result);
}));
// Trend Line Widget
router.get('/dashboard/trend-line', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getTrendLineData } = await import('../../services/agrc-os-dashboard.service');
    const days = parseInt(req.query.days) || 30;
    const result = await getTrendLineData(req.tenantId, days);
    res.json(result);
}));
// Control Health Widget
router.get('/dashboard/control-health', authenticate, requirePermission('control.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getControlHealthData } = await import('../../services/agrc-os-dashboard.service');
    const result = await getControlHealthData(req.tenantId);
    res.json(result);
}));
// Incident Stats Widget
router.get('/dashboard/incident-stats', authenticate, requirePermission('incident.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getIncidentStatsData } = await import('../../services/agrc-os-dashboard.service');
    const result = await getIncidentStatsData(req.tenantId);
    res.json(result);
}));
// Policy Compliance Widget
router.get('/dashboard/policy-compliance', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getPolicyComplianceData } = await import('../../services/agrc-os-dashboard.service');
    const result = await getPolicyComplianceData(req.tenantId);
    res.json(result);
}));
// System Overview Stats
router.get('/dashboard/system-overview', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getSystemOverviewStats } = await import('../../services/agrc-os-dashboard.service');
    const result = await getSystemOverviewStats(req.tenantId);
    res.json(result);
}));
// Risk Distribution by Category
router.get('/dashboard/risk-by-category', authenticate, requirePermission('risk.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { query: dbQuery } = await import('@dos/db');
    const result = await dbQuery(`SELECT category, COUNT(*) AS count, AVG(residual_score) AS avg_score
  FROM risks WHERE tenant_id = $1 AND status = 'active'
  GROUP BY category ORDER BY count DESC`, [req.tenantId]);
    res.json(result.rows);
}));
// Control Testing Coverage
router.get('/dashboard/control-coverage', authenticate, requirePermission('control.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { query: dbQuery } = await import('@dos/db');
    const result = await dbQuery(`SELECT
  COUNT(*) AS total_controls,
  COUNT(*) FILTER (WHERE test_status = 'effective') AS effective,
  COUNT(*) FILTER (WHERE test_status = 'ineffective') AS ineffective,
  COUNT(*) FILTER (WHERE test_status = 'not_tested') AS not_tested,
  ROUND(COUNT(*) FILTER (WHERE test_status = 'effective')::NUMERIC / COUNT(*) * 100, 2) AS coverage_pct
  FROM controls WHERE tenant_id = $1`, [req.tenantId]);
    res.json(getFirstRow(result));
}));
// Framework Compliance Summary
router.get('/dashboard/framework-summary', authenticate, requirePermission('framework.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { query: dbQuery } = await import('@dos/db');
    const result = await dbQuery(`SELECT
  f.framework_id,
  f.name,
  COUNT(fc.control_id) AS total_controls,
  COUNT(*) FILTER (WHERE c.test_status = 'effective') AS effective_controls,
  ROUND(COUNT(*) FILTER (WHERE c.test_status = 'effective')::NUMERIC / COUNT(*) * 100, 2) AS compliance_pct
  FROM frameworks f
  LEFT JOIN framework_controls fc ON f.framework_id = fc.framework_id
  LEFT JOIN controls c ON fc.control_id = c.control_id AND c.tenant_id = $1
  WHERE f.tenant_id = $1
  GROUP BY f.framework_id, f.name
  ORDER BY compliance_pct DESC`, [req.tenantId]);
    res.json(result.rows);
}));
// Recent Activities Timeline
router.get('/dashboard/recent-activities', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { query: dbQuery } = await import('@dos/db');
    const limit = parseInt(req.query.limit) || 20;
    const result = await dbQuery(`SELECT event_type, entity_type, entity_id, severity, created_at, source_service
  FROM event_log
  WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
  ORDER BY created_at DESC LIMIT $2`, [req.tenantId, limit]);
    res.json(result.rows);
}));
// Risk Trend Analysis
router.get('/dashboard/risk-trends', authenticate, requirePermission('risk.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { query: dbQuery } = await import('@dos/db');
    const days = parseInt(req.query.days) || 90;
    const result = await dbQuery(`SELECT
  DATE(created_at) AS date,
  COUNT(*) AS new_risks,
  AVG(inherent_score) AS avg_inherent_score,
  AVG(residual_score) AS avg_residual_score,
  COUNT(*) FILTER (WHERE status = 'closed') AS closed_risks
  FROM risks
  WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
  GROUP BY DATE(created_at)
  ORDER BY date`, [req.tenantId]);
    res.json(result.rows);
}));
// Vendor Risk Distribution
router.get('/dashboard/vendor-risk-dist', authenticate, requirePermission('vendor.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { query: dbQuery } = await import('@dos/db');
    const result = await dbQuery(`SELECT
  CASE
  WHEN COALESCE(vr.risk_score, 0) >= 80 THEN 'Critical'
  WHEN COALESCE(vr.risk_score, 0) >= 60 THEN 'High'
  WHEN COALESCE(vr.risk_score, 0) >= 40 THEN 'Medium'
  ELSE 'Low'
  END AS risk_level,
  COUNT(*) AS vendor_count
  FROM vendors v
  LEFT JOIN vendor_risk_assessments vr ON v.vendor_id = vr.vendor_id
  AND vr.tenant_id = $1 AND vr.assessment_date >= NOW() - INTERVAL '90 days'
  WHERE v.tenant_id = $1 AND v.status = 'active'
  GROUP BY risk_level
  ORDER BY vendor_count DESC`, [req.tenantId]);
    res.json(result.rows);
}));
// Evidence Collection Status
router.get('/dashboard/evidence-status', authenticate, requirePermission('evidence.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { query: dbQuery } = await import('@dos/db');
    const result = await dbQuery(`SELECT
  evidence_type,
  COUNT(*) AS total_artifacts,
  COUNT(*) FILTER (WHERE status = 'verified') AS verified,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  COUNT(*) FILTER (WHERE last_reviewed < NOW() - INTERVAL '90 days') AS stale,
  COALESCE(SUM(file_size_bytes), 0) AS total_size_bytes
  FROM evidence_artifacts
  WHERE tenant_id = $1
  GROUP BY evidence_type
  ORDER BY total_artifacts DESC`, [req.tenantId]);
    res.json(result.rows);
}));
// Incident Response Metrics
router.get('/dashboard/incident-metrics', authenticate, requirePermission('incident.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { query: dbQuery } = await import('@dos/db');
    const result = await dbQuery(`SELECT
  COUNT(*) AS total_incidents,
  COUNT(*) FILTER (WHERE severity = 'critical') AS critical_incidents,
  COUNT(*) FILTER (WHERE status = 'open') AS open_incidents,
  EXTRACT(EPOCH FROM AVG(resolved_at - created_at))/3600 AS avg_mttr_hours,
  EXTRACT(EPOCH FROM AVG(acknowledged_at - created_at))/3600 AS avg_ack_hours
  FROM incidents
  WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`, [req.tenantId]);
    res.json(getFirstRow(result));
}));
// Policy Status Overview
router.get('/dashboard/policy-status', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { query: dbQuery } = await import('@dos/db');
    const result = await dbQuery(`SELECT
  policy_type,
  COUNT(*) AS total_policies,
  COUNT(*) FILTER (WHERE compliance_status = 'compliant') AS compliant,
  COUNT(*) FILTER (WHERE compliance_status = 'non_compliant') AS non_compliant,
  COUNT(*) FILTER (WHERE expiry_date < NOW()) AS expired,
  COUNT(*) FILTER (WHERE next_review_date < NOW()) AS review_overdue
  FROM policies
  WHERE tenant_id = $1
  GROUP BY policy_type
  ORDER BY total_policies DESC`, [req.tenantId]);
    res.json(result.rows);
}));
// Audit Findings Trend
router.get('/dashboard/findings-trend', authenticate, requirePermission('audit.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { query: dbQuery } = await import('@dos/db');
    const days = parseInt(req.query.days) || 180;
    const result = await dbQuery(`SELECT
  DATE(created_at) AS date,
  COUNT(*) AS findings_created,
  COUNT(*) FILTER (WHERE status = 'closed') AS findings_closed,
  COUNT(*) FILTER (WHERE severity = 'critical') AS critical_findings
  FROM audit_findings
  WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
  GROUP BY DATE(created_at)
  ORDER BY date`, [req.tenantId]);
    res.json(result.rows);
}));
// Control Effectiveness by Framework
router.get('/dashboard/control-effectiveness', authenticate, requirePermission('control.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { query: dbQuery } = await import('@dos/db');
    const result = await dbQuery(`SELECT
  f.name AS framework_name,
  COUNT(fc.control_id) AS total_controls,
  COUNT(*) FILTER (WHERE c.test_status = 'effective') AS effective,
  COUNT(*) FILTER (WHERE c.test_status = 'ineffective') AS ineffective,
  COUNT(*) FILTER (WHERE c.test_status = 'not_tested') AS not_tested,
  ROUND(COUNT(*) FILTER (WHERE c.test_status = 'effective')::NUMERIC / COUNT(*) * 100, 2) AS effectiveness_pct
  FROM frameworks f
  LEFT JOIN framework_controls fc ON f.framework_id = fc.framework_id
  LEFT JOIN controls c ON fc.control_id = c.control_id AND c.tenant_id = $1
  WHERE f.tenant_id = $1
  GROUP BY f.framework_id, f.name
  ORDER BY effectiveness_pct DESC`, [req.tenantId]);
    res.json(result.rows);
}));
// Risk Heatmap with Time Comparison
router.get('/dashboard/risk-heatmap-comparison', authenticate, requirePermission('risk.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { query: dbQuery } = await import('@dos/db');
    const days = parseInt(req.query.days) || 30;
    const result = await dbQuery(`WITH current_risks AS (
  SELECT impact_level, likelihood_level, COUNT(*) AS current_count
  FROM risks
  WHERE tenant_id = $1 AND status = 'active'
  GROUP BY impact_level, likelihood_level
  ),
  historical_risks AS (
  SELECT impact_level, likelihood_level, COUNT(*) AS historical_count
  FROM risks
  WHERE tenant_id = $1 AND status = 'active'
  AND created_at <= NOW() - INTERVAL '${days} days'
  GROUP BY impact_level, likelihood_level
  )
  SELECT
  COALESCE(c.impact_level, h.impact_level) AS impact,
  COALESCE(c.likelihood_level, h.likelihood_level) AS likelihood,
  COALESCE(c.current_count, 0) AS current_count,
  COALESCE(h.historical_count, 0) AS historical_count
  FROM current_risks c
  FULL OUTER JOIN historical_risks h
  ON c.impact_level = h.impact_level AND c.likelihood_level = h.likelihood_level
  ORDER BY impact, likelihood`, [req.tenantId]);
    res.json(result.rows);
}));
// Maturity Assessment Progress
router.get('/dashboard/maturity-progress', authenticate, requirePermission('maturity.assessment.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { query: dbQuery } = await import('@dos/db');
    const result = await dbQuery(`SELECT
  maturity_domain,
  MAX(assessment_date) AS last_assessment,
  AVG(current_score) AS avg_current_score,
  AVG(target_score) AS avg_target_score,
  ROUND(AVG(current_score) / AVG(target_score) * 100, 2) AS achievement_pct
  FROM maturity_assessments
  WHERE tenant_id = $1
  GROUP BY maturity_domain
  ORDER BY achievement_pct DESC`, [req.tenantId]);
    res.json(result.rows);
}));
// Vendor Contract Expiry
router.get('/dashboard/vendor-contracts-expiry', authenticate, requirePermission('vendor.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { query: dbQuery } = await import('@dos/db');
    const days = parseInt(req.query.days) || 90;
    const result = await dbQuery(`SELECT
  v.vendor_name,
  vc.contract_id,
  vc.contract_name,
  vc.end_date,
  vc.annual_spend_usd,
  CASE
  WHEN vc.end_date < NOW() THEN 'Expired'
  WHEN vc.end_date <= NOW() + INTERVAL '30 days' THEN 'Expiring Soon'
  WHEN vc.end_date <= NOW() + INTERVAL '90 days' THEN 'Expiring in 90d'
  ELSE 'Active'
  END AS expiry_status
  FROM vendors v
  JOIN vendor_contracts vc ON v.vendor_id = vc.vendor_id
  WHERE v.tenant_id = $1 AND vc.tenant_id = $1
  AND vc.end_date <= NOW() + INTERVAL '${days} days'
  ORDER BY vc.end_date ASC
  LIMIT 20`, [req.tenantId]);
    res.json(result.rows);
}));
// Evidence Collection Trend
router.get('/dashboard/evidence-trend', authenticate, requirePermission('evidence.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { query: dbQuery } = await import('@dos/db');
    const days = parseInt(req.query.days) || 90;
    const result = await dbQuery(`SELECT
  DATE(created_at) AS date,
  COUNT(*) AS artifacts_added,
  COUNT(*) FILTER (WHERE status = 'verified') AS verified,
  COALESCE(SUM(file_size_bytes), 0) AS total_bytes
  FROM evidence_artifacts
  WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
  GROUP BY DATE(created_at)
  ORDER BY date`, [req.tenantId]);
    res.json(result.rows);
}));
// System Health Indicators
router.get('/dashboard/health-indicators', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { query: dbQuery } = await import('@dos/db');
    const result = await dbQuery(`SELECT
  'controls' AS metric,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE test_status = 'effective') AS healthy,
  COUNT(*) FILTER (WHERE test_status = 'ineffective') AS unhealthy,
  ROUND(COUNT(*) FILTER (WHERE test_status = 'effective')::NUMERIC / COUNT(*) * 100, 2) AS health_pct
  FROM controls WHERE tenant_id = $1
  UNION ALL
  SELECT
  'risks' AS metric,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE residual_score <= 50) AS healthy,
  COUNT(*) FILTER (WHERE residual_score > 70) AS unhealthy,
  ROUND(COUNT(*) FILTER (WHERE residual_score <= 50)::NUMERIC / COUNT(*) * 100, 2) AS health_pct
  FROM risks WHERE tenant_id = $1 AND status = 'active'
  UNION ALL
  SELECT
  'policies' AS metric,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE compliance_status = 'compliant') AS healthy,
  COUNT(*) FILTER (WHERE compliance_status = 'non_compliant') AS unhealthy,
  ROUND(COUNT(*) FILTER (WHERE compliance_status = 'compliant')::NUMERIC / COUNT(*) * 100, 2) AS health_pct
  FROM policies WHERE tenant_id = $1`, [req.tenantId]);
    res.json(result.rows);
}));
// Dashboard Summary KPIs
router.get('/dashboard/kpi-summary', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { query: dbQuery } = await import('@dos/db');
    const result = await dbQuery(`WITH kpis AS (
  SELECT
  (SELECT COUNT(*) FROM controls WHERE tenant_id = $1 AND test_status = 'effective') AS effective_controls,
  (SELECT COUNT(*) FROM controls WHERE tenant_id = $1) AS total_controls,
  (SELECT COUNT(*) FROM risks WHERE tenant_id = $1 AND status = 'active' AND residual_score > 70) AS high_risks,
  (SELECT COUNT(*) FROM risks WHERE tenant_id = $1 AND status = 'active') AS total_risks,
  (SELECT COUNT(*) FROM incidents WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days') AS incidents_30d,
  (SELECT COUNT(*) FROM audit_findings WHERE tenant_id = $1 AND status = 'open') AS open_findings,
  (SELECT ROUND(AVG(compliance_score), 2) FROM compliance_snapshots
  WHERE tenant_id = $1 AND executed_at >= NOW() - INTERVAL '7 days') AS avg_compliance
  )
  SELECT
  ROUND(effective_controls::NUMERIC / NULLIF(total_controls, 0) * 100, 2) AS control_effectiveness_pct,
  ROUND(high_risks::NUMERIC / NULLIF(total_risks, 0) * 100, 2) AS high_risk_pct,
  incidents_30d,
  open_findings,
  COALESCE(avg_compliance, 0) AS compliance_score
  FROM kpis`, [req.tenantId]);
    res.json(getFirstRow(result));
}));
export default router;
//# sourceMappingURL=dashboard-widgets.routes.js.map