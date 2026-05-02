// @ts-nocheck
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
/**
 * Create explainability record
 */
export async function createExplainabilityRecord(tenantId, record) {
    const schema = tenantSchema(tenantId);
    // Calculate explanation quality (simplified)
    let qualityScore = 0.7; // Default
    if (record.explanation_content.feature_importance)
        qualityScore += 0.1;
    if (record.explanation_content.reasoning_chain)
        qualityScore += 0.1;
    if (record.explanation_content.confidence_breakdown)
        qualityScore += 0.1;
    qualityScore = Math.min(1.0, qualityScore);
    const completeness = Object.keys(record.explanation_content).length / 5; // Normalize to 0-1
    const meetsThreshold = qualityScore >= 0.7 && completeness >= 0.6;
    // Check compliance
    let complianceStatus = 'not_required';
    if (record.explainability_required) {
        if (meetsThreshold && record.explanation_content)
            complianceStatus = 'compliant';
        else if (record.explanation_content && Object.keys(record.explanation_content).length > 0)
            complianceStatus = 'partial';
        else
            complianceStatus = 'non_compliant';
    }
    const result = await safeQuery(`INSERT INTO "${schema}".ai_explainability_records 
     (session_id, agent_id, decision_type, decision_output, decision_confidence,
      explanation_method, explanation_content, explanation_quality_score, explanation_completeness,
      meets_quality_threshold, input_context, model_version_id, explainability_required, compliance_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`, [
        record.session_id || null,
        record.agent_id,
        record.decision_type,
        JSON.stringify(record.decision_output),
        record.decision_confidence || null,
        record.explanation_method,
        JSON.stringify(record.explanation_content),
        qualityScore,
        completeness,
        meetsThreshold,
        JSON.stringify(record.input_context || {}),
        record.model_version_id || null,
        record.explainability_required || false,
        complianceStatus
    ]);
    return result.rows[0];
}
/**
 * Get explainability records
 */
export async function getExplainabilityRecords(tenantId, filters) {
    const schema = tenantSchema(tenantId);
    let query = `SELECT * FROM "${schema}".ai_explainability_records WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (filters?.session_id) {
        query += ` AND session_id = $${idx++}`;
        params.push(filters.session_id);
    }
    if (filters?.agent_id) {
        query += ` AND agent_id = $${idx++}`;
        params.push(filters.agent_id);
    }
    if (filters?.decision_type) {
        query += ` AND decision_type = $${idx++}`;
        params.push(filters.decision_type);
    }
    if (filters?.human_reviewed !== undefined) {
        query += ` AND human_reviewed = $${idx++}`;
        params.push(filters.human_reviewed);
    }
    if (filters?.compliance_status) {
        query += ` AND compliance_status = $${idx++}`;
        params.push(filters.compliance_status);
    }
    query += ` ORDER BY created_at DESC`;
    const result = await safeQuery(query, params);
    return result.rows;
}
/**
 * Review explainability record
 */
export async function reviewExplainabilityRecord(tenantId, recordId, reviewedBy, reviewFeedback, explanationApproved) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`UPDATE "${schema}".ai_explainability_records 
     SET human_reviewed = TRUE, reviewed_by = $1, reviewed_at = NOW(),
         review_feedback = $2, explanation_approved = $3
     WHERE record_id = $4
     RETURNING record_id`, [reviewedBy, reviewFeedback || null, explanationApproved || null, recordId]);
    return result.rows.length > 0;
}
/**
 * Create counterfactual analysis
 */
export async function createCounterfactualAnalysis(tenantId, explainabilityRecordId, analysis) {
    const schema = tenantSchema(tenantId);
    // Calculate sensitivity and robustness
    const outputDiff = analysis.expected_output_changes?.magnitude || 0.1;
    const sensitivityScore = Math.min(1.0, outputDiff * 2); // Normalize
    let robustness = 'moderate';
    if (sensitivityScore < 0.2)
        robustness = 'robust';
    else if (sensitivityScore < 0.5)
        robustness = 'moderate';
    else if (sensitivityScore < 0.8)
        robustness = 'sensitive';
    else
        robustness = 'fragile';
    const result = await safeQuery(`INSERT INTO "${schema}".ai_counterfactual_analysis 
     (explainability_record_id, scenario_description, input_changes, expected_output_changes,
      output_difference, sensitivity_score, robustness_assessment, generated_for_user)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`, [
        explainabilityRecordId,
        analysis.scenario_description,
        JSON.stringify(analysis.input_changes),
        JSON.stringify(analysis.expected_output_changes || {}),
        outputDiff,
        sensitivityScore,
        robustness,
        analysis.generated_for_user || null
    ]);
    return result.rows[0];
}
/**
 * Get explainability requirements
 */
export async function getExplainabilityRequirements(tenantId, agentId, decisionType) {
    const schema = tenantSchema(tenantId);
    let query = `SELECT * FROM "${schema}".ai_explainability_requirements WHERE enabled = TRUE`;
    const params = [];
    let idx = 1;
    if (agentId) {
        query += ` AND (agent_id IS NULL OR agent_id = $${idx++})`;
        params.push(agentId);
    }
    if (decisionType) {
        query += ` AND (decision_type IS NULL OR decision_type = $${idx++})`;
        params.push(decisionType);
    }
    query += ` ORDER BY agent_id NULLS LAST, decision_type NULLS LAST`;
    const result = await safeQuery(query, params);
    return result.rows;
}
/**
 * Generate bilingual explainability (SDAIA Arabic explainability requirement).
 * Called after createExplainabilityRecord to add Arabic explanation.
 */
export async function enrichWithArabicExplanation(tenantId, recordId, explanationContent) {
    try {
        const { claudeJSON } = await import('../../../../config/claude-client.js');
        const arabic = await claudeJSON({
            systemPrompt: `You are a bilingual AI explainability expert. Translate and adapt the following AI decision explanation into professional Arabic.
Respond with JSON: {explanation_ar: string, key_factors_ar: string[], recommendation_ar: string}`,
            userMessage: `Translate this explanation to Arabic:\n${JSON.stringify(explanationContent)}`,
            maxTokens: 1024,
            temperature: 0.2,
            tenantId,
            agentId: 'explainability-translator',
            decisionType: 'arabic_explanation',
            skipPiiRedaction: true, // Already redacted in the original
        });
        const schema = tenantSchema(tenantId);
        await safeQuery(`UPDATE "${schema}".ai_explainability_records
       SET explanation_content = explanation_content || $1::jsonb
       WHERE record_id = $2`, [JSON.stringify({ explanation_ar: arabic.explanation_ar, key_factors_ar: arabic.key_factors_ar }), recordId]);
    }
    catch {
        // Arabic translation is best-effort; do not fail the caller
    }
}
/**
 * Calculate transparency metrics
 */
export async function calculateTransparencyMetrics(tenantId, agentId, periodStart, periodEnd) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`WITH metrics AS (
       SELECT 
         COUNT(*)::int AS total_decisions,
         COUNT(*) FILTER (WHERE explanation_content IS NOT NULL AND explanation_content != '{}'::jsonb)::int AS decisions_with_explanations,
         AVG(explanation_quality_score) AS avg_quality,
         COUNT(*) FILTER (WHERE explanation_quality_score < 0.7)::int AS below_threshold,
         COUNT(*) FILTER (WHERE explainability_required = TRUE)::int AS requiring_review,
         COUNT(*) FILTER (WHERE human_reviewed = TRUE)::int AS reviewed,
         COUNT(*) FILTER (WHERE compliance_status = 'compliant')::int AS compliant,
         COUNT(*) FILTER (WHERE compliance_status = 'non_compliant')::int AS non_compliant
       FROM "${schema}".ai_explainability_records
       WHERE agent_id = $1 AND created_at >= $2 AND created_at <= $3
     )
     SELECT 
       total_decisions,
       decisions_with_explanations,
       CASE WHEN total_decisions > 0 THEN (decisions_with_explanations::decimal / total_decisions * 100) ELSE 0 END AS explanation_coverage_rate,
       avg_quality,
       below_threshold,
       requiring_review,
       reviewed,
       CASE WHEN requiring_review > 0 THEN (reviewed::decimal / requiring_review * 100) ELSE 0 END AS review_coverage_rate,
       compliant,
       non_compliant,
       CASE WHEN total_decisions > 0 THEN (compliant::decimal / total_decisions * 100) ELSE 0 END AS compliance_rate
     FROM metrics`, [agentId, periodStart, periodEnd]);
    if (result.rows.length === 0) {
        return {
            total_decisions: 0,
            decisions_with_explanations: 0,
            explanation_coverage_rate: 0,
            avg_explanation_quality: null,
            explanations_below_threshold: 0,
            decisions_requiring_review: 0,
            decisions_reviewed: 0,
            review_coverage_rate: 0,
            compliant_decisions: 0,
            non_compliant_decisions: 0,
            compliance_rate: 0
        };
    }
    const row = result.rows[0];
    return {
        total_decisions: row.total_decisions || 0,
        decisions_with_explanations: row.decisions_with_explanations || 0,
        explanation_coverage_rate: parseFloat(row.explanation_coverage_rate || 0),
        avg_explanation_quality: row.avg_quality ? parseFloat(row.avg_quality) : null,
        explanations_below_threshold: row.below_threshold || 0,
        decisions_requiring_review: row.requiring_review || 0,
        decisions_reviewed: row.reviewed || 0,
        review_coverage_rate: parseFloat(row.review_coverage_rate || 0),
        compliant_decisions: row.compliant || 0,
        non_compliant_decisions: row.non_compliant || 0,
        compliance_rate: parseFloat(row.compliance_rate || 0)
    };
}
//# sourceMappingURL=ai-explainability.service.js.map