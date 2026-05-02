"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActorRoles = getActorRoles;
exports.assignRoleToActor = assignRoleToActor;
exports.revokeRoleFromActor = revokeRoleFromActor;
exports.getActorAccessAssignments = getActorAccessAssignments;
exports.assignAccessToActor = assignAccessToActor;
exports.logActorAudit = logActorAudit;
exports.getActorAuditLog = getActorAuditLog;
/**
 * DAuth Actor Assignments — manages actor-role and actor-access bindings.
 * Tables: actor_role_assignments, actor_access_assignments, actor_audit_log
 */
const db_1 = require("@dos/db");
const db_2 = require("@dos/db");
// ── actor_role_assignments ──
async function getActorRoles(tenantId, actorId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".actor_role_assignments WHERE actor_id = $1 AND is_active = TRUE`, [actorId]);
    return result.rows;
}
async function assignRoleToActor(tenantId, actorId, roleId, assignedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".actor_role_assignments (actor_id, role_id, assigned_by, is_active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (actor_id, role_id) DO UPDATE SET is_active = TRUE, assigned_by = $3, updated_at = NOW()
     RETURNING *`, [actorId, roleId, assignedBy]);
    return (0, db_2.getFirstRow)(result);
}
async function revokeRoleFromActor(tenantId, actorId, roleId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`UPDATE "${schema}".actor_role_assignments SET is_active = FALSE, updated_at = NOW()
     WHERE actor_id = $1 AND role_id = $2 AND is_active = TRUE RETURNING assignment_id`, [actorId, roleId]);
    return (result.rows?.length ?? 0) > 0;
}
// ── actor_access_assignments ──
async function getActorAccessAssignments(tenantId, actorId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".actor_access_assignments WHERE actor_id = $1 AND is_active = TRUE`, [actorId]);
    return result.rows;
}
async function assignAccessToActor(tenantId, actorId, profileId, assignedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".actor_access_assignments (actor_id, access_profile_id, assigned_by, is_active)
     VALUES ($1, $2, $3, TRUE) RETURNING *`, [actorId, profileId, assignedBy]);
    return (0, db_2.getFirstRow)(result);
}
// ── actor_audit_log ──
async function logActorAudit(tenantId, actorId, action, details = {}) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".actor_audit_log (actor_id, action, details) VALUES ($1, $2, $3)`, [actorId, action, JSON.stringify(details)]);
}
async function getActorAuditLog(tenantId, actorId, limit = 50) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".actor_audit_log WHERE actor_id = $1 ORDER BY created_at DESC LIMIT $2`, [actorId, limit]);
    return result.rows;
}
//# sourceMappingURL=actor-assignments.js.map