"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuthorizationAudit = logAuthorizationAudit;
exports.getAuthorizationAuditLog = getAuthorizationAuditLog;
exports.logDecision = logDecision;
exports.logMismatch = logMismatch;
exports.getMismatches = getMismatches;
exports.listAuthorizationPermissions = listAuthorizationPermissions;
exports.logGuardDecision = logGuardDecision;
exports.logRbacConfigChange = logRbacConfigChange;
exports.getPermissionAnalytics = getPermissionAnalytics;
exports.listPermissionTemplates = listPermissionTemplates;
exports.getPermissionTemplate = getPermissionTemplate;
exports.logRoleAssignmentAudit = logRoleAssignmentAudit;
exports.getRoleAssignmentHistory = getRoleAssignmentHistory;
exports.logRoleUsage = logRoleUsage;
exports.createRoleTransitionRequest = createRoleTransitionRequest;
exports.decideRoleTransition = decideRoleTransition;
/**
 * DAuth Authorization Audit — manages authorization decision logs and mismatch tracking.
 * Tables: authorization_audit_log, authorization_decision_log, authorization_mismatch_log,
 *         authorization_permissions, guard_decision_log, rbac_config_audit, permission_analytics,
 *         permission_templates, role_assignment_audit, role_assignment_history, role_usage_audit,
 *         role_transition_requests
 */
const db_1 = require("@dos/db");
const db_2 = require("@dos/db");
// ── authorization_audit_log ──
async function logAuthorizationAudit(tenantId, userId, resource, action, decision, details = {}) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".authorization_audit_log (user_id, resource, action, decision, details)
     VALUES ($1, $2, $3, $4, $5)`, [userId, resource, action, decision, JSON.stringify(details)]);
}
async function getAuthorizationAuditLog(tenantId, filters = {}) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const conditions = [];
    const params = [];
    let idx = 1;
    if (filters.userId) {
        conditions.push(`user_id = $${idx++}`);
        params.push(filters.userId);
    }
    if (filters.resource) {
        conditions.push(`resource = $${idx++}`);
        params.push(filters.resource);
    }
    if (filters.decision) {
        conditions.push(`decision = $${idx++}`);
        params.push(filters.decision);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const limit = Math.min(500, filters.limit || 100);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".authorization_audit_log ${where} ORDER BY created_at DESC LIMIT $${idx}`, [...params, limit]);
    return result.rows;
}
// ── authorization_decision_log ──
async function logDecision(tenantId, userId, permissionCode, granted, reason) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".authorization_decision_log (user_id, permission_code, granted, reason)
     VALUES ($1, $2, $3, $4)`, [userId, permissionCode, granted, reason]);
}
// ── authorization_mismatch_log ──
async function logMismatch(tenantId, userId, expectedPermission, actualResult, context = {}) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".authorization_mismatch_log (user_id, expected_permission, actual_result, context)
     VALUES ($1, $2, $3, $4)`, [userId, expectedPermission, actualResult, JSON.stringify(context)]);
}
async function getMismatches(tenantId, limit = 50) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".authorization_mismatch_log ORDER BY created_at DESC LIMIT $1`, [limit]);
    return result.rows;
}
// ── authorization_permissions ──
async function listAuthorizationPermissions(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".authorization_permissions WHERE is_active = TRUE ORDER BY permission_code`, []);
    return result.rows;
}
// ── guard_decision_log ──
async function logGuardDecision(tenantId, guardName, userId, result, durationMs, details = {}) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".guard_decision_log (guard_name, user_id, result, duration_ms, details)
     VALUES ($1, $2, $3, $4, $5)`, [guardName, userId, result, durationMs, JSON.stringify(details)]);
}
// ── rbac_config_audit ──
async function logRbacConfigChange(tenantId, entityType, entityId, action, changedBy, before, after) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".rbac_config_audit (entity_type, entity_id, action, changed_by, before_state, after_state)
     VALUES ($1, $2, $3, $4, $5, $6)`, [entityType, entityId, action, changedBy, JSON.stringify(before), JSON.stringify(after)]);
}
// ── permission_analytics ──
async function getPermissionAnalytics(tenantId, permissionCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const where = permissionCode ? 'WHERE permission_code = $1' : '';
    const params = permissionCode ? [permissionCode] : [];
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".permission_analytics ${where} ORDER BY usage_count DESC LIMIT 100`, params);
    return result.rows;
}
// ── permission_templates ──
async function listPermissionTemplates(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".permission_templates WHERE is_active = TRUE ORDER BY template_name`, []);
    return result.rows;
}
async function getPermissionTemplate(tenantId, templateId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".permission_templates WHERE template_id = $1`, [templateId]);
    return (0, db_2.getFirstRow)(result);
}
// ── role_assignment_audit ──
async function logRoleAssignmentAudit(tenantId, userId, roleId, action, performedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".role_assignment_audit (user_id, role_id, action, performed_by)
     VALUES ($1, $2, $3, $4)`, [userId, roleId, action, performedBy]);
}
// ── role_assignment_history ──
async function getRoleAssignmentHistory(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".role_assignment_history WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
    return result.rows;
}
// ── role_usage_audit ──
async function logRoleUsage(tenantId, userId, roleId, action) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".role_usage_audit (user_id, role_id, action_performed) VALUES ($1, $2, $3)`, [userId, roleId, action]);
}
// ── role_transition_requests ──
async function createRoleTransitionRequest(tenantId, userId, fromRoleId, toRoleId, reason, requestedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".role_transition_requests (user_id, from_role_id, to_role_id, reason, requested_by, status)
     VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`, [userId, fromRoleId, toRoleId, reason, requestedBy]);
    return (0, db_2.getFirstRow)(result);
}
async function decideRoleTransition(tenantId, requestId, decision, decidedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`UPDATE "${schema}".role_transition_requests SET status = $2, decided_by = $3, decided_at = NOW(), updated_at = NOW()
     WHERE request_id = $1 RETURNING *`, [requestId, decision, decidedBy]);
    return (0, db_2.getFirstRow)(result);
}
//# sourceMappingURL=authorization-audit.service.js.map