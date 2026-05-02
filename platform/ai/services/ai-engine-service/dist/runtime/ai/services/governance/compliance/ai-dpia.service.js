import { safeQuery, tenantSchema } from '../../../ports/database.port.js';
import { getFirstRow } from '@dos/db';
/**
 * Calculate privacy risk score for DPIA
 */
function calculatePrivacyRiskScore(dataTypes, dataVolume, crossBorder, automatedDecision, profiling, retentionDays) {
    let score = 0.0;
    // Data sensitivity
    const sensitiveTypes = ['health', 'biometric', 'financial', 'location', 'minors'];
    const sensitiveCount = dataTypes.filter(dt => sensitiveTypes.some(st => dt.toLowerCase().includes(st))).length;
    score += Math.min(0.4, sensitiveCount * 0.1);
    // Data volume
    if (dataVolume > 100000)
        score += 0.2;
    else if (dataVolume > 10000)
        score += 0.1;
    // Cross-border transfers
    if (crossBorder)
        score += 0.15;
    // Automated decision-making
    if (automatedDecision)
        score += 0.15;
    // Profiling
    if (profiling)
        score += 0.1;
    // Retention period
    if (retentionDays > 365 * 3)
        score += 0.1; // > 3 years
    else if (retentionDays > 365)
        score += 0.05; // > 1 year
    return Math.min(1.0, score);
}
/**
 * Create or update DPIA assessment
 */
export async function createOrUpdateDPIA(tenantId, systemId, dpiaData) {
    const schema = tenantSchema(tenantId);
    // Calculate privacy risk score
    const privacyRiskScore = calculatePrivacyRiskScore(dpiaData.data_types_processed, dpiaData.data_subject_count_estimate || 0, dpiaData.cross_border_transfers || false, dpiaData.automated_decision_making || false, dpiaData.profiling_enabled || false, dpiaData.data_retention_period_days || 365);
    // Determine residual risk level
    let residualRisk = 'medium';
    if (privacyRiskScore >= 0.8)
        residualRisk = 'critical';
    else if (privacyRiskScore >= 0.6)
        residualRisk = 'high';
    else if (privacyRiskScore >= 0.4)
        residualRisk = 'medium';
    else
        residualRisk = 'low';
    // PDPL compliance checks
    const pdplChecks = {
        arabic_notice: true, // Assume provided
        consent_management: dpiaData.legal_basis === 'consent',
        data_subject_rights: true, // Assume implemented
        data_minimization: dpiaData.data_types_processed.length <= 5,
        retention_policy: dpiaData.data_retention_period_days !== undefined && dpiaData.data_retention_period_days <= 1095 // 3 years
    };
    const pdplCompliant = Object.values(pdplChecks).every(v => v === true);
    // Risk analysis structure
    const riskAnalysis = {
        likelihood: privacyRiskScore >= 0.6 ? 'likely' : privacyRiskScore >= 0.4 ? 'possible' : 'unlikely',
        impact: privacyRiskScore >= 0.7 ? 'severe' : privacyRiskScore >= 0.5 ? 'major' : 'moderate',
        severity: residualRisk,
        risk_factors: []
    };
    const result = await safeQuery(`INSERT INTO "${schema}".ai_dpia_assessments 
     (system_id, assessment_status, data_types_processed, processing_purpose, legal_basis,
      data_subjects_affected, data_subject_count_estimate, data_retention_period_days,
      cross_border_transfers, transfer_destinations, automated_decision_making, profiling_enabled,
      ai_model_used, privacy_risk_score, risk_analysis, mitigation_measures, residual_risk_level,
      pdpl_compliance_checks, pdpl_compliant, next_review_date, review_frequency, created_by)
     VALUES ($1, 'draft', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 
             CURRENT_DATE + INTERVAL '1 year', 'annual', $19)
     RETURNING *`, [
        systemId,
        JSON.stringify(dpiaData.data_types_processed),
        dpiaData.processing_purpose,
        dpiaData.legal_basis,
        JSON.stringify(dpiaData.data_subjects_affected || []),
        dpiaData.data_subject_count_estimate || null,
        dpiaData.data_retention_period_days || 365,
        dpiaData.cross_border_transfers || false,
        JSON.stringify(dpiaData.transfer_destinations || []),
        dpiaData.automated_decision_making || false,
        dpiaData.profiling_enabled || false,
        dpiaData.ai_model_used || null,
        privacyRiskScore,
        JSON.stringify(riskAnalysis),
        JSON.stringify(dpiaData.mitigation_measures || []),
        residualRisk,
        JSON.stringify(pdplChecks),
        pdplCompliant,
        dpiaData.created_by || null
    ]);
    return getFirstRow(result);
}
/**
 * Add risk factor to DPIA
 */
export async function addDPIARiskFactor(tenantId, dpiaId, riskFactor) {
    const schema = tenantSchema(tenantId);
    // Calculate severity from likelihood and impact
    const likelihoodMap = { rare: 1, unlikely: 2, possible: 3, likely: 4, almost_certain: 5 };
    const impactMap = { negligible: 1, minor: 2, moderate: 3, major: 4, severe: 5 };
    const riskValue = likelihoodMap[riskFactor.likelihood] * impactMap[riskFactor.impact];
    let severity = 'low';
    if (riskValue >= 20)
        severity = 'critical';
    else if (riskValue >= 12)
        severity = 'high';
    else if (riskValue >= 6)
        severity = 'medium';
    const result = await safeQuery(`INSERT INTO "${schema}".ai_dpia_risk_factors 
     (dpia_id, factor_type, factor_description, likelihood, impact, severity, mitigation_applied)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`, [
        dpiaId,
        riskFactor.factor_type,
        riskFactor.factor_description || null,
        riskFactor.likelihood,
        riskFactor.impact,
        severity,
        riskFactor.mitigation_applied || null
    ]);
    return getFirstRow(result);
}
/**
 * Submit DPIA for review
 */
export async function submitDPIAForReview(tenantId, dpiaId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`UPDATE "${schema}".ai_dpia_assessments 
     SET assessment_status = 'in_review', updated_at = NOW()
     WHERE dpia_id = $1 AND assessment_status = 'draft'
     RETURNING dpia_id`, [dpiaId]);
    return result.rows.length > 0;
}
/**
 * Approve or reject DPIA
 */
export async function reviewDPIA(tenantId, dpiaId, decision, reviewerId, reviewerRole, approvalNotes) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`UPDATE "${schema}".ai_dpia_assessments 
     SET assessment_status = $1, reviewer_id = $2, reviewer_role = $3, 
         approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE NULL END,
         approval_notes = $4, updated_at = NOW()
     WHERE dpia_id = $5 AND assessment_status = 'in_review'
     RETURNING dpia_id`, [decision, reviewerId, reviewerRole, approvalNotes || null, dpiaId]);
    return result.rows.length > 0;
}
/**
 * Get DPIA assessments
 */
export async function getDPIAAssessments(tenantId, systemId, status) {
    const schema = tenantSchema(tenantId);
    let query = `SELECT * FROM "${schema}".ai_dpia_assessments WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (systemId) {
        query += ` AND system_id = $${idx++}`;
        params.push(systemId);
    }
    if (status) {
        query += ` AND assessment_status = $${idx++}`;
        params.push(status);
    }
    query += ` ORDER BY created_at DESC`;
    const result = await safeQuery(query, params);
    return result.rows;
}
/**
 * Get DPIAs requiring review
 */
export async function getDPIAsRequiringReview(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT dpia_id, system_id, assessment_status, next_review_date, 
            s.system_name
     FROM "${schema}".ai_dpia_assessments d
     LEFT JOIN "${schema}".ai_system_registry s ON d.system_id = s.id
     WHERE (assessment_status = 'in_review' OR 
            (next_review_date IS NOT NULL AND next_review_date <= CURRENT_DATE + INTERVAL '30 days'))
     ORDER BY next_review_date ASC NULLS LAST, created_at DESC`, []);
    return result.rows;
}
/**
 * Get DPIA risk factors
 */
export async function getDPIARiskFactors(tenantId, dpiaId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_dpia_risk_factors 
     WHERE dpia_id = $1 
     ORDER BY severity DESC, created_at ASC`, [dpiaId]);
    return result.rows;
}
//# sourceMappingURL=ai-dpia.service.js.map