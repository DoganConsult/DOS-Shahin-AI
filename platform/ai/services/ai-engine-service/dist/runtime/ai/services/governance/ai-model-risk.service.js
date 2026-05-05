// @ts-nocheck
import { logger } from '../../ports/logger.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { createRisk, updateRisk } from '../../risk/services/core/risk.service';
import { eventBus } from '../../ports/events.port';
/**
 * Calculate automated risk score for an AI model
 */
export async function calculateModelRiskScore(tenantId, modelVersionId, systemId, modelData) {
    const schema = tenantSchema(tenantId);
    // Risk calculation logic (simplified - can be enhanced)
    let dataRisk = 0.0;
    let modelRisk = 0.0;
    let operationalRisk = 0.0;
    let complianceRisk = 0.0;
    const riskFactors = {};
    // Data risk: based on training data quality, bias, privacy exposure
    if (modelData.training_data_summary) {
        const dataSummary = modelData.training_data_summary;
        if (dataSummary.contains_pii)
            dataRisk += 0.3;
        if (dataSummary.contains_sensitive_data)
            dataRisk += 0.2;
        if (dataSummary.bias_detected)
            dataRisk += 0.2;
        if (!dataSummary.quality_metrics)
            dataRisk += 0.1;
        if (dataSummary.data_volume && dataSummary.data_volume < 1000)
            dataRisk += 0.2;
    }
    // Model risk: based on performance, accuracy, drift potential
    if (modelData.performance_metrics) {
        const perf = modelData.performance_metrics;
        if (perf.accuracy && perf.accuracy < 0.8)
            modelRisk += 0.3;
        if (perf.precision && perf.precision < 0.75)
            modelRisk += 0.2;
        if (perf.recall && perf.recall < 0.75)
            modelRisk += 0.2;
        if (!perf.robustness_tested)
            modelRisk += 0.2;
        if (perf.adversarial_vulnerability)
            modelRisk += 0.1;
    }
    // Operational risk: based on deployment environment, access controls
    if (modelData.deployment_environment === 'production') {
        operationalRisk += 0.1; // Production has higher operational risk
    }
    if (!modelData.deployment_environment || modelData.deployment_environment === 'development') {
        operationalRisk += 0.05; // Development has lower risk
    }
    // Compliance risk: based on risk classification and framework alignment
    if (modelData.risk_classification === 'high' || modelData.risk_classification === 'unacceptable') {
        complianceRisk += 0.4;
    }
    else if (modelData.risk_classification === 'limited') {
        complianceRisk += 0.2;
    }
    // Cap all scores at 1.0
    dataRisk = Math.min(1.0, dataRisk);
    modelRisk = Math.min(1.0, modelRisk);
    operationalRisk = Math.min(1.0, operationalRisk);
    complianceRisk = Math.min(1.0, complianceRisk);
    // Composite score: weighted average (can be customized)
    const compositeRisk = (dataRisk * 0.3 + modelRisk * 0.3 + operationalRisk * 0.2 + complianceRisk * 0.2);
    riskFactors.data_quality = dataRisk;
    riskFactors.model_performance = modelRisk;
    riskFactors.operational_environment = operationalRisk;
    riskFactors.compliance_alignment = complianceRisk;
    // Store risk score
    const result = await safeQuery(`INSERT INTO "${schema}".ai_model_risk_scores 
     (model_version_id, system_id, data_risk_score, model_risk_score, operational_risk_score, 
      compliance_risk_score, composite_risk_score, risk_factors, scoring_method, scored_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'automated', NOW())
     RETURNING *`, [modelVersionId, systemId, dataRisk, modelRisk, operationalRisk, complianceRisk, compositeRisk, JSON.stringify(riskFactors)]);
    const row = result.rows[0];
    try {
        await syncModelRiskToEnterpriseRegister(tenantId, modelVersionId, systemId, compositeRisk, row);
    }
    catch (err) {
        // Best-effort: do not fail scoring if risk register sync fails
        if (typeof err?.message === 'string') {
            logger.warn('[ai-model-risk] syncModelRiskToEnterpriseRegister failed:', err.message);
        }
    }
    return row;
}
/**
 * Feature 15: Sync AI model risk score into enterprise risk register.
 * Creates or updates a risk with risk_category='ai_model' and entity_links.modelId,
 * then publishes risk.score_changed.
 */
export async function syncModelRiskToEnterpriseRegister(tenantId, modelVersionId, systemId, compositeRiskScore, scoreRow) {
    const schema = tenantSchema(tenantId);
    const entityLinks = { type: 'ai_model', modelId: modelVersionId, systemId };
    const title = `AI Model Risk: ${modelVersionId}`;
    const description = scoreRow?.risk_factors
        ? `Automated model risk score. Factors: ${JSON.stringify(scoreRow.risk_factors)}`
        : `Automated model risk score (composite: ${(compositeRiskScore * 100).toFixed(1)}%).`;
    // Map composite 0–1 to likelihood/impact 1–5
    const score1to5 = Math.max(1, Math.min(5, Math.round(compositeRiskScore * 5)));
    const existing = await safeQuery(`SELECT risk_id, likelihood, impact, title FROM "${schema}".risks
     WHERE risk_category = 'ai_model' AND (entity_links->>'modelId') = $1 AND deleted_at IS NULL
     LIMIT 1`, [modelVersionId]);
    if (existing.rows.length > 0) {
        const r = existing.rows[0];
        await updateRisk(tenantId, r.risk_id, {
            likelihood: score1to5,
            impact: score1to5,
            risk_category: 'ai_model',
            entity_links: entityLinks,
            title,
            description,
        });
        return;
    }
    const created = await createRisk(tenantId, {
        title,
        description,
        category: 'ai_model',
        likelihood: score1to5,
        impact: score1to5,
        owner: 'system',
        risk_category: 'ai_model',
        entity_links: entityLinks,
    });
    const riskId = created?.risk_id;
    if (riskId) {
        try {
            await eventBus.publish({
                eventType: 'risk.score_changed',
                tenantId,
                sourceService: 'ai-model-risk',
                entityType: 'risk',
                entityId: riskId,
                severity: score1to5 * score1to5 >= 20 ? 'critical' : score1to5 * score1to5 >= 12 ? 'warning' : 'info',
                payload: { title, oldScore: 0, newScore: score1to5 * score1to5, likelihood: score1to5, impact: score1to5 },
            });
        }
        catch { /* best-effort */ }
    }
}
/**
 * Get risk scores for a model
 */
export async function getModelRiskScores(tenantId, modelVersionId, systemId) {
    const schema = tenantSchema(tenantId);
    let query = `SELECT * FROM "${schema}".ai_model_risk_scores WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (modelVersionId) {
        query += ` AND model_version_id = $${idx++}`;
        params.push(modelVersionId);
    }
    if (systemId) {
        query += ` AND system_id = $${idx++}`;
        params.push(systemId);
    }
    query += ` ORDER BY scored_at DESC`;
    const result = await safeQuery(query, params);
    return result.rows;
}
/**
 * Transition model lifecycle state
 */
export async function transitionModelLifecycle(tenantId, modelVersionId, systemId, newState, transitionReason, transitionedBy, requiresApproval = true) {
    const schema = tenantSchema(tenantId);
    // Get current state
    const currentResult = await safeQuery(`SELECT current_state FROM "${schema}".ai_model_lifecycle 
     WHERE model_version_id = $1 ORDER BY transitioned_at DESC LIMIT 1`, [modelVersionId]);
    const previousState = currentResult.rows[0]?.current_state || 'development';
    // Insert lifecycle transition
    const result = await safeQuery(`INSERT INTO "${schema}".ai_model_lifecycle 
     (model_version_id, system_id, current_state, previous_state, transition_reason, 
      transitioned_by, transitioned_at, requires_approval, approval_status)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)
     RETURNING *`, [modelVersionId, systemId, newState, previousState, transitionReason, transitionedBy, requiresApproval, requiresApproval ? 'pending' : 'not_required']);
    return result.rows[0];
}
/**
 * Approve lifecycle transition
 */
export async function approveLifecycleTransition(tenantId, lifecycleId, approvedBy, approvalNotes) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`UPDATE "${schema}".ai_model_lifecycle 
     SET approval_status = 'approved', approved_by = $1, approved_at = NOW(), approval_notes = $2
     WHERE lifecycle_id = $3 AND approval_status = 'pending'
     RETURNING lifecycle_id`, [approvedBy, approvalNotes || null, lifecycleId]);
    return result.rows.length > 0;
}
/**
 * Create risk assessment
 */
export async function createModelRiskAssessment(tenantId, modelVersionId, systemId, assessment) {
    const schema = tenantSchema(tenantId);
    // Determine risk level from findings
    let riskLevel = 'medium';
    if (assessment.risk_findings && assessment.risk_findings.length > 0) {
        const criticalFindings = assessment.risk_findings.filter((f) => f.severity === 'critical').length;
        const highFindings = assessment.risk_findings.filter((f) => f.severity === 'high').length;
        if (criticalFindings > 0)
            riskLevel = 'critical';
        else if (highFindings > 2)
            riskLevel = 'high';
        else if (highFindings > 0)
            riskLevel = 'medium';
        else
            riskLevel = 'low';
    }
    const result = await safeQuery(`INSERT INTO "${schema}".ai_model_risk_assessments 
     (model_version_id, system_id, assessment_type, risk_level, risk_findings, 
      recommendations, remediation_required, assessed_by, assessment_notes, assessment_date, next_assessment_due)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year')
     RETURNING *`, [
        modelVersionId,
        systemId,
        assessment.assessment_type,
        riskLevel,
        JSON.stringify(assessment.risk_findings || []),
        JSON.stringify(assessment.recommendations || []),
        riskLevel === 'high' || riskLevel === 'critical',
        assessment.assessed_by || null,
        assessment.assessment_notes || null
    ]);
    return result.rows[0];
}
/**
 * Get model risk assessments
 */
export async function getModelRiskAssessments(tenantId, modelVersionId, systemId) {
    const schema = tenantSchema(tenantId);
    let query = `SELECT * FROM "${schema}".ai_model_risk_assessments WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (modelVersionId) {
        query += ` AND model_version_id = $${idx++}`;
        params.push(modelVersionId);
    }
    if (systemId) {
        query += ` AND system_id = $${idx++}`;
        params.push(systemId);
    }
    query += ` ORDER BY assessment_date DESC`;
    const result = await safeQuery(query, params);
    return result.rows;
}
/**
 * Get models requiring assessment
 */
export async function getModelsRequiringAssessment(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT DISTINCT m.model_version_id, m.asset_id, m.system_id, s.system_name,
            COALESCE(MAX(a.next_assessment_due), m.created_at::date + INTERVAL '1 year') as next_due
     FROM "${schema}".ai_model_registry m
     LEFT JOIN "${schema}".ai_system_registry s ON m.system_id = s.id
     LEFT JOIN "${schema}".ai_model_risk_assessments a ON m.model_version_id = a.model_version_id
     WHERE m.is_active = TRUE AND m.approval_status = 'approved'
     GROUP BY m.model_version_id, m.asset_id, m.system_id, s.system_name, m.created_at
     HAVING COALESCE(MAX(a.next_assessment_due), m.created_at::date + INTERVAL '1 year') <= CURRENT_DATE + INTERVAL '30 days'
     ORDER BY next_due ASC`, []);
    return result.rows;
}
//# sourceMappingURL=ai-model-risk.service.js.map