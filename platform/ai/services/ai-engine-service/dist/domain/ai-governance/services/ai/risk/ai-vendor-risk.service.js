// @ts-nocheck
// ============================================
// AI Vendor Risk Assessment Service (SAMA CSF 3.3)
// Assesses third-party AI providers for regulatory compliance
// ============================================
import { emptyResult, safeQuery, tenantSchema } from '../../../ports/database.port.js';
import { claudeJSON } from '../../../ports/ai.port.js';
import { swallowDefault, EC, catchHandler } from '@dos/platform-core/resilience/resilient-catch';
/**
 * Perform a comprehensive AI vendor risk assessment against SAMA CSF 3.3
 * and NCA ECC requirements. Checks data residency, certifications,
 * and uses AI-powered gap analysis.
 */
export async function assessAiVendor(tenantId, vendorData) {
    const schema = tenantSchema(tenantId);
    // Load tenant's regulatory requirements
    const tenantConfig = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT data_residency_region, settings FROM "${schema}".tenant_ai_config WHERE tenant_id = $1`, [tenantId]), { tenantId: tenantId, operation: 'query tenant_ai_config' });
    const requiredRegion = tenantConfig.rows[0]?.data_residency_region || 'KSA';
    // Required certifications for SAMA compliance
    const samaCerts = ['ISO 27001', 'SOC 2 Type II', 'ISO 42001'];
    const ncaCerts = ['ISO 27001', 'CSA STAR'];
    const hasSamaCerts = samaCerts.every(c => vendorData.certifications.some(vc => vc.toUpperCase().includes(c.toUpperCase())));
    const hasNcaCerts = ncaCerts.every(c => vendorData.certifications.some(vc => vc.toUpperCase().includes(c.toUpperCase())));
    // Data residency check against allowed regions
    const allowedRegions = {
        'KSA': ['KSA', 'Saudi Arabia', 'GCC'],
        'GCC': ['KSA', 'UAE', 'Bahrain', 'Kuwait', 'Oman', 'Qatar', 'GCC'],
        'MENA': ['KSA', 'UAE', 'Bahrain', 'Kuwait', 'Oman', 'Qatar', 'GCC', 'Egypt', 'Jordan', 'MENA'],
    };
    const residencyCompliant = (allowedRegions[requiredRegion] || ['KSA']).some(r => vendorData.data_location.toUpperCase().includes(r.toUpperCase()));
    // AI-powered comprehensive assessment
    const aiAssessment = await claudeJSON({
        systemPrompt: `You are a SAMA CSF and NCA ECC third-party AI vendor risk assessor for Saudi Arabia.
Assess the vendor against SAMA CSF 3.3 (Third Party Cybersecurity) and NCA ECC requirements.
Respond with JSON: {
  risk_score: number (0-100, higher = more risk),
  risk_level: "low"|"medium"|"high"|"critical",
  gaps: string[], recommendations: string[],
  geopolitical_risk: string, supply_chain_risk: string,
  regulatory_alignment: {sama: boolean, nca: boolean, pdpl: boolean}
}`,
        userMessage: `Assess AI vendor:\nName: ${vendorData.vendor_name}\nType: ${vendorData.provider_type}\nData location: ${vendorData.data_location}\nCertifications: ${vendorData.certifications.join(', ')}\nSLA uptime: ${vendorData.sla_uptime || 'N/A'}%\nIncident response: ${vendorData.incident_response_hours || 'N/A'}h\nRequired region: ${requiredRegion}\nData residency compliant: ${residencyCompliant}`,
        maxTokens: 1024,
        temperature: 0.2,
        tenantId,
        agentId: 'vendor-risk-assessor',
        decisionType: 'ai_vendor_assessment',
    });
    const assessment = {
        vendor_id: `vendor_${vendorData.vendor_name.toLowerCase().replace(/\s/g, '_')}`,
        vendor_name: vendorData.vendor_name,
        risk_score: aiAssessment.risk_score,
        risk_level: aiAssessment.risk_level,
        data_residency_compliant: residencyCompliant,
        certifications: vendorData.certifications,
        gaps: aiAssessment.gaps,
        recommendations: aiAssessment.recommendations,
        sama_compliant: hasSamaCerts && residencyCompliant,
        nca_compliant: hasNcaCerts,
        assessment_date: new Date().toISOString(),
    };
    // Persist assessment
    await safeQuery(`INSERT INTO "${schema}".ai_vendor_assessments (tenant_id, vendor_name, assessment_json, risk_score, risk_level, assessed_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`, [tenantId, vendorData.vendor_name, JSON.stringify(assessment), assessment.risk_score, assessment.risk_level]).catch(catchHandler(EC.EVENT_BUS, {}));
    return assessment;
}
/**
 * List all vendor risk assessments for a tenant.
 */
export async function listAiVendorAssessments(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT vendor_name, risk_score, risk_level, assessed_at FROM "${schema}".ai_vendor_assessments ORDER BY assessed_at DESC`);
    return result.rows;
}
/**
 * Check whether a vendor should be blocked based on its latest risk assessment.
 * Returns true if the vendor's most recent assessment is "critical".
 */
export async function blockHighRiskVendor(tenantId, vendorName) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT risk_level FROM "${schema}".ai_vendor_assessments WHERE vendor_name = $1 ORDER BY assessed_at DESC LIMIT 1`, [vendorName]);
    return result.rows[0]?.risk_level === 'critical';
}
//# sourceMappingURL=ai-vendor-risk.service.js.map