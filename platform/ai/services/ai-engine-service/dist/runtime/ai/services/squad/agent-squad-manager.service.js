// @ts-nocheck
// ============================================================
// AGRC-OS Agent Squad Manager Service
// AI agents as first-class team members with FSM status tracking
// ============================================================
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { registerParticipant } from './unified-squad-registry.service';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';
// ── Predefined AI Agent Squad (A01–A10) ────────────────────────────────────
const PREDEFINED_AGENTS = [
    { id: 'AGENT-A01', nameEn: 'Compliance Sentinel', nameAr: 'حارس الامتثال', role: 'compliance_monitor', specialization: 'regulatory_compliance' },
    { id: 'AGENT-A02', nameEn: 'Risk Analyzer', nameAr: 'محلل المخاطر', role: 'risk_analyst', specialization: 'risk_assessment' },
    { id: 'AGENT-A03', nameEn: 'Evidence Collector', nameAr: 'جامع الأدلة', role: 'evidence_gatherer', specialization: 'evidence_management' },
    { id: 'AGENT-A04', nameEn: 'Policy Drafter', nameAr: 'صائغ السياسات', role: 'policy_writer', specialization: 'policy_lifecycle' },
    { id: 'AGENT-A05', nameEn: 'Audit Assistant', nameAr: 'مساعد التدقيق', role: 'audit_support', specialization: 'internal_audit' },
    { id: 'AGENT-A06', nameEn: 'Vendor Watchdog', nameAr: 'مراقب الموردين', role: 'vendor_monitor', specialization: 'vendor_risk' },
    { id: 'AGENT-A07', nameEn: 'Incident Responder', nameAr: 'مستجيب الحوادث', role: 'incident_handler', specialization: 'incident_response' },
    { id: 'AGENT-A08', nameEn: 'Training Coach', nameAr: 'مدرب التأهيل', role: 'training_facilitator', specialization: 'awareness_training' },
    { id: 'AGENT-A09', nameEn: 'Report Generator', nameAr: 'مولد التقارير', role: 'report_builder', specialization: 'reporting_analytics' },
    { id: 'AGENT-A10', nameEn: 'ERP Bridge Agent', nameAr: 'وكيل ربط ERP', role: 'erp_integrator', specialization: 'erp_data_sync' },
];
// ── Seed Agent Squad ───────────────────────────────────────────────────────
export async function seedAgentSquad(tenantId) {
    const results = [];
    for (const agent of PREDEFINED_AGENTS) {
        try {
            const member = await registerParticipant(tenantId, {
                userId: agent.id,
                displayNameEn: agent.nameEn,
                displayNameAr: agent.nameAr,
                role: agent.role,
                deploymentMode: 'saas',
                capabilities: [agent.specialization],
                isAgent: true,
                specialization: agent.specialization,
                deliveryChannel: 'websocket',
            });
            results.push(member);
        }
        catch (err) {
            // Idempotent — skip if already exists
            results.push({ userId: agent.id, skipped: true, reason: toErrorMessage(err) });
        }
    }
    // Initialize collaboration metrics for each agent
    const schema = tenantSchema(tenantId);
    for (const agent of PREDEFINED_AGENTS) {
        const existing = await safeQuery(`SELECT metric_id FROM "${schema}".agent_collaboration_metrics WHERE agent_user_id = $1 LIMIT 1`, [agent.id]);
        if (!existing.rows.length) {
            await safeQuery(`INSERT INTO "${schema}".agent_collaboration_metrics (agent_user_id) VALUES ($1)`, [agent.id]);
        }
    }
    return results;
}
// ── Update Agent Status (FSM enforced) ─────────────────────────────────────
export async function updateAgentStatus(tenantId, agentId, newStatus) {
    throw new Error("Not implemented: Stubbed during microservice extraction");
}
// ── Get Agent Metrics ──────────────────────────────────────────────────────
export async function getAgentMetrics(tenantId, agentId) {
    const schema = tenantSchema(tenantId);
    let sql = `SELECT * FROM "${schema}".agent_collaboration_metrics`;
    const params = [];
    if (agentId) {
        sql += ` WHERE agent_user_id = $1`;
        params.push(agentId);
    }
    sql += ` ORDER BY snapshot_at DESC`;
    const res = await safeQuery(sql, params);
    return res.rows.map((r) => ({
        metricId: r.metric_id, agentUserId: r.agent_user_id,
        suggestionsGenerated: r.suggestions_generated, suggestionsAccepted: r.suggestions_accepted,
        tasksCompleted: r.tasks_completed, avgTaskDurationMs: r.avg_task_duration_ms,
        errorCount: r.error_count, snapshotAt: r.snapshot_at?.toISOString?.() || r.snapshot_at,
    }));
}
// ── Publish Suggestion ─────────────────────────────────────────────────────
export async function publishSuggestion(tenantId, agentId, suggestion) {
    const schema = tenantSchema(tenantId);
    const res = await safeQuery(`INSERT INTO "${schema}".agent_suggestions
      (agent_user_id, target_task_id, target_user_id, suggestion_text, suggested_action, prefill_data)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING suggestion_id`, [agentId, suggestion.targetTaskId, suggestion.targetUserId, suggestion.suggestionText,
        suggestion.suggestedAction || null, suggestion.prefillData ? JSON.stringify(suggestion.prefillData) : null]);
    const suggestionId = getFirstRow(res)?.suggestion_id || suggestion.targetTaskId;
    // Update metrics
    await safeQuery(`UPDATE "${schema}".agent_collaboration_metrics SET suggestions_generated = suggestions_generated + 1, snapshot_at = NOW()
     WHERE agent_user_id = $1`, [agentId]);
    // Immutable Audit Trail
    await recordAudit({
        tenantId,
        userId: agentId,
        module: 'agent_mesh',
        action: 'agent.suggestion_published',
        entityType: 'agent_suggestion',
        entityId: suggestionId,
        afterState: suggestion,
    });
    // Publish event for real-time delivery
    await eventBus.publish({
        tenantId, eventType: 'agent.suggestion', severity: 'info',
        entityId: suggestion.targetTaskId,
        payload: { agentId, targetUserId: suggestion.targetUserId, suggestionText: suggestion.suggestionText },
    });
}
// ── Record Suggestion Outcome ──────────────────────────────────────────────
export async function recordSuggestionOutcome(tenantId, suggestionId, accepted) {
    const schema = tenantSchema(tenantId);
    const res = await safeQuery(`UPDATE "${schema}".agent_suggestions SET accepted = $1, resolved_at = NOW() WHERE suggestion_id = $2 RETURNING agent_user_id`, [accepted, suggestionId]);
    if (res.rows.length && accepted) {
        await safeQuery(`UPDATE "${schema}".agent_collaboration_metrics SET suggestions_accepted = suggestions_accepted + 1, snapshot_at = NOW()
       WHERE agent_user_id = $1`, [getFirstRow(res)?.agent_user_id]);
    }
    // Immutable Audit Trail (Human-in-the-loop tracking)
    await recordAudit({
        tenantId,
        userId: getFirstRow(res)?.agent_user_id || SYSTEM_JOB_ACTOR,
        module: 'agent_mesh',
        action: 'agent.suggestion_outcome',
        entityType: 'agent_suggestion',
        entityId: suggestionId,
        afterState: { accepted },
    });
}
// ── Publish Alert (anomaly detected) ───────────────────────────────────────
export async function publishAgentAlert(tenantId, agentId, alert) {
    throw new Error("Not implemented: Stubbed during microservice extraction");
}
//# sourceMappingURL=agent-squad-manager.service.js.map