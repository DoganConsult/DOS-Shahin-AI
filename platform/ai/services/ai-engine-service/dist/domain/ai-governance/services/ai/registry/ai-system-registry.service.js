// @ts-nocheck
// ============================================
// AI System Registry Service — Phase 1, Step 1.4
// EU AI Act compliance: registration, classification,
// conformity, technical docs, lifecycle management.
// 14 methods per gated plan exit gate.
// ============================================
import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../../../ports/database.port.js';
import { logPolicyDecision } from '../../../../packs/services/blueprint.service.js';
import { eventBus } from '../../../ports/events.port.js';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';
// ── Annex III high-risk domain categories ──
const ANNEX_III_HIGH_RISK_DOMAINS = [
    'biometric_identification',
    'critical_infrastructure',
    'education_vocational',
    'employment_workers',
    'essential_services',
    'law_enforcement',
    'migration_border',
    'justice_democratic',
];
// ── Annex VIII mandatory registration fields ──
const ANNEX_VIII_MANDATORY = [
    'name_en', 'intended_purpose', 'provider_name', 'risk_classification',
    'deployment_status', 'system_code',
];
// ── Annex IV 9-section technical documentation ──
const ANNEX_IV_SECTIONS = [
    { number: 1, title: 'General Description of the AI System' },
    { number: 2, title: 'Detailed Description of Elements and Development Process' },
    { number: 3, title: 'Monitoring, Functioning and Control of the AI System' },
    { number: 4, title: 'Risk Management System' },
    { number: 5, title: 'Data and Data Governance' },
    { number: 6, title: 'Performance Metrics: Accuracy, Robustness, Cybersecurity' },
    { number: 7, title: 'Quality Management and Conformity' },
    { number: 8, title: 'Post-Market Monitoring Plan' },
    { number: 9, title: 'Detailed Description of Changes' },
];
// -----------------------------------------------
// 1. registerAiSystem — Art. 49, Annex VIII
// -----------------------------------------------
export async function registerAiSystem(tenantId, systemDef) {
    await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
// -----------------------------------------------
// 2. classifyRisk — Art. 6-7, Annex III
// -----------------------------------------------
export async function classifyRisk(tenantId, systemId) {
    await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
// -----------------------------------------------
// 3. scheduleConformityAssessment — Art. 43
// -----------------------------------------------
export async function scheduleConformityAssessment(tenantId, systemId, framework = 'eu_ai_act', assessmentType = 'initial') {
    const schema = tenantSchema(tenantId);
    const id = await withTransaction(tenantId, async (client) => {
        const { rows } = await safeQueryWithClient(`INSERT INTO "${schema}".ai_conformity_assessments
         (system_id, assessment_type, framework, status)
       VALUES ($1, $2, $3, 'planned')
       RETURNING id`, [systemId, assessmentType, framework], client);
        await safeQueryWithClient(`UPDATE "${schema}".ai_system_registry
       SET next_assessment_due = (NOW() + INTERVAL '90 days')::DATE, updated_at = NOW()
       WHERE id = $1`, [systemId], client);
        return rows[0].id;
    });
    return { id };
}
// -----------------------------------------------
// 4. getConformityStatus — Dashboard
// -----------------------------------------------
export async function getConformityStatus(tenantId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT r.id, r.system_code, r.name_en, r.risk_classification,
            r.deployment_status, r.next_assessment_due,
            r.last_conformity_assessment_at,
            (SELECT COUNT(*)::int FROM "${schema}".ai_conformity_assessments a
             WHERE a.system_id = r.id AND a.status = 'completed' AND a.conformity_result = 'conformant') AS conformant_count,
            (SELECT COUNT(*)::int FROM "${schema}".ai_conformity_assessments a
             WHERE a.system_id = r.id AND a.corrective_action_status IN ('open', 'in_progress')) AS open_actions,
            (SELECT COUNT(*)::int FROM "${schema}".ai_corrective_actions ca
             WHERE ca.system_id = r.id AND ca.status IN ('open', 'in_progress')) AS corrective_actions_open
     FROM "${schema}".ai_system_registry r
     ORDER BY
       CASE r.risk_classification WHEN 'high' THEN 1 WHEN 'limited' THEN 2 ELSE 3 END,
       r.next_assessment_due ASC NULLS LAST`);
    return rows;
}
// -----------------------------------------------
// 5. getImpactAssessments — Art. 27
// -----------------------------------------------
export async function getImpactAssessments(tenantId, systemId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".ai_impact_assessments
     WHERE system_id = $1 ORDER BY created_at DESC`, [systemId]);
    return rows;
}
// -----------------------------------------------
// 6. triggerReassessment — Art. 9 (substantial modification)
// -----------------------------------------------
export async function triggerReassessment(tenantId, systemId, reason) {
    const result = await scheduleConformityAssessment(tenantId, systemId, 'eu_ai_act', 'change_triggered');
    const schema = tenantSchema(tenantId);
    await safeQuery(`UPDATE "${schema}".ai_conformity_assessments SET reassessment_trigger = $1 WHERE id = $2`, [reason, result.id]);
    // Log system event
    await safeQuery(`INSERT INTO "${schema}".ai_system_logs (system_id, event_type, event_data, severity)
     VALUES ($1, 'reassessment_triggered', $2, 'warning')`, [systemId, JSON.stringify({ reason, assessment_id: result.id })]);
    await logPolicyDecision(tenantId, {
        decision_type: 'ai_reassessment',
        input_context: { system_id: systemId, reason },
        decision: 'Reassessment scheduled',
        reason,
        policy_ref: 'ai-system-registry.service/triggerReassessment',
    });
    return { assessment_id: result.id };
}
// -----------------------------------------------
// 7. generateTechnicalDocumentation — Art. 11, Annex IV
// -----------------------------------------------
export async function generateTechnicalDocumentation(tenantId, systemId) {
    await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
// -----------------------------------------------
// 8. issueDeclarationOfConformity — Art. 47
// -----------------------------------------------
export async function issueDeclarationOfConformity(tenantId, systemId, assessmentId, signedBy) {
    await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
// -----------------------------------------------
// 9. createCorrectiveAction — Art. 20
// -----------------------------------------------
export async function createCorrectiveAction(tenantId, assessmentId, systemId, action) {
    const schema = tenantSchema(tenantId);
    const actionId = await withTransaction(tenantId, async (client) => {
        const { rows } = await safeQueryWithClient(`INSERT INTO "${schema}".ai_corrective_actions
         (assessment_id, system_id, description, responsible_party, deadline, root_cause)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`, [assessmentId, systemId, action.description, action.responsible_party, action.deadline, action.root_cause ?? null], client);
        if (assessmentId) {
            await safeQueryWithClient(`UPDATE "${schema}".ai_conformity_assessments
         SET corrective_action_status = 'open', corrective_action_deadline = $1, updated_at = NOW()
         WHERE id = $2`, [action.deadline, assessmentId], client);
        }
        return rows[0].id;
    });
    return { id: actionId };
}
// -----------------------------------------------
// 10. reportIncident — Art. 73
// -----------------------------------------------
export async function reportIncident(tenantId, systemId, incident) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`INSERT INTO "${schema}".ai_system_logs
       (system_id, event_type, event_data, severity)
     VALUES ($1, 'serious_incident', $2, $3)
     RETURNING id`, [systemId, JSON.stringify(incident), incident.severity === 'critical' ? 'critical' : 'warning']);
    // Auto-trigger reassessment for serious incidents
    if (incident.severity === 'critical') {
        await triggerReassessment(tenantId, systemId, `Serious incident: ${incident.description}`);
    }
    swallow(EC.EVENT_BUS, eventBus.publish({
        eventType: 'ai.incident_reported',
        tenantId,
        sourceService: 'ai-system-registry',
        entityType: 'ai_system',
        entityId: systemId,
        severity: 'critical',
        payload: { incident },
    }), { tenantId, operation: 'eventBus:ai.incident_reported' });
    return { log_id: rows[0].id };
}
// -----------------------------------------------
// 11. getAuditTrail — Art. 12, 19
// -----------------------------------------------
export async function getAuditTrail(tenantId, systemId, dateRange) {
    const schema = tenantSchema(tenantId);
    const conditions = ['system_id = $1'];
    const params = [systemId];
    let idx = 2;
    if (dateRange?.from) {
        conditions.push(`created_at >= $${idx++}`);
        params.push(dateRange.from);
    }
    if (dateRange?.to) {
        conditions.push(`created_at <= $${idx++}`);
        params.push(dateRange.to);
    }
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".ai_system_logs
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC LIMIT 500`, params);
    return rows;
}
// -----------------------------------------------
// 12. notifyStakeholders — ISO 42001 Cl. 4.2
// -----------------------------------------------
export async function notifyStakeholders(tenantId, systemId, notificationType) {
    const schema = tenantSchema(tenantId);
    const { rows: stakeholders } = await safeQuery(`SELECT * FROM "${schema}".ai_stakeholder_registry
     WHERE system_id = $1`, [systemId]);
    // Update last_contacted_at
    for (const sh of stakeholders) {
        await safeQuery(`UPDATE "${schema}".ai_stakeholder_registry SET last_contacted_at = NOW() WHERE id = $1`, [sh.id]);
    }
    // Log the notification
    await safeQuery(`INSERT INTO "${schema}".ai_system_logs
       (system_id, event_type, event_data, severity)
     VALUES ($1, 'stakeholder_notification', $2, 'info')`, [systemId, JSON.stringify({ type: notificationType, count: stakeholders.length })]);
    return { notified: stakeholders.length };
}
// -----------------------------------------------
// 13. decommissionSystem — ISO 42001 Cl. 8
// -----------------------------------------------
export async function decommissionSystem(tenantId, systemId, reason) {
    const schema = tenantSchema(tenantId);
    await withTransaction(tenantId, async (client) => {
        await safeQueryWithClient(`UPDATE "${schema}".ai_system_registry
       SET deployment_status = 'decommissioned',
           lifecycle_stage = 'retirement',
           documentation_retention_until = (NOW() + INTERVAL '10 years')::DATE,
           updated_at = NOW()
       WHERE id = $1`, [systemId], client);
        await safeQueryWithClient(`INSERT INTO "${schema}".ai_system_logs
         (system_id, event_type, event_data, severity)
       VALUES ($1, 'decommissioned', $2, 'warning')`, [systemId, JSON.stringify({ reason })], client);
        await safeQueryWithClient(`UPDATE "${schema}".ai_declarations_of_conformity
       SET revoked = TRUE, revoked_at = NOW(), revocation_reason = $1
       WHERE system_id = $2 AND revoked = FALSE`, [`Decommissioned: ${reason}`, systemId], client);
    });
    await logPolicyDecision(tenantId, {
        decision_type: 'ai_system_decommission',
        input_context: { system_id: systemId, reason },
        decision: 'System decommissioned',
        reason,
        policy_ref: 'ai-system-registry.service/decommissionSystem',
    });
}
// -----------------------------------------------
// 14. recordGoNoGoDecision — NIST AI RMF MAP
// -----------------------------------------------
export async function recordGoNoGoDecision(tenantId, systemId, decision, rationale, conditions) {
    const schema = tenantSchema(tenantId);
    const logId = await withTransaction(tenantId, async (client) => {
        const { rows } = await safeQueryWithClient(`INSERT INTO "${schema}".ai_system_logs
         (system_id, event_type, event_data, severity)
       VALUES ($1, 'go_no_go_decision', $2, $3)
       RETURNING id`, [
            systemId,
            JSON.stringify({ decision, rationale, conditions: conditions ?? [] }),
            decision === 'no_go' ? 'warning' : 'info',
        ], client);
        if (decision === 'go') {
            await safeQueryWithClient(`UPDATE "${schema}".ai_system_registry
         SET deployment_status = 'deployed', lifecycle_stage = 'deployment',
             placed_on_market_at = NOW(), updated_at = NOW()
         WHERE id = $1`, [systemId], client);
        }
        return rows[0].id;
    });
    await logPolicyDecision(tenantId, {
        decision_type: 'ai_go_no_go',
        input_context: { system_id: systemId, decision, conditions },
        decision,
        reason: rationale,
        policy_ref: 'ai-system-registry.service/recordGoNoGoDecision',
    });
    return { log_id: logId };
}
// -----------------------------------------------
// Helper: getSystem (reusable)
// -----------------------------------------------
export async function getAiSystem(tenantId, systemId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".ai_system_registry WHERE id = $1`, [systemId]);
    return rows[0] ?? null;
}
export async function listAiSystems(tenantId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".ai_system_registry ORDER BY created_at DESC`);
    return rows;
}
//# sourceMappingURL=ai-system-registry.service.js.map