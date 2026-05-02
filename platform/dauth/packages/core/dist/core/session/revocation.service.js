"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeSession = revokeSession;
exports.revokeAllUserSessions = revokeAllUserSessions;
exports.revokeSessionsByTenant = revokeSessionsByTenant;
const db_1 = require("@dos/db");
const token_blacklist_service_1 = require("./token-blacklist.service");
const refresh_service_1 = require("./refresh.service");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
const observability_1 = require("@dos/platform-core/observability");
async function revokeSession(userId, jti, reason, revokedBy) {
    await (0, token_blacklist_service_1.blacklistToken)(jti, userId);
    observability_1.logger.info('[DAuth:Revocation] session revoked', { userId, jti, reason, revokedBy });
    await (0, publish_with_dsoc_1.publish)('dauth.session.revoked', '', {
        userId,
        jti,
        reason,
        revokedBy,
        revokedAt: new Date().toISOString(),
    });
}
async function revokeAllUserSessions(userId, reason, revokedBy) {
    const [, familiesRevoked] = await Promise.all([
        (0, token_blacklist_service_1.revokeAllUserTokens)(userId),
        (0, refresh_service_1.revokeAllFamiliesForUser)(userId),
    ]);
    await (0, publish_with_dsoc_1.publish)('dauth.sessions.bulk_revoked', '', {
        userId,
        reason,
        revokedBy,
        familiesRevoked,
        revokedAt: new Date().toISOString(),
    });
    observability_1.logger.info('[DAuth:Revocation] all user sessions revoked', { userId, reason, revokedBy, familiesRevoked });
    return { tokensRevoked: 0, familiesRevoked };
}
async function revokeSessionsByTenant(tenantId, reason, revokedBy) {
    const { rows } = await (0, db_1.safeQuery)(`SELECT DISTINCT user_id FROM tenant_user_memberships WHERE tenant_id = $1 AND status = 'active'`, [tenantId]);
    let count = 0;
    for (const row of rows) {
        await revokeAllUserSessions(row.user_id, reason, revokedBy);
        count++;
    }
    return count;
}
//# sourceMappingURL=revocation.service.js.map