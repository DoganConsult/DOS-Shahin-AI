"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptionHandlers = getSubscriptionHandlers;
exports.subscribeAll = subscribeAll;
exports.registerRecordsEventSubscribers = registerRecordsEventSubscribers;
const logger_port_1 = require("../ports/logger.port");
const database_port_1 = require("../ports/database.port");
const lifecycle_port_1 = require("../ports/lifecycle.port");
const events_port_1 = require("../ports/events.port");
const records_events_1 = require("./records.events");
const handlers = new Map();
async function handleCompliancePostureChanged(event) {
    const { tenantId, payload } = event;
    if (!tenantId || !payload)
        return;
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const newPosture = payload.newPosture;
    if (newPosture === 'non_compliant') {
        const activeRecords = await (0, database_port_1.safeQuery)(`SELECT record_id FROM "${schema}".records WHERE status = 'active' AND classification = 'regulatory' LIMIT 50`, []);
        if (activeRecords.rows.length > 0) {
            await (0, lifecycle_port_1.createProcessTask)(tenantId, {
                title: `Records: Compliance posture degraded — review regulatory records`,
                description: `Compliance posture is non-compliant. Review ${activeRecords.rows.length} active regulatory records for retention policy compliance.`,
                taskType: 'records_review',
                priority: 'high',
                entityType: 'compliance_posture',
                entityId: payload.frameworkCode || 'general',
                triggerSource: 'compliance.posture_changed',
            });
        }
    }
}
async function handlePolicyApproved(event) {
    const { tenantId, payload } = event;
    if (!tenantId || !payload)
        return;
    const policyId = payload.entityId;
    const policyTitle = payload.title || 'Updated policy';
    await (0, lifecycle_port_1.createProcessTask)(tenantId, {
        title: `Records: Policy approved — update retention schedules`,
        description: `Policy "${policyTitle}" has been approved. Review and update record retention schedules that reference this policy.`,
        taskType: 'records_retention_review',
        priority: 'medium',
        entityType: 'policy',
        entityId: policyId,
        triggerSource: 'policy.approved',
    });
}
async function handleAuditEngagementCompleted(event) {
    const { tenantId, payload } = event;
    if (!tenantId || !payload)
        return;
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const engagementId = payload.entityId;
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".records
     SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{last_audit_engagement}', $1::jsonb),
         updated_at = NOW()
     WHERE classification = 'audit' AND status = 'active'`, [JSON.stringify(engagementId)]);
    await (0, lifecycle_port_1.createProcessTask)(tenantId, {
        title: `Records: Audit engagement completed — archive audit workpapers`,
        description: `Audit engagement has been completed. Classify and archive related audit workpapers and evidence records.`,
        taskType: 'records_archival',
        priority: 'medium',
        entityType: 'audit_engagement',
        entityId: engagementId,
        triggerSource: 'audit.engagement_completed',
    });
}
async function handleWorkflowStatusChanged(event) {
    const { tenantId, payload } = event;
    if (!tenantId || !payload)
        return;
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const entityType = payload.entityType;
    const entityId = payload.entityId;
    const newStatus = payload.newState || payload.status;
    if (!entityType?.startsWith('record') || !entityId || !newStatus)
        return;
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".records SET status = $1, updated_at = NOW() WHERE record_id = $2 AND status != $1`, [newStatus, entityId]);
}
function wrapHandler(name, fn) {
    return async (payload) => {
        const event = payload;
        try {
            await fn(event);
            logger_port_1.logger.info(`[records] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
        }
        catch (err) {
            logger_port_1.logger.error(`[records] handler ${name} failed: ${err.message}`, { tenantId: event.tenantId });
        }
    };
}
handlers.set('compliance.posture_changed', wrapHandler('handleCompliancePostureChanged', handleCompliancePostureChanged));
handlers.set('policy.approved', wrapHandler('handlePolicyApproved', handlePolicyApproved));
handlers.set('audit.engagement_completed', wrapHandler('handleAuditEngagementCompleted', handleAuditEngagementCompleted));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));
function getSubscriptionHandlers() {
    return handlers;
}
function subscribeAll(bus) {
    for (const [event, handler] of handlers) {
        bus.on(event, handler);
    }
    logger_port_1.logger.info(`[${records_events_1.RECORDS_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}
function registerRecordsEventSubscribers() {
    for (const [eventName, handler] of handlers) {
        events_port_1.eventBus.subscribe(eventName, `records:${eventName}`, async (event) => {
            await handler(event);
        });
    }
    logger_port_1.logger.info(`[records] registered ${handlers.size} domain event subscribers`);
}
//# sourceMappingURL=records.subscribers.js.map