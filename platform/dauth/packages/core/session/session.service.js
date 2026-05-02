"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.refreshSession = refreshSession;
exports.destroySession = destroySession;
exports.isSessionValid = isSessionValid;
const uuid_1 = require("uuid");
const db_1 = require("@dos/db");
const token_service_1 = require("../identity/token.service");
const token_blacklist_service_1 = require("./token-blacklist.service");
const observability_1 = require("@dos/platform-core/observability");
const resilience_1 = require("@dos/platform-core/resilience");
const MAX_CONCURRENT_SESSIONS = 5;
async function persistSession(params) {
    // Enforce concurrent session limit
    const countResult = await (0, db_1.safeQuery)(`SELECT COUNT(*) FROM sessions WHERE user_id = $1 AND revoked_at IS NULL`, [params.userId]);
    const activeCount = parseInt(countResult.rows[0]?.count ?? '0', 10);
    if (activeCount >= MAX_CONCURRENT_SESSIONS) {
        await (0, db_1.safeQuery)(`UPDATE sessions SET revoked_at = NOW() WHERE session_id = (
        SELECT session_id FROM sessions WHERE user_id = $1 AND revoked_at IS NULL ORDER BY created_at ASC LIMIT 1
      )`, [params.userId]);
    }
    await (0, db_1.safeQuery)(`INSERT INTO sessions (session_id, user_id, tenant_id, jti, refresh_jti, ip_address, user_agent, created_at, last_active_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8)
     ON CONFLICT DO NOTHING`, [
        params.sessionId,
        params.userId,
        params.tenantId,
        params.jti,
        params.refreshJti ?? null,
        params.ipAddress ?? null,
        params.userAgent ?? null,
        params.expiresAt,
    ]);
}
async function revokeSessionByRefreshJti(refreshJti) {
    await (0, db_1.safeQuery)(`UPDATE sessions SET revoked_at = NOW() WHERE refresh_jti = $1 AND revoked_at IS NULL`, [refreshJti]);
}
async function revokeSessionByJti(jti) {
    await (0, db_1.safeQuery)(`UPDATE sessions SET revoked_at = NOW() WHERE jti = $1 AND revoked_at IS NULL`, [jti]);
}
async function revokeAllSessionsByUser(userId) {
    await (0, db_1.safeQuery)(`UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
}
async function createSession(input) {
    const payload = {
        userId: input.userId,
        email: input.email,
        tenantId: input.tenantId,
        role: input.role,
        permissions: input.permissions,
        roles: input.roles,
        language: input.language,
        departmentId: input.departmentId,
        name: input.name,
        jti: (0, uuid_1.v4)(),
    };
    const rememberMe = input.rememberMe !== false;
    const accessToken = (0, token_service_1.generateAccessToken)(payload);
    const refreshToken = (0, token_service_1.generateRefreshToken)(input.userId, input.tenantId, rememberMe);
    const refreshDecoded = (0, token_service_1.decodeTokenUnsafe)(refreshToken);
    const expiresSeconds = rememberMe ? 7 * 24 * 60 * 60 : 3600;
    await persistSession({
        sessionId: (0, uuid_1.v4)(),
        userId: input.userId,
        tenantId: input.tenantId,
        jti: payload.jti,
        refreshJti: refreshDecoded?.jti ?? null,
        ipAddress: input.meta?.ipAddress,
        userAgent: input.meta?.userAgent,
        expiresAt: new Date(Date.now() + expiresSeconds * 1000),
    }).catch(err => observability_1.logger.error('[DAuth] session persist failed', { error: err.message }));
    return {
        accessToken,
        refreshToken,
        expiresIn: (0, token_service_1.getAccessTokenExpirySeconds)(),
    };
}
async function refreshSession(refreshTokenValue) {
    const decoded = (0, token_service_1.verifyRefreshToken)(refreshTokenValue);
    if (!decoded) {
        observability_1.logger.warn('[DAuth] Token refresh failed', { reason: 'invalid or expired refresh token' });
        return null;
    }
    if (decoded.jti && await (0, token_blacklist_service_1.isTokenBlacklisted)(decoded.jti)) {
        observability_1.logger.warn('[DAuth] Token refresh failed', { reason: 'refresh token blacklisted', userId: decoded.userId });
        return null;
    }
    const userResult = await (0, db_1.query)(`SELECT user_id, email, role, tenant_id, status FROM users WHERE user_id = $1 LIMIT 1`, [decoded.userId]);
    if (!userResult.rows.length) {
        observability_1.logger.warn('[DAuth] Token refresh failed', { reason: 'user not found', userId: decoded.userId });
        return null;
    }
    const user = userResult.rows[0];
    if (user.status !== 'active') {
        observability_1.logger.warn('[DAuth] Token refresh failed', { reason: `user status is ${user.status}`, userId: decoded.userId });
        return null;
    }
    if (decoded.jti) {
        await (0, token_blacklist_service_1.blacklistToken)(decoded.jti, decoded.userId, 60).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
        void revokeSessionByRefreshJti(decoded.jti);
    }
    const tokens = await createSession({
        userId: user.user_id,
        email: user.email,
        tenantId: user.tenant_id,
        role: user.role,
    });
    observability_1.logger.info('[DAuth] Token refreshed', { userId: decoded.userId, tenantId: decoded.tenantId, ip: decoded.ip });
    return tokens;
}
async function destroySession(userId, jti) {
    if (jti) {
        await (0, token_blacklist_service_1.blacklistToken)(jti, userId).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
        void revokeSessionByJti(jti);
    }
    await (0, token_blacklist_service_1.revokeAllUserTokens)(userId).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    void revokeAllSessionsByUser(userId);
}
async function isSessionValid(jti) {
    return !(await (0, token_blacklist_service_1.isTokenBlacklisted)(jti));
}
//# sourceMappingURL=session.service.js.map