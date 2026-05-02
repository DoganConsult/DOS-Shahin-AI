"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserAuthorityLevel = getUserAuthorityLevel;
exports.hasAuthority = hasAuthority;
exports.getAuthorityChain = getAuthorityChain;
exports.getAuthorityLevels = getAuthorityLevels;
exports.resolveApprovalChain = resolveApprovalChain;
exports.hasAnyAuthority = hasAnyAuthority;
/**
 * DAuth AuthorityResolver — resolves decision authority levels.
 * §7.4: approve_low, approve_high, publish_policy, close_finding, override, etc.
 */
const db_1 = require("@dos/db");
const observability_1 = require("@dos/platform-core/observability");
async function getUserAuthorityLevel(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT al.level_code, al.rank FROM "${schema}".authority_levels al
     JOIN "${schema}".user_role_assignments ura ON ura.authority_level_code = al.level_code
     WHERE ura.user_id = $1 AND ura.is_active = TRUE ORDER BY al.rank DESC LIMIT 1`, [userId]);
    const row = result.rows[0];
    return row ? { levelCode: row.level_code, rank: Number(row.rank) } : null;
}
async function hasAuthority(tenantId, userId, requiredLevel) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const user = await getUserAuthorityLevel(tenantId, userId);
    if (!user)
        return false;
    const required = await (0, db_1.safeQuery)(`SELECT rank FROM "${schema}".authority_levels WHERE level_code = $1 LIMIT 1`, [requiredLevel]);
    const reqRow = required.rows[0];
    return user.rank >= (reqRow?.rank ?? 999);
}
/**
 * Return ALL authority levels the user holds (not just highest),
 * sorted by rank descending.
 */
async function getAuthorityChain(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    observability_1.logger.info('dauth.authority: resolving full authority chain', { tenantId, userId });
    const result = await (0, db_1.safeQuery)(`SELECT DISTINCT al.level_code, al.rank
     FROM "${schema}".authority_levels al
     JOIN "${schema}".user_role_assignments ura ON ura.authority_level_code = al.level_code
     WHERE ura.user_id = $1 AND ura.is_active = TRUE
     ORDER BY al.rank DESC`, [userId]);
    return result.rows.map((r) => ({ levelCode: r.level_code, rank: Number(r.rank) }));
}
/**
 * List all defined authority levels for a tenant (for admin UI / configuration).
 * Returns levels sorted by rank descending (highest authority first).
 */
async function getAuthorityLevels(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT level_code, rank, label
     FROM "${schema}".authority_levels
     ORDER BY rank DESC`, []);
    return result.rows.map((r) => ({ levelCode: r.level_code, rank: Number(r.rank), label: r.label ?? null }));
}
/**
 * Return all users who hold the required authority level or higher.
 * Useful for building approval chains and escalation paths.
 */
async function resolveApprovalChain(tenantId, requiredLevel) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    observability_1.logger.info('dauth.authority: resolving approval chain', { tenantId, requiredLevel });
    const result = await (0, db_1.safeQuery)(`SELECT ura.user_id, al.level_code, al.rank
     FROM "${schema}".user_role_assignments ura
     JOIN "${schema}".authority_levels al ON ura.authority_level_code = al.level_code
     WHERE ura.is_active = TRUE
       AND al.rank >= (SELECT rank FROM "${schema}".authority_levels WHERE level_code = $1 LIMIT 1)
     ORDER BY al.rank DESC`, [requiredLevel]);
    return result.rows.map((r) => ({ userId: r.user_id, levelCode: r.level_code, rank: Number(r.rank) }));
}
/**
 * Check if user holds ANY of the required authority levels.
 * Returns true if at least one match is found.
 */
async function hasAnyAuthority(tenantId, userId, requiredLevels) {
    if (requiredLevels.length === 0)
        return false;
    const schema = (0, db_1.tenantSchema)(tenantId);
    const placeholders = requiredLevels.map((_, i) => `$${i + 2}`).join(', ');
    const result = await (0, db_1.safeQuery)(`SELECT 1 FROM "${schema}".user_role_assignments ura
     WHERE ura.user_id = $1 AND ura.is_active = TRUE
       AND ura.authority_level_code IN (${placeholders})
     LIMIT 1`, [userId, ...requiredLevels]);
    return result.rows.length > 0;
}
//# sourceMappingURL=authority-resolver.js.map