"use strict";
// ============================================
// Shahin — Analytics KPI Service
// Core KPI computation for tenant analytics
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeKPIs = computeKPIs;
const database_port_1 = require("../../ports/database.port");
const evidence_quality_scoring_service_1 = require("../../../../../../evidence/source/backend/evidence/services/analysis/evidence-quality-scoring.service");
const db_1 = require("@dos/db");
// === KPI Computation ===
/**
 * Computes tenant KPIs by querying the tenant schema:
 * - compliance_score: average of all assessment scores
 * - risk_score: average risk_score from risks table
 * - evidence_coverage: percentage of controls with at least one evidence
 * - remediation_closure_rate: percentage of remediation_tasks with status 'completed'
 */
async function computeKPIs(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    // Compliance score: weighted average from control testing status + evidence quality
    // (assessments.score is seeded as 0; real compliance comes from control effectiveness)
    // Factor in evidence quality: if evidence quality is low, reduce control effectiveness score
    const controlsResult = await (0, database_port_1.safeQuery)(`SELECT control_id, test_status
     FROM "${schema}".controls
     WHERE deleted_at IS NULL`);
    let totalScore = 0;
    let controlCount = 0;
    for (const control of controlsResult.rows) {
        let baseScore = 50; // default
        if (control.test_status === 'effective' || control.test_status === 'passed') {
            baseScore = 100;
        }
        else if (control.test_status === 'partially_effective' || control.test_status === 'partial') {
            baseScore = 70;
        }
        else if (control.test_status === 'ineffective' || control.test_status === 'failed') {
            baseScore = 30;
        }
        else if (control.test_status === 'not_tested') {
            baseScore = 50;
        }
        // Factor in evidence quality (if evidence exists)
        try {
            const evidenceQuality = await (0, evidence_quality_scoring_service_1.getControlEvidenceQualityAverage)(tenantId, control.control_id);
            if (evidenceQuality.evidenceCount > 0) {
                // Adjust base score based on evidence quality:
                // - Tier A evidence: +5% boost (max 100)
                // - Tier B evidence: no change
                // - Tier C evidence: -10% penalty (min 0)
                // - No evidence: -5% penalty
                if (evidenceQuality.tier === 'A') {
                    baseScore = Math.min(100, baseScore + 5);
                }
                else if (evidenceQuality.tier === 'C') {
                    baseScore = Math.max(0, baseScore - 10);
                }
                // Tier B: no adjustment
            }
            else {
                // No evidence: slight penalty
                baseScore = Math.max(0, baseScore - 5);
            }
        }
        catch {
            // If evidence quality scoring fails, use base score only
        }
        totalScore += baseScore;
        controlCount++;
    }
    const complianceScore = controlCount > 0 ? Math.round((totalScore / controlCount) * 100) / 100 : 0;
    // Risk score: average risk_score from risks table (generated column: likelihood * impact)
    const riskResult = await (0, database_port_1.safeQuery)(`SELECT COALESCE(AVG(risk_score), 0) AS avg_risk FROM "${schema}".risks WHERE status != 'closed'`);
    const riskScore = parseFloat((0, db_1.getFirstRow)(riskResult)?.avg_risk) || 0;
    // Evidence coverage: percentage of controls with at least one evidence_task
    const controlsCountResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${schema}".controls`);
    const totalControls = parseInt((0, db_1.getFirstRow)(controlsCountResult)?.total, 10) || 0;
    let evidenceCoverage = 0;
    if (totalControls > 0) {
        const coveredResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(DISTINCT et.control_id)::int AS covered
       FROM "${schema}".evidence_tasks et
       WHERE et.control_id IS NOT NULL`);
        const coveredControls = parseInt((0, db_1.getFirstRow)(coveredResult)?.covered, 10) || 0;
        evidenceCoverage = Math.round((coveredControls / totalControls) * 100);
    }
    // Remediation closure rate: combines remediation_tasks + process_tasks
    let remediationClosureRate = 0;
    const remTotalResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*) AS total FROM "${schema}".remediation_tasks`);
    const remTotal = parseInt((0, db_1.getFirstRow)(remTotalResult)?.total, 10) || 0;
    let remCompleted = 0;
    if (remTotal > 0) {
        const remCompletedResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*) AS completed FROM "${schema}".remediation_tasks WHERE status = 'completed'`);
        remCompleted = parseInt((0, db_1.getFirstRow)(remCompletedResult)?.completed, 10) || 0;
    }
    const ptResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed
     FROM "${schema}".process_tasks`);
    const ptTotal = parseInt((0, db_1.getFirstRow)(ptResult)?.total, 10) || 0;
    const ptCompleted = parseInt((0, db_1.getFirstRow)(ptResult)?.completed, 10) || 0;
    const totalAll = remTotal + ptTotal;
    const completedAll = remCompleted + ptCompleted;
    remediationClosureRate = totalAll > 0 ? (completedAll / totalAll) * 100 : 0;
    // Vendor health score: average vendor risk_score (higher = healthier)
    let vendorHealthScore = 100;
    let vendorRiskExposure = 0;
    try {
        const vendorScoreResult = await (0, database_port_1.safeQuery)(`SELECT COALESCE(AVG(risk_score), 100)::numeric AS avg_score,
              COUNT(*)::int AS total_vendors,
              COUNT(*) FILTER (WHERE risk_rating IN ('critical', 'high'))::int AS high_risk_vendors
       FROM "${schema}".vendors WHERE status = 'active'`);
        const vendorRow = (0, db_1.getFirstRow)(vendorScoreResult);
        vendorHealthScore = Math.round(parseFloat(vendorRow?.avg_score) || 100);
        // Vendor risk exposure: % of controls that have vendor-owned/shared responsibility
        if (totalControls > 0) {
            const vendorControlsResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(DISTINCT control_id)::int AS vendor_controls
         FROM "${schema}".vendor_shared_responsibility
         WHERE ownership IN ('vendor', 'shared')`);
            const vendorControls = parseInt((0, db_1.getFirstRow)(vendorControlsResult)?.vendor_controls, 10) || 0;
            vendorRiskExposure = Math.round((vendorControls / totalControls) * 100);
        }
    }
    catch { /* vendor tables may not exist */ }
    return {
        complianceScore,
        riskScore,
        evidenceCoverage,
        remediationClosureRate,
        vendorHealthScore,
        vendorRiskExposure,
        computedAt: new Date(),
    };
}
//# sourceMappingURL=analytics-kpi.service.js.map