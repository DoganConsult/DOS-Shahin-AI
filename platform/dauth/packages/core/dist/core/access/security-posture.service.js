"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSecurityAttestations = listSecurityAttestations;
exports.createSecurityAttestation = createSecurityAttestation;
exports.getLatestSecurityPosture = getLatestSecurityPosture;
exports.createSecurityPostureSnapshot = createSecurityPostureSnapshot;
exports.listAuthPolicies = listAuthPolicies;
exports.getAuthPolicy = getAuthPolicy;
exports.upsertAuthPolicy = upsertAuthPolicy;
exports.listConditionalAccessGrants = listConditionalAccessGrants;
exports.createConditionalGrant = createConditionalGrant;
exports.getEffectiveUserModules = getEffectiveUserModules;
exports.getEffectiveUserPermissions = getEffectiveUserPermissions;
exports.listDefenseLines = listDefenseLines;
exports.listFunctionAuthorities = listFunctionAuthorities;
exports.listAuthorityLevelCatalog = listAuthorityLevelCatalog;
exports.getAuthorityMatrix = getAuthorityMatrix;
exports.listDelegatedAuthorities = listDelegatedAuthorities;
exports.getDelegationChain = getDelegationChain;
exports.getSodResolutionHistory = getSodResolutionHistory;
exports.logSodResolution = logSodResolution;
/**
 * DAuth Security Posture — manages security compliance, posture snapshots, and policies.
 * Tables: security_compliance_attestations, security_events, security_posture_snapshots,
 *         authentication_policies, conditional_access_grants, effective_user_modules,
 *         effective_user_permissions, defense_lines, function_authorities,
 *         authority_level_catalog, authority_matrix, delegated_authorities,
 *         delegation_chains, sod_conflict_resolution_history
 */
const db_1 = require("@dos/db");
const db_2 = require("@dos/db");
// ── security_compliance_attestations ──
async function listSecurityAttestations(tenantId, filters = {}) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const conditions = [];
    const params = [];
    let idx = 1;
    if (filters.status) {
        conditions.push(`status = $${idx++}`);
        params.push(filters.status);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const limit = Math.min(200, filters.limit || 50);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".security_compliance_attestations ${where} ORDER BY created_at DESC LIMIT $${idx}`, [...params, limit]);
    return result.rows;
}
async function createSecurityAttestation(tenantId, data) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".security_compliance_attestations (control_id, attester_id, status, evidence_url, notes)
     VALUES ($1, $2, 'pending', $3, $4) RETURNING *`, [data.control_id, data.attester_id, data.evidence_url, data.notes]);
    return (0, db_2.getFirstRow)(result);
}
// ── security_posture_snapshots ──
async function getLatestSecurityPosture(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".security_posture_snapshots ORDER BY snapshot_date DESC LIMIT 1`, []);
    return (0, db_2.getFirstRow)(result);
}
async function createSecurityPostureSnapshot(tenantId, data) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".security_posture_snapshots (snapshot_date, overall_score, dimension_scores, metadata)
     VALUES (CURRENT_DATE, $1, $2, $3) RETURNING *`, [data.overall_score, JSON.stringify(data.dimension_scores || {}), JSON.stringify(data.metadata || {})]);
    return (0, db_2.getFirstRow)(result);
}
// ── authentication_policies ──
async function listAuthPolicies(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".authentication_policies WHERE is_active = TRUE ORDER BY priority`, []);
    return result.rows;
}
async function getAuthPolicy(tenantId, policyId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".authentication_policies WHERE policy_id = $1`, [policyId]);
    return (0, db_2.getFirstRow)(result);
}
async function upsertAuthPolicy(tenantId, data) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".authentication_policies (policy_code, policy_name, conditions, actions, priority, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     ON CONFLICT (policy_code) DO UPDATE SET policy_name = $2, conditions = $3, actions = $4, priority = $5, updated_at = NOW()
     RETURNING *`, [data.policy_code, data.policy_name, JSON.stringify(data.conditions || {}), JSON.stringify(data.actions || {}), data.priority || 0]);
    return (0, db_2.getFirstRow)(result);
}
// ── conditional_access_grants ──
async function listConditionalAccessGrants(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const where = userId ? 'WHERE user_id = $1 AND is_active = TRUE' : 'WHERE is_active = TRUE';
    const params = userId ? [userId] : [];
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".conditional_access_grants ${where} ORDER BY created_at DESC`, params);
    return result.rows;
}
async function createConditionalGrant(tenantId, data) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".conditional_access_grants (user_id, condition_type, condition_value, grant_permissions, expires_at, granted_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [data.user_id, data.condition_type, JSON.stringify(data.condition_value || {}),
        JSON.stringify(data.grant_permissions || []), data.expires_at, data.granted_by]);
    return (0, db_2.getFirstRow)(result);
}
// ── effective_user_modules ──
async function getEffectiveUserModules(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".effective_user_modules WHERE user_id = $1`, [userId]);
    return result.rows;
}
// ── effective_user_permissions ──
async function getEffectiveUserPermissions(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".effective_user_permissions WHERE user_id = $1`, [userId]);
    return result.rows;
}
// ── defense_lines ──
async function listDefenseLines(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".defense_lines WHERE is_active = TRUE ORDER BY line_number`, []);
    return result.rows;
}
// ── function_authorities ──
async function listFunctionAuthorities(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".function_authorities WHERE is_active = TRUE ORDER BY authority_name`, []);
    return result.rows;
}
// ── authority_level_catalog ──
async function listAuthorityLevelCatalog(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".authority_level_catalog ORDER BY level_rank`, []);
    return result.rows;
}
// ── authority_matrix ──
async function getAuthorityMatrix(tenantId, roleId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const where = roleId ? 'WHERE role_id = $1' : '';
    const params = roleId ? [roleId] : [];
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".authority_matrix ${where} ORDER BY authority_area`, params);
    return result.rows;
}
// ── delegated_authorities ──
async function listDelegatedAuthorities(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const where = userId ? 'WHERE delegated_to = $1 AND is_active = TRUE' : 'WHERE is_active = TRUE';
    const params = userId ? [userId] : [];
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".delegated_authorities ${where} ORDER BY created_at DESC`, params);
    return result.rows;
}
// ── delegation_chains ──
async function getDelegationChain(tenantId, delegationId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".delegation_chains WHERE root_delegation_id = $1 ORDER BY chain_depth`, [delegationId]);
    return result.rows;
}
// ── sod_conflict_resolution_history ──
async function getSodResolutionHistory(tenantId, conflictId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".sod_conflict_resolution_history WHERE conflict_id = $1 ORDER BY created_at`, [conflictId]);
    return result.rows;
}
async function logSodResolution(tenantId, conflictId, resolution, resolvedBy, notes) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".sod_conflict_resolution_history (conflict_id, resolution, resolved_by, notes)
     VALUES ($1, $2, $3, $4)`, [conflictId, resolution, resolvedBy, notes]);
}
//# sourceMappingURL=security-posture.service.js.map