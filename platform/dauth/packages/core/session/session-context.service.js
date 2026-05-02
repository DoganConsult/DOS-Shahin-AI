"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionContext = getSessionContext;
exports.recordSessionActivity = recordSessionActivity;
exports.createSessionRecord = createSessionRecord;
exports.getActiveSessionsForUser = getActiveSessionsForUser;
exports.terminateExpiredSessions = terminateExpiredSessions;
const db_1 = require("@dos/db");
function deriveStatus(row) {
    if (row.revoked_at)
        return 'revoked';
    if (row.expires_at && new Date(row.expires_at) < new Date())
        return 'expired';
    return 'active';
}
function mapRow(row) {
    return {
        sessionId: row.session_id,
        userId: row.user_id,
        tenantId: row.tenant_id,
        principalType: 'human',
        ip: row.ip_address ?? '',
        userAgent: row.user_agent ?? '',
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
        lastActivityAt: row.last_active_at ? new Date(row.last_active_at).toISOString() : '',
        status: deriveStatus(row),
    };
}
async function getSessionContext(sessionId) {
    const { rows } = await (0, db_1.safeQuery)(`SELECT session_id, user_id, tenant_id, ip_address, user_agent,
            created_at, last_active_at, expires_at, revoked_at
     FROM platform_dauth.sessions
     WHERE session_id = $1 LIMIT 1`, [sessionId]);
    if (!rows[0])
        return null;
    return mapRow(rows[0]);
}
async function recordSessionActivity(sessionId) {
    try {
        await (0, db_1.safeQuery)(`UPDATE platform_dauth.sessions SET last_active_at = NOW() WHERE session_id = $1`, [sessionId]);
    }
    catch { /* non-critical heartbeat — swallow */ }
}
async function createSessionRecord(sessionId, userId, tenantId, ip, userAgent) {
    await (0, db_1.safeQuery)(`INSERT INTO platform_dauth.sessions (session_id, user_id, tenant_id, jti, ip_address, user_agent, last_active_at, expires_at)
     VALUES ($1, $2, $3, '', $4, $5, NOW(), NOW() + INTERVAL '1 day')
     ON CONFLICT (session_id) DO UPDATE SET last_active_at = NOW()`, [sessionId, userId, tenantId, ip, userAgent]);
}
async function getActiveSessionsForUser(userId) {
    const { rows } = await (0, db_1.safeQuery)(`SELECT session_id, user_id, tenant_id, ip_address, user_agent,
            created_at, last_active_at, expires_at, revoked_at
     FROM platform_dauth.sessions
     WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
     ORDER BY last_active_at DESC`, [userId]);
    return rows.map(mapRow);
}
async function terminateExpiredSessions(timeoutMinutes) {
    const result = await (0, db_1.safeQuery)(`UPDATE platform_dauth.sessions SET revoked_at = NOW()
     WHERE revoked_at IS NULL AND last_active_at < NOW() - INTERVAL '1 minute' * $1`, [timeoutMinutes]);
    return result.rowCount ?? 0;
}
//# sourceMappingURL=session-context.service.js.map