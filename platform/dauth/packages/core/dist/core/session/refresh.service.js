"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRefreshFamily = createRefreshFamily;
exports.rotateRefreshToken = rotateRefreshToken;
exports.revokeRefreshFamily = revokeRefreshFamily;
exports.revokeAllFamiliesForUser = revokeAllFamiliesForUser;
exports.getActiveFamily = getActiveFamily;
exports.detectReplayAttack = detectReplayAttack;
exports.cleanupExpiredFamilies = cleanupExpiredFamilies;
const uuid_1 = require("uuid");
const db_1 = require("@dos/db");
async function createRefreshFamily(userId, tenantId, jti, expiresAt) {
    const familyId = (0, uuid_1.v4)();
    await (0, db_1.safeQuery)(`INSERT INTO refresh_token_families (family_id, user_id, tenant_id, current_jti, rotation_count, status, expires_at)
     VALUES ($1, $2, $3, $4, 0, 'active', $5)`, [familyId, userId, tenantId, jti, expiresAt]);
    return {
        familyId,
        userId,
        tenantId,
        currentJti: jti,
        rotationCount: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
    };
}
async function rotateRefreshToken(familyId, oldJti, newJti) {
    const result = await (0, db_1.safeQuery)(`UPDATE refresh_token_families
     SET current_jti = $1, rotation_count = rotation_count + 1, updated_at = NOW()
     WHERE family_id = $2 AND current_jti = $3 AND status = 'active'`, [newJti, familyId, oldJti]);
    return (result.rowCount ?? 0) > 0;
}
async function revokeRefreshFamily(familyId) {
    await (0, db_1.safeQuery)(`UPDATE refresh_token_families SET status = 'revoked', updated_at = NOW()
     WHERE family_id = $1`, [familyId]);
}
async function revokeAllFamiliesForUser(userId) {
    const result = await (0, db_1.safeQuery)(`UPDATE refresh_token_families SET status = 'revoked', updated_at = NOW()
     WHERE user_id = $1 AND status = 'active'`, [userId]);
    return result.rowCount ?? 0;
}
async function getActiveFamily(familyId) {
    const { rows } = await (0, db_1.safeQuery)(`SELECT family_id, user_id, tenant_id, current_jti, rotation_count, status, created_at, expires_at
     FROM refresh_token_families
     WHERE family_id = $1 AND status = 'active' AND expires_at > NOW() LIMIT 1`, [familyId]);
    if (!rows[0])
        return null;
    const r = rows[0];
    return {
        familyId: r.family_id,
        userId: r.user_id,
        tenantId: r.tenant_id,
        currentJti: r.current_jti,
        rotationCount: r.rotation_count,
        status: r.status,
        createdAt: r.created_at?.toISOString?.() ?? '',
        expiresAt: r.expires_at?.toISOString?.() ?? '',
    };
}
async function detectReplayAttack(familyId, presentedJti) {
    const family = await getActiveFamily(familyId);
    if (!family)
        return false;
    return family.currentJti !== presentedJti;
}
async function cleanupExpiredFamilies() {
    const result = await (0, db_1.safeQuery)(`DELETE FROM refresh_token_families WHERE expires_at < NOW() OR status = 'revoked'`);
    return result.rowCount ?? 0;
}
//# sourceMappingURL=refresh.service.js.map