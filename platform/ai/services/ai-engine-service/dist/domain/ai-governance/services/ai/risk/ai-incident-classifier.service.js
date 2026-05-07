// @ts-nocheck
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
// ============================================
// AI Incident Classifier (NCA ECC, EU AI Act Art. 62)
// Auto-classifies AI incidents and routes to escalation paths
// ============================================
import { safeQuery, tenantSchema } from '../../../ports/database.port.js';
import { emitEvent } from '../../../ports/events.port.js';
import { claudeJSON } from '../../../ports/ai.port.js';
import { SYSTEM_JOB_ACTOR } from '../../../ports/platform.port.js';
/** Escalation paths per incident type following NCA ECC guidance */
const ESCALATION_PATHS = {
    safety_hazard: ['ciso', 'responsible_ai_officer', 'board', 'nca'],
    discrimination: ['responsible_ai_officer', 'legal', 'hr', 'sdaia'],
    transparency_failure: ['responsible_ai_officer', 'compliance', 'sdaia'],
    data_breach: ['dpo', 'ciso', 'nca', 'sdaia'],
    operational_failure: ['cto', 'ops_team', 'nca'],
    hallucination: ['responsible_ai_officer', 'qa_team'],
    prompt_injection: ['ciso', 'security_team', 'nca'],
    regulatory_violation: ['compliance', 'legal', 'regulator'],
    consent_violation: ['dpo', 'legal', 'sdaia'],
    model_drift: ['responsible_ai_officer', 'ml_team'],
};
/** Mandatory notification deadlines (hours) per incident type */
const NOTIFICATION_HOURS = {
    safety_hazard: 24,
    discrimination: 72,
    data_breach: 72, // NCA ECC requirement
    prompt_injection: 24,
    regulatory_violation: 48,
    consent_violation: 72,
};
/**
 * Classify an AI incident using NCA ECC and EU AI Act Art. 62 criteria.
 * Determines severity, reportability to regulators, escalation path,
 * and auto-creates notifications for high/critical incidents.
 */
export async function classifyAiIncident(tenantId, incidentData) {
    // AI-powered classification
    const aiClassification = await claudeJSON({
        systemPrompt: `You are an AI incident classifier following NCA ECC (Saudi Cybersecurity Authority) and EU AI Act Art. 62 requirements.
Classify the incident and assess its severity. Respond with JSON:
{
  incident_type: "safety_hazard"|"discrimination"|"transparency_failure"|"data_breach"|"operational_failure"|"hallucination"|"prompt_injection"|"regulatory_violation"|"consent_violation"|"model_drift",
  severity: "low"|"medium"|"high"|"critical",
  harm_type: string,
  affected_persons_estimated: number,
  immediate_actions: string[],
  regulatory_references: string[]
}`,
        userMessage: `Classify this AI incident:\n${JSON.stringify(incidentData)}`,
        maxTokens: 1024,
        temperature: 0.1,
        tenantId,
        agentId: 'incident-classifier',
        decisionType: 'ai_incident_classification',
    });
    const incidentType = aiClassification.incident_type;
    const severity = aiClassification.severity;
    const classification = {
        incident_type: incidentType,
        severity,
        nca_reportable: ['safety_hazard', 'data_breach', 'prompt_injection', 'operational_failure'].includes(incidentType) && (severity === 'high' || severity === 'critical'),
        sama_reportable: severity === 'critical',
        sdaia_reportable: ['discrimination', 'transparency_failure', 'consent_violation'].includes(incidentType),
        eu_ai_act_reportable: ['safety_hazard', 'discrimination'].includes(incidentType) && severity !== 'low',
        mandatory_notification_hours: NOTIFICATION_HOURS[incidentType] || 168,
        affected_persons_estimated: aiClassification.affected_persons_estimated || 0,
        harm_type: aiClassification.harm_type,
        escalation_path: ESCALATION_PATHS[incidentType] || ['responsible_ai_officer'],
        immediate_actions: aiClassification.immediate_actions || [],
        regulatory_references: aiClassification.regulatory_references || [],
    };
    // Persist classification
    const schema = tenantSchema(tenantId);
    await safeQuery(`INSERT INTO "${schema}".ai_incident_classifications
     (tenant_id, incident_type, severity, classification_json, agent_id, nca_reportable, sama_reportable, sdaia_reportable, notification_deadline)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + ($9 || ' hours')::interval)`, [tenantId, incidentType, severity, JSON.stringify(classification), incidentData.agent_id || 'any',
        classification.nca_reportable, classification.sama_reportable, classification.sdaia_reportable,
        classification.mandatory_notification_hours]).catch(catchHandler(EC.EVENT_BUS, {}));
    // Emit ai_incident.reported when an AI incident is classified
    emitEvent({ tenantId, userId: SYSTEM_JOB_ACTOR, module: 'ai-governance', event: 'ai_incident.reported', entityType: 'ai_incident_classification', entityId: incidentData.agent_id || 'any', data: { incidentType, severity, ncaReportable: classification.nca_reportable, harmType: classification.harm_type } }).catch(catchHandler(EC.EVENT_BUS));
    // Auto-create notifications for critical/high incidents
    if (severity === 'critical' || severity === 'high') {
        for (const escalationTarget of classification.escalation_path.slice(0, 3)) {
            await safeQuery(`INSERT INTO "${schema}".notification_queue (tenant_id, recipient_id, notification_type, subject, body, priority, channels)
         VALUES ($1, $2, 'ai_incident', $3, $4, 'critical', ARRAY['in_app','email'])`, [tenantId, escalationTarget,
                `AI Incident [${severity.toUpperCase()}]: ${incidentType.replace(/_/g, ' ')}`,
                `${incidentData.description}\n\nImmediate actions: ${classification.immediate_actions.join('; ')}`]).catch(catchHandler(EC.EVENT_BUS, {}));
        }
    }
    return classification;
}
//# sourceMappingURL=ai-incident-classifier.service.js.map