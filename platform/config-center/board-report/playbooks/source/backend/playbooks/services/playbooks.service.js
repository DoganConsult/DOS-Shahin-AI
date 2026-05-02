"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTemplate = createTemplate;
exports.addStep = addStep;
exports.getTemplateDetailed = getTemplateDetailed;
exports.executePlaybook = executePlaybook;
exports.logExecutionStep = logExecutionStep;
exports.completeExecution = completeExecution;
// @ts-nocheck
const db_1 = require("@dos/db");
const playbooks_ports_1 = require("../ports/playbooks.ports");
// ── Template & Step Management ──
async function createTemplate(tenantId, userId, data) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".playbook_templates (name, triggering_events_json)
     VALUES ($1, $2)
     RETURNING template_id as "templateId", name, version, status, triggering_events_json as "triggeringEventsJson", created_at as "createdAt", updated_at as "updatedAt"`, [data.name, JSON.stringify(data.triggeringEventsJson || [])]);
    await (0, playbooks_ports_1.setAuditData)(tenantId, 'playbook_templates', result.rows[0].templateId, 'create', null, result.rows[0], userId);
    return result.rows[0];
}
async function addStep(tenantId, userId, templateId, data) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".playbook_steps (template_id, step_order, title, instructions_md, is_automated, required_role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING step_id as "stepId", template_id as "templateId", step_order as "stepOrder", title, instructions_md as "instructionsMd", is_automated as "isAutomated", required_role as "requiredRole", created_at as "createdAt"`, [templateId, data.stepOrder, data.title, data.instructionsMd || null, data.isAutomated || false, data.requiredRole || null]);
    await (0, playbooks_ports_1.setAuditData)(tenantId, 'playbook_steps', result.rows[0].stepId, 'create', null, result.rows[0], userId);
    return result.rows[0];
}
async function getTemplateDetailed(tenantId, templateId) {
    const result = await (0, db_1.safeQuery)("SELECT * FROM __TENANT_SCHEMA__.playbooks_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
// ── Execution Workflow ──
async function executePlaybook(tenantId, userId, templateId, triggerSourceEntity) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".playbook_executions (template_id, trigger_source_entity)
     VALUES ($1, $2)
     RETURNING execution_id as "executionId", template_id as "templateId", trigger_source_entity as "triggerSourceEntity", status, started_at as "startedAt", completed_at as "completedAt", updated_at as "updatedAt"`, [templateId, triggerSourceEntity || null]);
    await (0, playbooks_ports_1.setAuditData)(tenantId, 'playbook_executions', result.rows[0].executionId, 'execute', null, result.rows[0], userId);
    return result.rows[0];
}
async function logExecutionStep(tenantId, executionId, userId, data) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".playbook_execution_logs (execution_id, step_id, acted_by_user_id, result_data)
     VALUES ($1, $2, $3, $4)
     RETURNING log_id as "logId", execution_id as "executionId", step_id as "stepId", acted_by_user_id as "actedByUserId", result_data as "resultData", created_at as "createdAt"`, [executionId, data.stepId, userId, JSON.stringify(data.resultData || {})]);
    await (0, db_1.safeQuery)(`UPDATE "${schema}".playbook_executions SET updated_at = NOW() WHERE execution_id = $1`, [executionId]);
    await (0, playbooks_ports_1.setAuditData)(tenantId, 'playbook_execution_logs', result.rows[0].logId, 'log_step', null, result.rows[0], userId);
    return result.rows[0];
}
async function completeExecution(tenantId, executionId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const existing = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".playbook_executions WHERE execution_id = $1`, [executionId]);
    await (0, db_1.safeQuery)(`UPDATE "${schema}".playbook_executions SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE execution_id = $1`, [executionId]);
    await (0, playbooks_ports_1.setAuditData)(tenantId, 'playbook_executions', executionId, 'complete', existing.rows[0], null, userId);
}
//# sourceMappingURL=playbooks.service.js.map