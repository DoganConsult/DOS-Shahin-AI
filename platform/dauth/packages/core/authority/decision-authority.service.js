"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserDecisionAuthorities = getUserDecisionAuthorities;
exports.grantDecisionAuthority = grantDecisionAuthority;
exports.revokeDecisionAuthority = revokeDecisionAuthority;
exports.hasDecisionAuthority = hasDecisionAuthority;
const db_1 = require("@dos/db");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
async function getUserDecisionAuthorities(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT authority_id, user_id, authority_code, module_code, scope_type, scope_id,
            is_active, valid_from, valid_to
     FROM "${schema}".decision_authorities
     WHERE user_id = $1 AND is_active = TRUE
       AND (valid_to IS NULL OR valid_to > NOW())
     ORDER BY authority_code`, [userId]);
    return rows.map((r) => ({
        authorityId: r.authority_id,
        userId: r.user_id,
        authorityCode: r.authority_code,
        moduleCode: r.module_code,
        scopeType: r.scope_type,
        scopeId: r.scope_id,
        isActive: true,
        validFrom: r.valid_from?.toISOString?.() ?? '',
        validTo: r.valid_to?.toISOString?.() ?? null,
    }));
}
async function grantDecisionAuthority(tenantId, userId, authorityCode, opts) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".decision_authorities
       (user_id, authority_code, module_code, scope_type, scope_id, is_active, valid_from, valid_to, created_by)
     VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), $6, $7)
     ON CONFLICT (user_id, authority_code)
       DO UPDATE SET is_active = TRUE, valid_to = EXCLUDED.valid_to, updated_at = NOW()`, [userId, authorityCode, opts.moduleCode ?? null, opts.scopeType ?? null, opts.scopeId ?? null, opts.validTo ?? null, opts.grantedBy]);
    await (0, publish_with_dsoc_1.publish)('dauth.authority.granted', tenantId, { userId, authorityCode, grantedBy: opts.grantedBy });
}
async function revokeDecisionAuthority(tenantId, userId, authorityCode, revokedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`UPDATE "${schema}".decision_authorities
     SET is_active = FALSE, valid_to = NOW(), updated_at = NOW()
     WHERE user_id = $1 AND authority_code = $2 AND is_active = TRUE`, [userId, authorityCode]);
    if ((result.rowCount ?? 0) > 0) {
        await (0, publish_with_dsoc_1.publish)('dauth.authority.revoked', tenantId, { userId, authorityCode, revokedBy });
        return true;
    }
    return false;
}
async function hasDecisionAuthority(tenantId, userId, authorityCode, moduleCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const moduleFilter = moduleCode ? `AND (module_code = $3 OR module_code IS NULL)` : '';
    const params = [userId, authorityCode];
    if (moduleCode)
        params.push(moduleCode);
    const { rows } = await (0, db_1.safeQuery)(`SELECT 1 FROM "${schema}".decision_authorities
     WHERE user_id = $1 AND authority_code = $2 AND is_active = TRUE
       AND (valid_to IS NULL OR valid_to > NOW()) ${moduleFilter}
     LIMIT 1`, params);
    return rows.length > 0;
}
//# sourceMappingURL=decision-authority.service.js.map