"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blacklistToken = blacklistToken;
exports.isTokenBlacklisted = isTokenBlacklisted;
exports.registerActiveJtiForUser = registerActiveJtiForUser;
exports.removeActiveJtiForUser = removeActiveJtiForUser;
exports.revokeAllUserTokens = revokeAllUserTokens;
const db_1 = require("@dos/db");
async function blacklistToken(jti, userIdOrTtl, expiresInSeconds) {
    let userId = null;
    let ttl = 86400;
    if (typeof userIdOrTtl === 'string') {
        userId = userIdOrTtl;
        ttl = expiresInSeconds ?? 86400;
    }
    else if (typeof userIdOrTtl === 'number') {
        ttl = userIdOrTtl;
    }
    const expiresAt = new Date(Date.now() + ttl * 1000);
    await (0, db_1.safeQuery)(`INSERT INTO token_blacklist (jti, user_id, expires_at, is_active)
     VALUES ($1, $2, $3, FALSE)
     ON CONFLICT (jti) DO UPDATE SET is_active = FALSE, expires_at = GREATEST(token_blacklist.expires_at, EXCLUDED.expires_at)`, [jti, userId, expiresAt]);
}
async function isTokenBlacklisted(jti) {
    const result = await (0, db_1.safeQuery)(`SELECT 1 FROM token_blacklist WHERE jti = $1 AND expires_at > NOW() AND COALESCE(is_active, FALSE) = FALSE LIMIT 1`, [jti]);
    return result.rows.length > 0;
}
async function registerActiveJtiForUser(userId, jti, expiresInSeconds) {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    await (0, db_1.safeQuery)(`INSERT INTO token_blacklist (jti, user_id, expires_at, is_active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (jti) DO UPDATE SET is_active = TRUE, expires_at = EXCLUDED.expires_at`, [jti, userId, expiresAt]);
}
async function removeActiveJtiForUser(userId, jti) {
    await (0, db_1.safeQuery)(`UPDATE token_blacklist SET is_active = FALSE WHERE jti = $1 AND user_id = $2`, [jti, userId]);
}
async function revokeAllUserTokens(userId) {
    await (0, db_1.safeQuery)(`UPDATE token_blacklist SET is_active = FALSE WHERE user_id = $1`, [userId]);
}
//# sourceMappingURL=token-blacklist.service.js.map