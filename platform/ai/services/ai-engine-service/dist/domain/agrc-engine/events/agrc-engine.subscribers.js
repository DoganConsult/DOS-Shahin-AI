/**
 * AgrcEngine Module — Event Subscribers
 *
 * Bidirectional integration: subscribes to cross-module events to maintain
 * module state consistency and trigger domain-specific reactions.
 *
 * Law 12: All event-driven actions are auditable.
 * Law 2: Consumes events via DOS event bus, does not own other modules' truth.
 */
import { safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';
import { eventBus, emitEvent } from '../ports/events.port';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
// ── Consumed Events ──────────────────────────────────────────────
const _CONSUMED_EVENTS = [
    'risk.assessment_completed',
    'compliance.assessment_completed',
    'incident.created',
    'audit.status_changed',
    'governance.decision_made',
    'workflow.task.completed',
    'ai.agent.completed',
    'ai.delegation.action_executed',
];
// ── Handlers ─────────────────────────────────────────────────────
async function handle_risk_assessment_completed(event) {
    const tenantId = event.tenantId;
    if (!tenantId)
        return;
    const schema = tenantSchema(tenantId);
    try {
        logger.info('[AgrcEngine] Processing risk.assessment_completed', {
            tenantId,
            entityId: event.payload?.entityId || event.entityId,
            source: 'risk',
        });
        // Record cross-module event for agrc-engine domain awareness
        await safeQuery(`INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'agrc-engine', 'event_received', 'risk_assessment_completed',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`, [tenantId, event.payload?.entityId || event.entityId || 'unknown',
            JSON.stringify({ sourceEvent: 'risk.assessment_completed', sourceModule: 'risk', receivedAt: new Date().toISOString() })]).catch(catchHandler(EC.EVENT_BUS));
        // Emit acknowledgment event for bidirectional traceability
        await emitEvent({
            tenantId,
            userId: SYSTEM_JOB_ACTOR,
            module: 'agrc-engine',
            event: 'agrc_engine.assessment_completed_processed',
            entityType: 'risk_event',
            entityId: event.payload?.entityId || event.entityId || 'unknown',
            data: { sourceEvent: 'risk.assessment_completed', processedAt: new Date().toISOString() },
        }).catch(catchHandler(EC.EVENT_BUS));
    }
    catch (err) {
        logger.warn('[AgrcEngine] Failed to process risk.assessment_completed', {
            tenantId,
            error: err instanceof Error ? err.message : String(err),
        });
    }
}
async function handle_compliance_assessment_completed(event) {
    const tenantId = event.tenantId;
    if (!tenantId)
        return;
    const schema = tenantSchema(tenantId);
    try {
        logger.info('[AgrcEngine] Processing compliance.assessment_completed', {
            tenantId,
            entityId: event.payload?.entityId || event.entityId,
            source: 'compliance',
        });
        // Record cross-module event for agrc-engine domain awareness
        await safeQuery(`INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'agrc-engine', 'event_received', 'compliance_assessment_completed',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`, [tenantId, event.payload?.entityId || event.entityId || 'unknown',
            JSON.stringify({ sourceEvent: 'compliance.assessment_completed', sourceModule: 'compliance', receivedAt: new Date().toISOString() })]).catch(catchHandler(EC.EVENT_BUS));
        // Emit acknowledgment event for bidirectional traceability
        await emitEvent({
            tenantId,
            userId: SYSTEM_JOB_ACTOR,
            module: 'agrc-engine',
            event: 'agrc_engine.assessment_completed_processed',
            entityType: 'compliance_event',
            entityId: event.payload?.entityId || event.entityId || 'unknown',
            data: { sourceEvent: 'compliance.assessment_completed', processedAt: new Date().toISOString() },
        }).catch(catchHandler(EC.EVENT_BUS));
    }
    catch (err) {
        logger.warn('[AgrcEngine] Failed to process compliance.assessment_completed', {
            tenantId,
            error: err instanceof Error ? err.message : String(err),
        });
    }
}
async function handle_incident_created(event) {
    const tenantId = event.tenantId;
    if (!tenantId)
        return;
    const schema = tenantSchema(tenantId);
    try {
        logger.info('[AgrcEngine] Processing incident.created', {
            tenantId,
            entityId: event.payload?.entityId || event.entityId,
            source: 'incident',
        });
        // Record cross-module event for agrc-engine domain awareness
        await safeQuery(`INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'agrc-engine', 'event_received', 'incident_created',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`, [tenantId, event.payload?.entityId || event.entityId || 'unknown',
            JSON.stringify({ sourceEvent: 'incident.created', sourceModule: 'incident', receivedAt: new Date().toISOString() })]).catch(catchHandler(EC.EVENT_BUS));
        // Emit acknowledgment event for bidirectional traceability
        await emitEvent({
            tenantId,
            userId: SYSTEM_JOB_ACTOR,
            module: 'agrc-engine',
            event: 'agrc_engine.created_processed',
            entityType: 'incident_event',
            entityId: event.payload?.entityId || event.entityId || 'unknown',
            data: { sourceEvent: 'incident.created', processedAt: new Date().toISOString() },
        }).catch(catchHandler(EC.EVENT_BUS));
    }
    catch (err) {
        logger.warn('[AgrcEngine] Failed to process incident.created', {
            tenantId,
            error: err instanceof Error ? err.message : String(err),
        });
    }
}
async function handle_audit_status_changed(event) {
    const tenantId = event.tenantId;
    if (!tenantId)
        return;
    const schema = tenantSchema(tenantId);
    try {
        logger.info('[AgrcEngine] Processing audit.status_changed', {
            tenantId,
            entityId: event.payload?.entityId || event.entityId,
            source: 'audit',
        });
        // Record cross-module event for agrc-engine domain awareness
        await safeQuery(`INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'agrc-engine', 'event_received', 'audit_status_changed',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`, [tenantId, event.payload?.entityId || event.entityId || 'unknown',
            JSON.stringify({ sourceEvent: 'audit.status_changed', sourceModule: 'audit', receivedAt: new Date().toISOString() })]).catch(catchHandler(EC.EVENT_BUS));
        // Emit acknowledgment event for bidirectional traceability
        await emitEvent({
            tenantId,
            userId: SYSTEM_JOB_ACTOR,
            module: 'agrc-engine',
            event: 'agrc_engine.status_changed_processed',
            entityType: 'audit_event',
            entityId: event.payload?.entityId || event.entityId || 'unknown',
            data: { sourceEvent: 'audit.status_changed', processedAt: new Date().toISOString() },
        }).catch(catchHandler(EC.EVENT_BUS));
    }
    catch (err) {
        logger.warn('[AgrcEngine] Failed to process audit.status_changed', {
            tenantId,
            error: err instanceof Error ? err.message : String(err),
        });
    }
}
async function handle_governance_decision_made(event) {
    const tenantId = event.tenantId;
    if (!tenantId)
        return;
    const schema = tenantSchema(tenantId);
    try {
        logger.info('[AgrcEngine] Processing governance.decision_made', {
            tenantId,
            entityId: event.payload?.entityId || event.entityId,
            source: 'governance',
        });
        // Record cross-module event for agrc-engine domain awareness
        await safeQuery(`INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'agrc-engine', 'event_received', 'governance_decision_made',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`, [tenantId, event.payload?.entityId || event.entityId || 'unknown',
            JSON.stringify({ sourceEvent: 'governance.decision_made', sourceModule: 'governance', receivedAt: new Date().toISOString() })]).catch(catchHandler(EC.EVENT_BUS));
        // Emit acknowledgment event for bidirectional traceability
        await emitEvent({
            tenantId,
            userId: SYSTEM_JOB_ACTOR,
            module: 'agrc-engine',
            event: 'agrc_engine.decision_made_processed',
            entityType: 'governance_event',
            entityId: event.payload?.entityId || event.entityId || 'unknown',
            data: { sourceEvent: 'governance.decision_made', processedAt: new Date().toISOString() },
        }).catch(catchHandler(EC.EVENT_BUS));
    }
    catch (err) {
        logger.warn('[AgrcEngine] Failed to process governance.decision_made', {
            tenantId,
            error: err instanceof Error ? err.message : String(err),
        });
    }
}
async function handle_workflow_task_completed(event) {
    const tenantId = event.tenantId;
    if (!tenantId)
        return;
    const schema = tenantSchema(tenantId);
    try {
        logger.info('[AgrcEngine] Processing workflow.task.completed', {
            tenantId,
            entityId: event.payload?.entityId || event.entityId,
            source: 'workflow',
        });
        // Record cross-module event for agrc-engine domain awareness
        await safeQuery(`INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'agrc-engine', 'event_received', 'workflow_task.completed',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`, [tenantId, event.payload?.entityId || event.entityId || 'unknown',
            JSON.stringify({ sourceEvent: 'workflow.task.completed', sourceModule: 'workflow', receivedAt: new Date().toISOString() })]).catch(catchHandler(EC.EVENT_BUS));
        // Emit acknowledgment event for bidirectional traceability
        await emitEvent({
            tenantId,
            userId: SYSTEM_JOB_ACTOR,
            module: 'agrc-engine',
            event: 'agrc_engine.task.completed_processed',
            entityType: 'workflow_event',
            entityId: event.payload?.entityId || event.entityId || 'unknown',
            data: { sourceEvent: 'workflow.task.completed', processedAt: new Date().toISOString() },
        }).catch(catchHandler(EC.EVENT_BUS));
    }
    catch (err) {
        logger.warn('[AgrcEngine] Failed to process workflow.task.completed', {
            tenantId,
            error: err instanceof Error ? err.message : String(err),
        });
    }
}
async function handle_ai_agent_completed(event) {
    const tenantId = event.tenantId;
    if (!tenantId)
        return;
    const schema = tenantSchema(tenantId);
    try {
        logger.info('[AgrcEngine] Processing ai.agent.completed', {
            tenantId,
            entityId: event.payload?.entityId || event.entityId,
            source: 'ai',
        });
        // Record cross-module event for agrc-engine domain awareness
        await safeQuery(`INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'agrc-engine', 'event_received', 'ai_agent.completed',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`, [tenantId, event.payload?.entityId || event.entityId || 'unknown',
            JSON.stringify({ sourceEvent: 'ai.agent.completed', sourceModule: 'ai', receivedAt: new Date().toISOString() })]).catch(catchHandler(EC.EVENT_BUS));
        // Emit acknowledgment event for bidirectional traceability
        await emitEvent({
            tenantId,
            userId: SYSTEM_JOB_ACTOR,
            module: 'agrc-engine',
            event: 'agrc_engine.agent.completed_processed',
            entityType: 'ai_event',
            entityId: event.payload?.entityId || event.entityId || 'unknown',
            data: { sourceEvent: 'ai.agent.completed', processedAt: new Date().toISOString() },
        }).catch(catchHandler(EC.EVENT_BUS));
    }
    catch (err) {
        logger.warn('[AgrcEngine] Failed to process ai.agent.completed', {
            tenantId,
            error: err instanceof Error ? err.message : String(err),
        });
    }
}
async function handle_ai_delegation_executed(event) {
    const tenantId = event.tenantId;
    if (!tenantId)
        return;
    const schema = tenantSchema(tenantId);
    try {
        logger.info('[AgrcEngine] Processing ai.delegation.action_executed', {
            tenantId,
            entityId: event.payload?.entityId || event.entityId,
            source: 'ai_engine',
        });
        // Record cross-module event for agrc-engine domain awareness
        await safeQuery(`INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'agrc-engine', 'event_received', 'ai_delegation.executed',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`, [tenantId, event.payload?.entityId || event.entityId || 'unknown',
            JSON.stringify({ sourceEvent: 'ai.delegation.action_executed', sourceModule: 'ai_engine', receivedAt: new Date().toISOString() })]).catch(catchHandler(EC.EVENT_BUS));
        // Emit acknowledgment event for bidirectional traceability
        await emitEvent({
            tenantId,
            userId: SYSTEM_JOB_ACTOR,
            module: 'agrc-engine',
            event: 'agrc_engine.delegation.executed_processed',
            entityType: 'ai_event',
            entityId: event.payload?.entityId || event.entityId || 'unknown',
            data: { sourceEvent: 'ai.delegation.action_executed', processedAt: new Date().toISOString() },
        }).catch(catchHandler(EC.EVENT_BUS));
    }
    catch (err) {
        logger.warn('[AgrcEngine] Failed to process ai.delegation.action_executed', {
            tenantId,
            error: err instanceof Error ? err.message : String(err),
        });
    }
}
// ── Registration ─────────────────────────────────────────────────
/**
 * Register all event subscribers for the agrc-engine module.
 * Called during server startup from agrc-event-subscribers.ts.
 */
export function registerAgrcEngineEventSubscribers() {
    const handlers = {
        'risk.assessment_completed': handle_risk_assessment_completed,
        'compliance.assessment_completed': handle_compliance_assessment_completed,
        'incident.created': handle_incident_created,
        'audit.status_changed': handle_audit_status_changed,
        'governance.decision_made': handle_governance_decision_made,
        'workflow.task.completed': handle_workflow_task_completed,
        'ai.agent.completed': handle_ai_agent_completed,
        'ai.delegation.action_executed': handle_ai_delegation_executed,
    };
    for (const [eventName, handler] of Object.entries(handlers)) {
        try {
            eventBus.subscribe(eventName, `agrc-engine:${eventName}`, handler);
        }
        catch {
            // Event type may not be registered yet — non-fatal
        }
    }
    logger.info('[AgrcEngine] Registered ${Object.keys(handlers).length} event subscribers');
}
//# sourceMappingURL=agrc-engine.subscribers.js.map