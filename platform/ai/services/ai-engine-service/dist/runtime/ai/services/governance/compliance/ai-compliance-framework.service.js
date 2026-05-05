import { safeQuery, tenantSchema } from '../../../ports/database.port';
/**
 * Map AI system to compliance framework control
 */
export async function mapSystemToFramework(tenantId, mapping) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`INSERT INTO "${schema}".ai_compliance_framework_mapping 
     (system_id, model_version_id, framework_code, framework_version, control_code,
      control_title, control_description, compliance_status, evidence_ids, assessor_id, last_assessed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     ON CONFLICT (system_id, framework_code, control_code) 
     DO UPDATE SET 
       compliance_status = EXCLUDED.compliance_status,
       evidence_ids = EXCLUDED.evidence_ids,
       assessor_id = EXCLUDED.assessor_id,
       last_assessed_at = NOW(),
       updated_at = NOW()
     RETURNING *`, [
        mapping.system_id,
        mapping.model_version_id || null,
        mapping.framework_code,
        mapping.framework_version || null,
        mapping.control_code,
        mapping.control_title || null,
        mapping.control_description || null,
        mapping.compliance_status || 'not_assessed',
        mapping.evidence_ids || [],
        mapping.assessor_id || null
    ]);
    return result.rows[0];
}
/**
 * Get compliance mappings
 */
export async function getComplianceMappings(tenantId, filters) {
    const schema = tenantSchema(tenantId);
    let query = `SELECT * FROM "${schema}".ai_compliance_framework_mapping WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (filters?.system_id) {
        query += ` AND system_id = $${idx++}`;
        params.push(filters.system_id);
    }
    if (filters?.framework_code) {
        query += ` AND framework_code = $${idx++}`;
        params.push(filters.framework_code);
    }
    if (filters?.compliance_status) {
        query += ` AND compliance_status = $${idx++}`;
        params.push(filters.compliance_status);
    }
    query += ` ORDER BY framework_code, control_code`;
    const result = await safeQuery(query, params);
    return result.rows;
}
/**
 * Update compliance status
 */
export async function updateComplianceStatus(tenantId, mappingId, status, assessorId, complianceNotes, evidenceIds, gapIdentified, gapDescription) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`UPDATE "${schema}".ai_compliance_framework_mapping 
     SET compliance_status = $1, assessor_id = $2, compliance_notes = $3,
         evidence_ids = $4, gap_identified = $5, gap_description = $6,
         last_assessed_at = NOW(), next_assessment_due = CURRENT_DATE + INTERVAL '1 year',
         updated_at = NOW()
     WHERE mapping_id = $7
     RETURNING mapping_id`, [
        status,
        assessorId,
        complianceNotes || null,
        evidenceIds || [],
        gapIdentified || false,
        gapDescription || null,
        mappingId
    ]);
    return result.rows.length > 0;
}
/**
 * Classify system risk for framework (e.g., EU AI Act)
 */
export async function classifyFrameworkRisk(tenantId, classification) {
    const schema = tenantSchema(tenantId);
    // Determine applicable requirements based on risk category
    let requirements = [];
    if (classification.framework_code === 'EU_AI_ACT') {
        if (classification.risk_category === 'high') {
            requirements = ['conformity_assessment', 'quality_management', 'risk_management', 'data_governance', 'transparency', 'human_oversight'];
        }
        else if (classification.risk_category === 'limited') {
            requirements = ['transparency', 'user_information'];
        }
    }
    else if (classification.framework_code === 'NIST_AI_RMF') {
        requirements = ['govern', 'map', 'measure', 'manage'];
    }
    const result = await safeQuery(`INSERT INTO "${schema}".ai_framework_risk_classifications 
     (system_id, model_version_id, framework_code, risk_category, classification_answers,
      requirements_applicable, classified_by, classified_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING *`, [
        classification.system_id,
        classification.model_version_id || null,
        classification.framework_code,
        classification.risk_category,
        JSON.stringify(classification.classification_answers),
        JSON.stringify(requirements),
        classification.classified_by
    ]);
    return result.rows[0];
}
/**
 * Get compliance dashboard data
 */
export async function getComplianceDashboard(tenantId, systemId, frameworkCode) {
    const schema = tenantSchema(tenantId);
    // Calculate compliance metrics
    const result = await safeQuery(`WITH control_counts AS (
       SELECT 
         COUNT(*)::int AS total_controls,
         COUNT(*) FILTER (WHERE compliance_status != 'not_applicable')::int AS applicable_controls,
         COUNT(*) FILTER (WHERE compliance_status = 'compliant')::int AS compliant_controls,
         COUNT(*) FILTER (WHERE compliance_status = 'partial')::int AS partial_controls,
         COUNT(*) FILTER (WHERE compliance_status = 'non_compliant')::int AS non_compliant_controls,
         COUNT(*) FILTER (WHERE compliance_status = 'not_assessed')::int AS not_assessed_controls,
         COUNT(*) FILTER (WHERE gap_identified = TRUE AND violation_severity = 'critical')::int AS critical_gaps,
         COUNT(*) FILTER (WHERE gap_identified = TRUE AND violation_severity = 'high')::int AS high_priority_gaps,
         COUNT(*) FILTER (WHERE gap_identified = TRUE AND violation_severity = 'medium')::int AS medium_priority_gaps,
         COUNT(*) FILTER (WHERE remediation_required = TRUE AND remediation_status = 'in_progress')::int AS remediation_in_progress,
         COUNT(*) FILTER (WHERE remediation_required = TRUE AND remediation_status = 'completed')::int AS remediation_completed
       FROM "${schema}".ai_compliance_framework_mapping
       WHERE system_id = $1 AND framework_code = $2
     )
     SELECT 
       total_controls,
       applicable_controls,
       compliant_controls,
       partial_controls,
       non_compliant_controls,
       not_assessed_controls,
       CASE WHEN applicable_controls > 0 THEN (compliant_controls::decimal / applicable_controls * 100) ELSE 0 END AS compliance_percentage,
       CASE WHEN total_controls > 0 THEN (applicable_controls::decimal / total_controls * 100) ELSE 0 END AS coverage_percentage,
       critical_gaps,
       high_priority_gaps,
       medium_priority_gaps,
       remediation_in_progress,
       remediation_completed
     FROM control_counts`, [systemId, frameworkCode]);
    if (result.rows.length === 0) {
        return {
            total_controls: 0,
            applicable_controls: 0,
            compliant_controls: 0,
            partial_controls: 0,
            non_compliant_controls: 0,
            not_assessed_controls: 0,
            compliance_percentage: 0,
            coverage_percentage: 0,
            critical_gaps: 0,
            high_priority_gaps: 0,
            medium_priority_gaps: 0,
            remediation_in_progress: 0,
            remediation_completed: 0
        };
    }
    const row = result.rows[0];
    return {
        total_controls: row.total_controls || 0,
        applicable_controls: row.applicable_controls || 0,
        compliant_controls: row.compliant_controls || 0,
        partial_controls: row.partial_controls || 0,
        non_compliant_controls: row.non_compliant_controls || 0,
        not_assessed_controls: row.not_assessed_controls || 0,
        compliance_percentage: parseFloat(row.compliance_percentage || 0),
        coverage_percentage: parseFloat(row.coverage_percentage || 0),
        critical_gaps: row.critical_gaps || 0,
        high_priority_gaps: row.high_priority_gaps || 0,
        medium_priority_gaps: row.medium_priority_gaps || 0,
        remediation_in_progress: row.remediation_in_progress || 0,
        remediation_completed: row.remediation_completed || 0
    };
}
/**
 * Get systems requiring compliance assessment
 */
export async function getSystemsRequiringAssessment(tenantId, frameworkCode) {
    const schema = tenantSchema(tenantId);
    let query = `
    SELECT DISTINCT s.id as system_id, s.system_name, m.framework_code,
           MAX(m.next_assessment_due) as next_due
    FROM "${schema}".ai_system_registry s
    LEFT JOIN "${schema}".ai_compliance_framework_mapping m ON s.id = m.system_id
    WHERE s.status = 'active'`;
    const params = [];
    let idx = 1;
    if (frameworkCode) {
        query += ` AND m.framework_code = $${idx++}`;
        params.push(frameworkCode);
    }
    query += `
    GROUP BY s.id, s.system_name, m.framework_code
    HAVING MAX(m.next_assessment_due) IS NULL OR MAX(m.next_assessment_due) <= CURRENT_DATE + INTERVAL '30 days'
    ORDER BY next_due ASC NULLS FIRST`;
    const result = await safeQuery(query, params);
    return result.rows;
}
//# sourceMappingURL=ai-compliance-framework.service.js.map