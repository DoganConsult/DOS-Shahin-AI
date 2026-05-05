import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus } from '../ports/events.port';
import { AI_GOVERNANCE_EVENT_CONTRACT } from './ai-governance.events';
import { registerNavigationIntegration } from '@dos/platform-core/shell/navigation/navigation-integration';
const handlers = new Map();
async function handleCompliancePostureChanged(event) {
    const { tenantId, payload } = event;
    if (!tenantId)
        return;
    const schema = tenantSchema(tenantId);
    const newPosture = payload.newPosture || payload.posture;
    if (newPosture === 'non_compliant' || newPosture === 'at_risk') {
        const deployedSystems = await safeQuery(`SELECT id, name FROM "${schema}".ai_system_registry WHERE status = 'deployed' OR status = 'monitoring'`, []);
        for (const sys of deployedSystems.rows) {
            await createProcessTask(tenantId, {
                title: `AI Governance: Compliance posture degraded — review AI system "${sys.name || sys.id}"`,
                description: `Compliance posture changed to ${newPosture}. Review deployed AI systems for regulatory alignment.`,
                taskType: 'ai_governance_review',
                priority: newPosture === 'non_compliant' ? 'high' : 'medium',
                entityType: 'ai_system',
                entityId: sys.id,
                triggerSource: 'compliance.posture_changed',
            });
        }
    }
}
async function handleRiskScoreChanged(event) {
    const { tenantId, payload } = event;
    if (!tenantId)
        return;
    const schema = tenantSchema(tenantId);
    const riskId = payload.entityId || payload.riskId;
    const newScore = payload.newScore || payload.score;
    if ((newScore ?? 0) >= 15) {
        const linkedSystems = await safeQuery(`SELECT id, name FROM "${schema}".ai_system_registry
       WHERE metadata->>'linked_risk_id' = $1 OR risk_tier = 'high'
       LIMIT 10`, [riskId]);
        for (const sys of linkedSystems.rows) {
            await createProcessTask(tenantId, {
                title: `AI Governance: Risk score elevated for linked AI system`,
                description: `Risk score has reached ${newScore}. Review AI system "${sys.name || sys.id}" risk classification and controls.`,
                taskType: 'ai_governance_review',
                priority: 'high',
                entityType: 'ai_system',
                entityId: sys.id,
                triggerSource: 'risk.score_changed',
            });
        }
    }
}
async function handleAuditFindingCreated(event) {
    const { tenantId, payload } = event;
    if (!tenantId)
        return;
    const findingId = payload.entityId || payload.findingId;
    const severity = payload.severity || 'medium';
    await createProcessTask(tenantId, {
        title: `AI Governance: Audit finding may affect AI systems`,
        description: `An audit finding (${severity}) has been raised. Evaluate whether AI systems in scope require re-assessment.`,
        taskType: 'ai_governance_review',
        priority: severity === 'critical' ? 'critical' : 'high',
        entityType: 'audit_finding',
        entityId: findingId,
        triggerSource: 'audit.finding_created',
    });
}
async function handleWorkflowStatusChanged(event) {
    const { tenantId, payload } = event;
    if (!tenantId)
        return;
    const schema = tenantSchema(tenantId);
    const entityType = payload.entityType;
    const entityId = payload.entityId;
    const newStatus = payload.newState || payload.status;
    if (!entityType?.startsWith('ai_governance') && !entityType?.startsWith('ai-governance'))
        return;
    if (!entityId || !newStatus)
        return;
    await safeQuery(`UPDATE "${schema}".ai_system_registry SET status = $1, updated_at = NOW() WHERE id = $2 AND status != $1`, [newStatus, entityId]);
}
function wrapHandler(name, fn) {
    return async (payload) => {
        const event = payload;
        try {
            await fn(event);
            logger.info(`[ai-governance] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
        }
        catch (err) {
            logger.error(`[ai-governance] handler ${name} failed: ${err.message}`, { tenantId: event.tenantId });
        }
    };
}
handlers.set('compliance.posture_changed', wrapHandler('handleCompliancePostureChanged', handleCompliancePostureChanged));
handlers.set('risk.score_changed', wrapHandler('handleRiskScoreChanged', handleRiskScoreChanged));
handlers.set('audit.finding_created', wrapHandler('handleAuditFindingCreated', handleAuditFindingCreated));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));
export function getSubscriptionHandlers() {
    return handlers;
}
export function subscribeAll(bus) {
    for (const [event, handler] of handlers) {
        bus.on(event, handler);
    }
    logger.info(`[${AI_GOVERNANCE_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}
export function registerAiGovernanceEventSubscribers() {
    for (const [eventName, handler] of handlers) {
        eventBus.subscribe(eventName, `ai-governance:${eventName}`, async (event) => {
            await handler(event);
        });
    }
    logger.info(`[ai-governance] registered ${handlers.size} domain event subscribers`);
    registerNavigationIntegration('ai-governance');
}
//# sourceMappingURL=ai-governance.subscribers.js.map