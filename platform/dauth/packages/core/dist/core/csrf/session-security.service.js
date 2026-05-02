"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordSessionSecurityEvent = recordSessionSecurityEvent;
exports.getSessionHealthScore = getSessionHealthScore;
exports.detectSessionAnomalies = detectSessionAnomalies;
exports.getSessionSecurityEvents = getSessionSecurityEvents;
const db_1 = require("@dos/db");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
const resilience_1 = require("@dos/platform-core/resilience");
const observability_1 = require("@dos/platform-core/observability");
/** Persist a session security event to DB + publish to event bus. */
async function recordSessionSecurityEvent(opts) {
    await (0, db_1.safeQuery)(`INSERT INTO session_security_events
       (session_id, tenant_id, user_id, event_type, risk_level, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`, [opts.sessionId, opts.tenantId, opts.userId, opts.eventType, opts.riskLevel, JSON.stringify(opts.metadata ?? {})]).catch((err) => {
        observability_1.logger.warn('[Session:Security] Failed to persist event', { error: err.message });
    });
    if (opts.riskLevel === 'high' || opts.riskLevel === 'critical') {
        await (0, publish_with_dsoc_1.publish)('session.anomaly.detected', opts.tenantId, {
            sessionId: opts.sessionId,
            userId: opts.userId,
            eventType: opts.eventType,
            riskLevel: opts.riskLevel,
        }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
}
/** Compute server-side session health score from recent events. */
async function getSessionHealthScore(sessionId) {
    try {
        const { rows } = await (0, db_1.safeQuery)(`SELECT risk_level, COUNT(*)::int AS cnt
       FROM session_security_events
       WHERE session_id = $1 AND occurred_at > NOW() - INTERVAL '5 minutes'
       GROUP BY risk_level`, [sessionId]);
        let weighted = 0;
        let total = 0;
        for (const r of rows) {
            const w = r.risk_level === 'critical' ? 4 : r.risk_level === 'high' ? 3 : r.risk_level === 'medium' ? 2 : 1;
            weighted += w * r.cnt;
            total += r.cnt;
        }
        let state;
        let score;
        if (weighted >= 12) {
            state = 'degraded';
            score = Math.max(0, 20 - (weighted - 12) * 5);
        }
        else if (weighted >= 6) {
            state = 'unstable';
            score = Math.max(20, 60 - (weighted - 6) * 7);
        }
        else {
            state = 'healthy';
            score = Math.max(60, 100 - weighted * 10);
        }
        return { score, state, recentEvents: total };
    }
    catch {
        return { score: 100, state: 'healthy', recentEvents: 0 };
    }
}
/** Detect anomalies by comparing current request against session history. */
async function detectSessionAnomalies(sessionId, tenantId, userId, currentIp, currentUa) {
    const anomalies = [];
    try {
        const { rows } = await (0, db_1.safeQuery)(`SELECT ip_address, user_agent FROM active_sessions WHERE session_id = $1`, [sessionId]);
        if (rows[0]) {
            const session = rows[0];
            if (session.ip_address && session.ip_address !== currentIp) {
                anomalies.push('ip_changed');
                await recordSessionSecurityEvent({
                    sessionId, tenantId, userId,
                    eventType: 'ip_changed',
                    riskLevel: 'high',
                    metadata: { previousIp: session.ip_address, currentIp },
                });
            }
            if (session.user_agent && session.user_agent !== currentUa) {
                anomalies.push('ua_changed');
                await recordSessionSecurityEvent({
                    sessionId, tenantId, userId,
                    eventType: 'ua_changed',
                    riskLevel: 'medium',
                    metadata: { previousUa: session.user_agent, currentUa },
                });
            }
        }
    }
    catch (err) {
        observability_1.logger.debug('[Session:Security] Anomaly detection degraded', { error: err.message });
    }
    return anomalies;
}
/** Get recent session security events for diagnostics. */
async function getSessionSecurityEvents(tenantId, limit = 50) {
    const { rows } = await (0, db_1.safeQuery)(`SELECT event_id, session_id, user_id, event_type, risk_level, occurred_at
     FROM session_security_events
     WHERE tenant_id = $1
     ORDER BY occurred_at DESC LIMIT $2`, [tenantId, limit]);
    return rows.map(r => ({
        eventId: r.event_id,
        sessionId: r.session_id,
        userId: r.user_id,
        eventType: r.event_type,
        riskLevel: r.risk_level,
        occurredAt: r.occurred_at?.toISOString?.() ?? '',
    }));
}
//# sourceMappingURL=session-security.service.js.map